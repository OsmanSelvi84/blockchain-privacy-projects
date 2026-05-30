// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AnonymousMessageRegistry {

    struct MessageRecord {
        string messageHash;
        bool verified;
        uint256 timestamp;
    }

    MessageRecord[] public records;

    event MessageStored(
        uint256 indexed id,
        string messageHash,
        bool verified,
        uint256 timestamp
    );

    function storeMessage(
        string memory _messageHash,
        bool _verified
    ) public {

        records.push(
            MessageRecord({
                messageHash: _messageHash,
                verified: _verified,
                timestamp: block.timestamp
            })
        );

        emit MessageStored(
            records.length - 1,
            _messageHash,
            _verified,
            block.timestamp
        );
    }

    function getMessage(uint256 _id)
        public
        view
        returns (
            string memory,
            bool,
            uint256
        )
    {
        MessageRecord memory record = records[_id];

        return (
            record.messageHash,
            record.verified,
            record.timestamp
        );
    }

    function getMessageCount() public view returns (uint256) {
        return records.length;
    }
}
