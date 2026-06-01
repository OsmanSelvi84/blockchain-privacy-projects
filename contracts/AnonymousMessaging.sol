pragma solidity ^0.4.24;

// Importing the elliptic curve cryptography mathematical engine from the reference project
import "./secp256k1.sol";

contract AnonymousMessaging is secp256k {
    
    // Struct defining how messages will be stored on the blockchain
    struct Message {
        string content;       // The actual message content
        uint256 timestamp;    // Time when the message was sent
        uint256[2] keyImage;  // Key image used for linkability and spam prevention
    }

    // Array storing all anonymous messages
    Message[] public messages;

    // Mapping to keep track of used key images to prevent the same user from spamming 
    mapping(bytes32 => bool) public usedKeyImages;

    // Event emitted when a new message is successfully sent to the network
    event MessageSent(string content, uint256 timestamp);

    // Constructor function that runs when the contract is deployed
    constructor() public {
        // Initial setup can be added here if necessary
    }

    // Function to send an anonymous message to the network
    function sendMessage(
        string _content,
        uint256[] _publicKeysX, // Ring members' X coordinates
        uint256[] _publicKeysY, // Ring members' Y coordinates
        uint256[2] _keyImage,   // Key image to prevent spam/double-messaging
        uint256 _c0,            // Ring signature starting challenge
        uint256[] _s            // Ring signature responses
    ) public {
        
        // 1. Linkability Check
        bytes32 keyHash = keccak256(abi.encodePacked(_keyImage[0], _keyImage[1]));
        require(usedKeyImages[keyHash] == false, "Error: This sender has already sent a message!");

        // STACK TOO DEEP FIX 1: Calculate the message hash outside the verification function
        bytes32 messageHash = keccak256(abi.encodePacked(_content));

        // 2. Signature Verification
        require(
            verifyRingSignature(messageHash, _publicKeysX, _publicKeysY, _keyImage, _c0, _s), 
            "Error: Invalid ring signature!"
        );

        // 3. Mark the key image as used
        usedKeyImages[keyHash] = true;

        // 4. Store the message
        messages.push(Message({
            content: _content,
            timestamp: block.timestamp,
            keyImage: _keyImage
        }));

        // 5. Emit the event
        emit MessageSent(_content, block.timestamp);
    }

    // Framework for the verification logic (Optimized for EVM Stack Limit)
    function verifyRingSignature(
        bytes32 _messageHash, 
        uint256[] _publicKeysX,
        uint256[] _publicKeysY,
        uint256[2] _keyImage,
        uint256 _c0,
        uint256[] _s
    ) internal view returns (bool) {
        
        // Security Checks
        require(_publicKeysX.length == _publicKeysY.length && _publicKeysX.length == _s.length, "Error: Array lengths mismatch!");
        require(_publicKeysX.length > 0, "Error: Ring cannot be empty!");

        uint256 c = _c0;
        
        // STACK TOO DEEP FIX 2: Reusing temporary variables instead of creating new ones inside the loop
        uint256 x1; uint256 y1; uint256 z1;
        uint256 x2; uint256 y2; uint256 z2;
        
        // Loop through the ring to verify the cryptographic links
        for (uint256 i = 0; i < _publicKeysX.length; i++) {
            
            // 1. Calculate s[i] * G (Base Point)
            (x1, y1, z1) = _ecMul(_s[i], gx, gy, 1);
            
            // 2. Calculate c * P[i] (Public Key)
            (x2, y2, z2) = _ecMul(c, _publicKeysX[i], _publicKeysY[i], 1);
            
            // 3. Add them together (Result overwrites x1, y1, z1 to save memory)
            (x1, y1, z1) = _ecAdd(x1, y1, 1, x2, y2, 1);
            
            // 4. Hash the result to get the next challenge
            c = uint256(keccak256(abi.encodePacked(_messageHash, x1, y1, _keyImage[0], _keyImage[1])));
        }
        
        // If the signature is valid, the final 'c' must perfectly equal the starting '_c0'
        return c == _c0; 
    }
}