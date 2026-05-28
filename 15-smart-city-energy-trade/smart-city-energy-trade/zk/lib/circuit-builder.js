/**
 * Builds settlement-check.zok for w producers and n consumers.
 * Same conservation / fairness constraints as the course reference circuit.
 */

function buildHelperLibrary(producerCount, consumerCount) {
  return `
import "hashes/sha256/512bitPacked" as sha256packed

def aggregateProducerDelta(field[${producerCount}] readings) -> field {
  field total = 0
  for field i in 0..${producerCount} do
    total = total + readings[i]
  endfor
  return total
}

def aggregateConsumerDelta(field[${consumerCount}] readings) -> field {
  field total = 0
  for field i in 0..${consumerCount} do
    total = total + readings[i]
  endfor
  return total
}

def absoluteImbalance(field[${producerCount}] producers, field[${consumerCount}] consumers) -> field {
  field p = aggregateProducerDelta(producers)
  field c = aggregateConsumerDelta(consumers)
  return if p > c then p - c else c - p fi
}

def producerFairnessViolations(field[${producerCount}] before, field[${producerCount}] after) -> field {
  field errors = 0
  for field i in 0..${producerCount - 1} do
    errors = errors + if after[i] > before[i] then 1 else 0 fi
  endfor
  return errors
}

def consumerFairnessViolations(field[${consumerCount}] before, field[${consumerCount}] after) -> field {
  field errors = 0
  for field i in 0..${consumerCount} do
    errors = errors + if after[i] > before[i] then 1 else 0 fi
  endfor
  return errors
}

def producersAboveEpsilon(field[${producerCount}] values, field epsilon) -> field {
  field errors = 0
  for field i in 0..${producerCount} do
    errors = errors + if values[i] > epsilon then 1 else 0 fi
  endfor
  return errors
}

def consumersAboveEpsilon(field[${consumerCount}] values, field epsilon) -> field {
  field errors = 0
  for field i in 0..${consumerCount} do
    errors = errors + if values[i] > epsilon then 1 else 0 fi
  endfor
  return errors
}

def sumProducerSide(field[${producerCount}] values) -> field {
  field s = 0
  for field i in 0..${producerCount} do
    s = s + values[i]
  endfor
  return s
}

def sumConsumerSide(field[${consumerCount}] values) -> field {
  field s = 0
  for field i in 0..${consumerCount} do
    s = s + values[i]
  endfor
  return s
}
`;
}

function buildMainCircuit(producerCount, consumerCount) {
  const epsilon = producerCount + consumerCount - 1;
  const returnArity = 2 * (producerCount + consumerCount);
  const returnTypes = Array(returnArity).fill("field[2]").join(",");

  let hashAssignments = "";
  let returnList = "";

  for (let i = 0; i < producerCount; i++) {
    hashAssignments += `  field[2] p${i}Before = if producersBefore[${i}] == 0 then [0,0] else sha256packed([0,0,0,producersBefore[${i}]]) fi\n`;
    hashAssignments += `  field[2] p${i}After = if producersAfter[${i}] == 0 then [0,0] else sha256packed([0,0,0,producersAfter[${i}]]) fi\n`;
    returnList += `p${i}Before,`;
  }
  for (let i = 0; i < consumerCount; i++) {
    hashAssignments += `  field[2] c${i}Before = if consumersBefore[${i}] == 0 then [0,0] else sha256packed([0,0,0,consumersBefore[${i}]]) fi\n`;
    hashAssignments += `  field[2] c${i}After = if consumersAfter[${i}] == 0 then [0,0] else sha256packed([0,0,0,consumersAfter[${i}]]) fi\n`;
    returnList += `c${i}Before,`;
  }
  for (let i = 0; i < producerCount; i++) {
    returnList += `p${i}After,`;
  }
  for (let i = 0; i < consumerCount; i++) {
    returnList += `c${i}After,`;
  }
  returnList = returnList.replace(/,$/, "");

  const helpers = buildHelperLibrary(producerCount, consumerCount);

  return `${helpers}

def main(
  private field[${producerCount}] producersBefore,
  private field[${consumerCount}] consumersBefore,
  private field[${producerCount}] producersAfter,
  private field[${consumerCount}] consumersAfter
) -> (${returnTypes}) {
  absoluteImbalance(producersBefore, consumersBefore) == absoluteImbalance(producersAfter, consumersAfter)
  0 == producerFairnessViolations(producersBefore, producersAfter)
  0 == consumerFairnessViolations(consumersBefore, consumersAfter)

  field postProducerSum = sumProducerSide(producersAfter)
  field postConsumerSum = sumConsumerSide(consumersAfter)

  0 == if postProducerSum <= postConsumerSum
    then producersAboveEpsilon(producersAfter, ${epsilon})
    else consumersAboveEpsilon(consumersAfter, ${epsilon})
  fi

${hashAssignments}  return ${returnList}
}
`;
}

module.exports = { buildMainCircuit };
