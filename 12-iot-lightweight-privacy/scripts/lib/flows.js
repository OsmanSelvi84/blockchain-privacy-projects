const vectors = require("../../demo/test-vectors.json");

function hexOf(ethers, value) {
  return typeof value === "string" ? value : ethers.hexlify(value);
}

function jsonReplacer(_key, value) {
  return typeof value === "bigint" ? value.toString() : value;
}

function buildCaseInput(ethers, vector) {
  const plaintextReading = JSON.stringify(vector.reading);
  const encryptedParticipation = ethers.toUtf8Bytes(`encrypted:${ethers.id(plaintextReading)}`);
  const participationHash = ethers.keccak256(encryptedParticipation);
  const publicKey = `pk-${vector.name}-${ethers.id(vector.deviceSalt).slice(2, 10)}`;
  const resultBytes = ethers.toUtf8Bytes(`aggregate-result:${vector.name}:${participationHash}`);
  const resultHash = ethers.keccak256(resultBytes);

  return {
    ...vector,
    plaintextReading,
    encryptedParticipation,
    participationHash,
    publicKey,
    resultBytes,
    resultHash
  };
}

async function deployReference(ethers, consumer, kgn) {
  const Reference = await ethers.getContractFactory("IoTDataAggregation", consumer);
  const reference = await Reference.deploy(kgn.address);
  await reference.waitForDeployment();
  return reference;
}

async function deployOriginal(ethers) {
  const Original = await ethers.getContractFactory("OriginalIoTPrivacyAggregation");
  const original = await Original.deploy();
  await original.waitForDeployment();
  return original;
}

async function runReferenceCase(ethers, vector, deployedReference) {
  const accounts = await ethers.getSigners();
  const [, consumer, producer, aggregator, kgn] = accounts;
  const input = buildCaseInput(ethers, vector);
  const reference = deployedReference || await deployReference(ethers, consumer, kgn);

  await reference
    .connect(consumer)
    .updateToS(
      input.requestedData,
      input.requestedPurpose,
      input.requestedOperation,
      input.requestedDisclosure,
      input.requestedRetention
    );
  await reference.connect(producer).updatePPolicy("matched", input.needExplicitConsent);
  await reference
    .connect(consumer)
    .createGroup(`${input.name}:request`, input.aggregationFunction, 3600, aggregator.address);

  const groupId = await reference.groupCount();
  await reference.connect(kgn).updatePK(groupId, input.publicKey);
  await reference.connect(consumer).addParticipants(groupId);

  const signature = await producer.signMessage(ethers.getBytes(input.participationHash));
  await reference
    .connect(producer)
    .addParticipation(
      groupId,
      input.consentResponse,
      input.encryptedParticipation,
      input.participationHash,
      signature
    );
  await reference.connect(aggregator).updateRequestResult(groupId, input.resultBytes);

  const policy = await reference.consumerHasPolicy(consumer.address, producer.address);
  const participation = await reference.getParticipation(groupId, producer.address);
  const groupStatus = await reference.getGroupStatus(groupId);
  const groupPublicKey = await reference.getGroupPK(groupId);
  const resultBytes = await reference.connect(aggregator).geRequestResult(groupId);
  const splitSignature = ethers.Signature.from(signature);

  const storedParticipationCiphertext = hexOf(ethers, participation[0]);
  const storedParticipationHash = participation[1];

  return {
    implementation: "reference",
    source: "https://github.com/Floukil/E2EAggregation",
    inputName: input.name,
    groupId: groupId.toString(),
    groupStatus: Number(groupStatus),
    publicKey: groupPublicKey,
    policyMatched: Boolean(policy.isMatched ?? policy[6]),
    producerAccepted: await reference.producerHasParticipate(groupId, producer.address),
    inputHash: input.participationHash,
    hashValid: await reference.verifyHashVal(storedParticipationCiphertext, storedParticipationHash),
    storedParticipationHash,
    storedParticipationCiphertext,
    signatureValid: await reference.verifySignature(
      input.participationHash,
      splitSignature.v,
      splitSignature.r,
      splitSignature.s,
      producer.address
    ),
    resultHash: ethers.keccak256(resultBytes),
    rawPlaintextStored: false
  };
}

async function runOriginalCase(ethers, vector, deployedOriginal) {
  const accounts = await ethers.getSigners();
  const [, consumer, producer, aggregator] = accounts;
  const input = buildCaseInput(ethers, vector);
  const original = deployedOriginal || await deployOriginal(ethers);

  const requestId = await original.computeRequestId(
    consumer.address,
    input.name,
    ethers.id(`${input.name}:request-salt`)
  );
  const termsHash = await original.computeTermsHash(
    input.requestedData,
    input.requestedPurpose,
    input.requestedOperation,
    input.requestedDisclosure,
    input.requestedRetention
  );
  const policyHash = await original.computePolicyHash(termsHash, input.needExplicitConsent);
  const aggregationHash = ethers.id(input.aggregationFunction);
  const encryptionKeyCommitment = ethers.id(input.publicKey);
  const deviceId = await original.computeDeviceId(producer.address, ethers.id(input.deviceSalt));
  const payloadHash = await original.computePayloadHash(input.encryptedParticipation);
  const deviceSecretHash = ethers.id(input.deviceSecret);
  const commitment = await original.computeCommitment(
    deviceSecretHash,
    payloadHash,
    ethers.id(input.commitmentSalt)
  );
  const nullifierHash = await original.computeNullifier(deviceSecretHash, requestId);

  await original
    .connect(consumer)
    .createRequest(requestId, termsHash, aggregationHash, 3600, aggregator.address, encryptionKeyCommitment);
  await original.connect(producer).registerDevice(deviceId, producer.address, policyHash);
  await original.connect(producer).setPolicyMatch(requestId, deviceId, true);
  await original.connect(consumer).openRequest(requestId);

  const messageHash = await original.readingMessageHash(
    requestId,
    deviceId,
    payloadHash,
    commitment,
    nullifierHash
  );
  const signature = await producer.signMessage(ethers.getBytes(messageHash));

  await original
    .connect(aggregator)
    .submitPrivateReading(requestId, deviceId, payloadHash, commitment, nullifierHash, signature);
  await original.connect(aggregator).finalizeRequest(requestId, input.resultHash);

  const request = await original.getRequest(requestId);
  const reading = await original.getReading(requestId, deviceId);

  return {
    implementation: "original",
    inputName: input.name,
    requestId,
    requestStatus: Number(request.status),
    publicKeyCommitment: request.encryptionKeyCommitment,
    policyMatched: await original.policyMatched(requestId, deviceId),
    readingAccepted: reading.accepted,
    inputHash: payloadHash,
    hashValid: await original.verifyPayloadHash(input.encryptedParticipation, payloadHash),
    storedPayloadHash: reading.payloadHash,
    storedCommitment: reading.commitment,
    nullifierHash: reading.nullifierHash,
    nullifierUsed: await original.usedNullifiers(requestId, nullifierHash),
    signatureValid: reading.accepted,
    resultHash: request.resultHash,
    rawPlaintextStored: false
  };
}

function compareOutputs(referenceOutput, originalOutput) {
  const comparison = {
    policyMatchedEqual: referenceOutput.policyMatched === originalOutput.policyMatched,
    inputHashEqual: referenceOutput.inputHash === originalOutput.inputHash,
    hashValidationEqual: referenceOutput.hashValid === originalOutput.hashValid,
    acceptedBehaviorEqual: referenceOutput.producerAccepted === originalOutput.readingAccepted,
    resultHashEqual: referenceOutput.resultHash === originalOutput.resultHash,
    rawPlaintextStoredEqual: referenceOutput.rawPlaintextStored === originalOutput.rawPlaintextStored,
    originalAddsCommitmentAndNullifier:
      Boolean(originalOutput.storedCommitment) &&
      Boolean(originalOutput.nullifierHash) &&
      originalOutput.nullifierUsed === true
  };

  comparison.functionalEquivalent =
    comparison.policyMatchedEqual &&
    comparison.inputHashEqual &&
    comparison.hashValidationEqual &&
    comparison.acceptedBehaviorEqual &&
    comparison.resultHashEqual &&
    comparison.rawPlaintextStoredEqual &&
    comparison.originalAddsCommitmentAndNullifier;

  return comparison;
}

async function runBothCase(ethers, vector) {
  const reference = await runReferenceCase(ethers, vector);
  const original = await runOriginalCase(ethers, vector);
  const comparison = compareOutputs(reference, original);

  return {
    inputName: vector.name,
    reference,
    original,
    comparison
  };
}

async function runAllReferenceCases(ethers) {
  const outputs = [];
  for (const vector of vectors) {
    outputs.push(await runReferenceCase(ethers, vector));
  }
  return outputs;
}

async function runAllOriginalCases(ethers) {
  const outputs = [];
  for (const vector of vectors) {
    outputs.push(await runOriginalCase(ethers, vector));
  }
  return outputs;
}

async function runAllComparisons(ethers) {
  const outputs = [];
  for (const vector of vectors) {
    outputs.push(await runBothCase(ethers, vector));
  }
  return outputs;
}

module.exports = {
  vectors,
  buildCaseInput,
  jsonReplacer,
  deployReference,
  deployOriginal,
  runReferenceCase,
  runOriginalCase,
  runBothCase,
  runAllReferenceCases,
  runAllOriginalCases,
  runAllComparisons,
  compareOutputs
};
