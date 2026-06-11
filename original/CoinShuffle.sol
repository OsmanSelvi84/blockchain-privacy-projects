// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CoinShuffle {

    struct Participant {
        string name;
        address inputAddress;
        address outputAddress;
        uint256 amount;
    }

    struct Transaction {
        string  participantName;
        address input;
        address output;
        bool    valid;
    }

    Participant[] public participants;
    Transaction[] public transactions;
    bool          public shuffleDone;

    event ParticipantAdded(string name, address inputAddress);
    event ShuffleCompleted(uint256 participantCount);

    modifier notShuffled() {
        require(!shuffleDone, "Shuffle already completed");
        _;
    }

    function addParticipant(
        string  memory _name,
        address _inputAddress,
        address _outputAddress,
        uint256 _amount
    ) external notShuffled {
        participants.push(Participant({
            name:          _name,
            inputAddress:  _inputAddress,
            outputAddress: _outputAddress,
            amount:        _amount
        }));
        emit ParticipantAdded(_name, _inputAddress);
    }

    function validatePool() public view {
        require(
            participants.length >= 3,
            "Mixing pool must contain at least 3 participants"
        );
        uint256 baseAmount = participants[0].amount;
        for (uint256 i = 1; i < participants.length; i++) {
            require(
                participants[i].amount == baseAmount,
                "All participants must use the same denomination"
            );
        }
    }

    function createShuffleTransaction() external notShuffled {
        validatePool();

        uint256 n = participants.length;
        address[] memory outputs = new address[](n);

        for (uint256 i = 0; i < n; i++) {
            outputs[i] = participants[i].outputAddress;
        }

        for (uint256 i = n - 1; i > 0; i--) {
            uint256 j = uint256(
                keccak256(abi.encodePacked(block.timestamp, block.prevrandao, i))
            ) % (i + 1);
            address temp = outputs[i];
            outputs[i]   = outputs[j];
            outputs[j]   = temp;
        }

        for (uint256 i = 0; i < n; i++) {
            transactions.push(Transaction({
                participantName: participants[i].name,
                input:           participants[i].inputAddress,
                output:          outputs[i],
                valid:           true
            }));
        }

        shuffleDone = true;
        emit ShuffleCompleted(n);
    }

    function poolSize() external view returns (uint256) {
        return participants.length;
    }

    function getTransactions() external view returns (Transaction[] memory) {
        return transactions;
    }

    function getTransaction(uint256 index)
        external view returns (Transaction memory)
    {
        require(index < transactions.length, "Index out of bounds");
        return transactions[index];
    }
    
    function getTransactionDetails(uint256 index)
    external
    view
    returns (
        string memory participantName,
        address inputAddress,
        address originalOutputAddress,
        address shuffledOutputAddress,
        bool changed,
        bool valid
    )
{
    require(index < transactions.length, "Index out of bounds");

    Transaction memory txData = transactions[index];
    Participant memory participant = participants[index];

    return (
        txData.participantName,
        txData.input,
        participant.outputAddress,
        txData.output,
        participant.outputAddress != txData.output,
        txData.valid
    );
}

    function resetPool() external {
        delete participants;
        delete transactions;
        shuffleDone = false;
    }
}
