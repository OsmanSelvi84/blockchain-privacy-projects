pragma solidity ^0.6.0;
// SPDX-License-Identifier: MIT

/*
 * Runnable reference contract for comparison.
 *
 * Source repository: https://github.com/Floukil/E2EAggregation
 * Original file: IoTDataAgg
 * Original title: IoTDataAggregation
 * Original author noted in source: Faiza LOUKIL
 *
 * This reference file is included only so the instructor can execute the
 * reference implementation inside the same Hardhat test environment.
 * It is not part of the original student implementation.
 */

contract owned {

    address public owner;

    /* Initialise contract creator as owner */
    constructor () public {
        owner = msg.sender;
    }

     /* Transfer ownership of this contract to someone else */
    function transferOwnership(address _newowner) public {
        require( owner == msg.sender);
        owner = _newowner;
    }
}

/*
*   @title IoTDataAggregation
*
*   Author: Faiza LOUKIL
*/

contract IoTDataAggregation is owned {

    address public KGN;

    constructor (address _KGN) public {
        KGN= _KGN;
    }

    /* Function to dictate that only the designated owner can call a function */
    modifier onlyOwner(address _account)
    {
        require( owner == _account);
        _;
    }

    modifier onlyKGN(address _account)
    {
        require( KGN == _account);
        _;
    }

    modifier onlyAggregator(uint _groupID, address _account)
    {
        require( groups[_groupID].aggregator == _account );
        _;
    }

    modifier onlyProducer(address _account)
    {
        require(isProducer[_account]);
        _;
    }

    /* ToS */
    struct ToS {
        string requestedData;
        string requestedPurpose;
        string requestedOperation;
        string requestedDisclosure;
        uint256 requestedRetention;
    }

    /* PPolicy */
    struct  PPolicy {
        string effectiveData;
        bool effectiveNeedExplicitConsent;
        string effectiveDataPurpose;
        string effectiveDataOperation;
        string effectiveDataDisclosure;
        uint256 effectiveDataRetention;
        bool isMatched;
    }
    /* PPolicy = (Consumer, Producer) */
    mapping (address => mapping (address => PPolicy)) public consumerHasPolicy;

    /* Consumer */
    mapping (address => ToS) public consumerHasToS;

    event ToSUpdated(string requestedData, string requestedPurpose, string requestedOperation, string requestedDisclosure, uint256 requestedRetention);
    function updateToS (string memory _requestedData, string memory _requestedPurpose, string memory _requestedOperation, string memory _requestedDisclosure, uint256 _requestedRetention)
    public onlyOwner(msg.sender)   {

        address _consumer = msg.sender;

        consumerHasToS[_consumer].requestedData         = _requestedData;
        consumerHasToS[_consumer].requestedPurpose      = _requestedPurpose;
        consumerHasToS[_consumer].requestedOperation    = _requestedOperation;
        consumerHasToS[_consumer].requestedDisclosure   = _requestedDisclosure;
        consumerHasToS[_consumer].requestedRetention    = _requestedRetention;

        emit ToSUpdated(_requestedData, _requestedPurpose, _requestedOperation, _requestedDisclosure, _requestedRetention);
    }

    event privacyPolicyUpdated(string condition, bool isMatched);
    function updatePPolicy(string memory condition, bool _needExplicitConsent) public {

        _producer = msg.sender;
        address _consumer = owner;
        bool _isMatched= false;

        if (!isProducer[msg.sender]){
            producers.push(msg.sender);
            isProducer[msg.sender] = true;
        }

        if (keccak256(bytes(condition)) == keccak256("matched") ) {
            consumerHasPolicy[_consumer][_producer].effectiveData                = consumerHasToS[_consumer].requestedData;
            consumerHasPolicy[_consumer][_producer].effectiveNeedExplicitConsent = _needExplicitConsent;//needExplicitConsent[_producer];
            consumerHasPolicy[_consumer][_producer].effectiveDataPurpose         = consumerHasToS[_consumer].requestedPurpose;
            consumerHasPolicy[_consumer][_producer].effectiveDataOperation       = consumerHasToS[_consumer].requestedOperation;
            consumerHasPolicy[_consumer][_producer].effectiveDataDisclosure      = consumerHasToS[_consumer].requestedDisclosure;
            consumerHasPolicy[_consumer][_producer].effectiveDataRetention       = consumerHasToS[_consumer].requestedRetention;

            _isMatched   = true;
        }

        consumerHasPolicy[_consumer][_producer].isMatched = _isMatched;
        emit privacyPolicyUpdated(condition, _isMatched);
    }


   /* Producer */
    struct Producer{
        bool hasParticipate;
        bytes participation;
        bytes32 participationHash;
        bytes participationSignature;
    }
    
    address _producer;// store the msg.sender of updatePPolicy
    mapping (address => bool) public isProducer;
    mapping (address => bool) needExplicitConsent;
    address[] producers;

   /* Request */
    struct Request{
        string requestDescription;
        string aggregationFunction;
        bytes requestResult;
    }
    mapping (uint => Request ) public requestGroup;


    /* GROUP */
    enum GroupStatus{SETUP, IN_PROGRESS, FINISHED}
    struct Group {
        address creator;
        GroupStatus status;
        uint expirationTime;
        Request request;
        address[] producers;
        mapping (address => Producer) producerDetails;
        string PK;
        address aggregator;
    }

    mapping (uint => Group) groups;
    uint public groupCount;
    mapping (uint => mapping (address => bool) ) isParticipant;

  /*
   * Modifier that checks for a valid group ID.
   */
  modifier validGroup(uint _groupID) {
    require(_groupID > 0 && _groupID <= groupCount);
    _;
  }

  function verifySignature(bytes32 hash, uint8 v, bytes32 r, bytes32 s , address _account) public pure returns(bool) {
    bytes memory prefix = "\x19Ethereum Signed Message:\n32";
    bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, hash));
    return ecrecover(prefixedHash, v, r, s) == _account ;
  }

  function verifyHashVal(bytes memory _participation, bytes32 _participationHash) pure public returns (bool){
    return keccak256(_participation) == _participationHash ;
  }
  
  /*
   * Gets the status of a group.
   */
  function getGroupStatus(uint _groupID) public view validGroup(_groupID) returns (GroupStatus) {
    return groups[_groupID].status;
  }

  /*
   * Gets the PUBLIC KEY of a group.
   */
  function getGroupPK(uint _groupID) public view validGroup(_groupID) returns (string memory) {
    return groups[_groupID].PK;
  }

  /*
   * Gets the status of a group.
   */
  function geRequestResult(uint _groupID) public view validGroup(_groupID) onlyAggregator(_groupID, msg.sender) returns (bytes memory) {
    return groups[_groupID].request.requestResult;
  }

  /*
   * Gets the expiration date of a group.
   */
  function getGroupExpirationTime(uint _groupID) public view validGroup(_groupID) returns (uint) {
    return groups[_groupID].expirationTime;
  }

  /*
   * Gets the producer participation for a specific group.
   */
  function getParticipation(uint _groupID, address _producerP) public view validGroup(_groupID) returns (bytes memory, bytes32, bytes memory) {
    return (groups[_groupID].producerDetails[_producerP].participation,
            groups[_groupID].producerDetails[_producerP].participationHash,
            groups[_groupID].producerDetails[_producerP].participationSignature);
  }

  /*
   * Gets the producers that have participated for a specific group.
   */
  function getGroupProducers(uint _groupID) public view validGroup(_groupID) returns (address[] memory) { 
      return groups[_groupID].producers;
  }

  /*
   * Checks if a producer has participated for a specific group.
   */
  function producerHasParticipate(uint _groupID, address producer) public view validGroup(_groupID) returns (bool) {
    return (groups[_groupID].producerDetails[producer].hasParticipate);
  }

    /* Group OPERATIONS */
    event groupCreated(address sender, uint groupCount, string requestDescription, string aggregationFunction, uint waitingTime, address aggregator);
    //Create a new group only by the data consumer
    function createGroup(string memory _requestDescription, string memory _aggregationFunction, uint _waitingTime, address _aggregator) public onlyOwner(msg.sender) returns(uint) {

        groupCount++;

        Group storage currentGroup = groups[groupCount];
        currentGroup.creator = msg.sender;
        currentGroup.status = GroupStatus.SETUP;
        currentGroup.expirationTime = now + _waitingTime * 1 seconds;
        currentGroup.request = Request ({requestDescription: _requestDescription, aggregationFunction: _aggregationFunction, requestResult: ""});
        currentGroup.aggregator = _aggregator;

        emit groupCreated(msg.sender, groupCount, _requestDescription, _aggregationFunction, _waitingTime, _aggregator);
        return groupCount;
    }

    event PKupdated(uint _groupID, string _PK);
    //Update PK by the Node
    function updatePK(uint _groupID, string memory _PK) public validGroup(_groupID) onlyKGN(msg.sender) {
        groups[_groupID].PK = _PK;
        emit PKupdated(_groupID, _PK);
    }

    event participantsAdded(uint _groupID);
    //Add participants by the consumer
    function addParticipants(uint _groupID) public onlyOwner(msg.sender) validGroup(_groupID) {

        Group storage currentGroup = groups[_groupID];
        currentGroup.status = GroupStatus.IN_PROGRESS;

        for (uint i=0; i<producers.length; i++)
            if (consumerHasPolicy[owner][producers[i]].isMatched){
                currentGroup.producerDetails[producers[i]] = Producer({
                    hasParticipate: false,
                    participation: "",
                    participationHash: "" ,
                    participationSignature: "" });
                currentGroup.producers.push(producers[i]);

                isParticipant[_groupID][producers[i]]=true;
            }

        emit participantsAdded(_groupID);
    }

    event participationAdded(uint groupID, bool acceptedParticipation, bool validHash, bytes participation, bytes32 participationHash, bytes participationSignature);
    //Add a new participation by an allowed producer
    function addParticipation(uint _groupID, bool _consentResponse, bytes memory _participation, bytes32 _participationHash, bytes memory _participationSignature)
    public validGroup(_groupID) onlyProducer(msg.sender)  {

        require (isParticipant[_groupID][msg.sender]);// ELSE "Producer is not a group participant !"
        require(getGroupStatus(_groupID) == GroupStatus.IN_PROGRESS);// ELSE "Group has expired !"
        require(!producerHasParticipate(_groupID, msg.sender));//, "Producer has already participated.");
        require(getGroupExpirationTime(_groupID) > now);

        bool acceptedParticipation = false;
        bool validHash = true;

        if (consumerHasPolicy[owner][msg.sender].effectiveNeedExplicitConsent == false ||
              (consumerHasPolicy[owner][msg.sender].effectiveNeedExplicitConsent && _consentResponse) ) {
            acceptedParticipation = true;
        }

        validHash= verifyHashVal(_participation, _participationHash);

        if (acceptedParticipation && validHash){
            groups[_groupID].producerDetails[msg.sender].hasParticipate= true;
            groups[_groupID].producerDetails[msg.sender].participation= _participation;
            groups[_groupID].producerDetails[msg.sender].participationHash= _participationHash;
            groups[_groupID].producerDetails[msg.sender].participationSignature= _participationSignature;
        }

        emit participationAdded(_groupID, acceptedParticipation, validHash, _participation, _participationHash, _participationSignature);
    }

    //End a group
    event groupEnded(uint _groupID);
    function endGroup(uint _groupID) public  onlyOwner(msg.sender) validGroup(_groupID) {
        require(getGroupStatus(_groupID) == GroupStatus.IN_PROGRESS);// ELSE "Group has expired !"
        //require(now >= getGroupExpirationTime(_groupID) );// ELSE "Participation period has not expired !"

        groups[_groupID].status = GroupStatus.FINISHED;
        emit groupEnded(_groupID);
    }

    event requestResultUpdated(uint groupid, bytes result);
    function updateRequestResult(uint _groupID, bytes memory _result) public onlyAggregator(_groupID, msg.sender) {
        groups[_groupID].request.requestResult = _result;
        requestGroup[_groupID] = groups[_groupID].request;
        
        emit requestResultUpdated(_groupID, _result);
    }
}
