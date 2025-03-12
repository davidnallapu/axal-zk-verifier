// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

// Interface to PlonkVerifier.sol
interface IPlonkVerifier {
    function verifyProof(uint256[24] calldata _proof, uint256[1] calldata _pubSignals) external view returns (bool);
}

contract PriceDiscrepancyV1 {
    address public s_plonkVerifierAddress;
    uint256 public immutable REWARD_AMOUNT = 0.000001 ether; // Fixed reward of 0.00001 ETH
    bool private locked; // Reentrancy guard state variable
    bool private initialized; // Initialization flag for proxy pattern
    
    // New state variables
    uint256 public s_claimIdCounter;
    mapping(uint256 => address) public s_claimIdToSubmitter;
    mapping(address => uint256) public s_rewardsEarned;
    mapping(address => bytes32) public s_addressToProofHash;

    event ProofResult(bool result);
    event RewardPaid(address recipient, uint256 amount, uint256 claimId);
    event Initialized(address plonkVerifierAddress);
    event ClaimRegistered(uint256 claimId, address submitter, bytes32 proofHash);

    // Modifier to prevent reentrancy attacks
    modifier nonReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }

    // Modifier to ensure initialization happens only once
    modifier initializer() {
        require(!initialized, "Already initialized");
        _;
        initialized = true;
    }

    // Replace constructor with initializer function for proxy pattern
    function initialize(address plonkVerifierAddress) public payable initializer {
        s_plonkVerifierAddress = plonkVerifierAddress;
        emit Initialized(plonkVerifierAddress);
    }

    // Helper function to calculate proof hash
    function _calculateProofHash(uint256[24] calldata _proof, uint256[1] calldata _pubSignals) internal pure returns (bytes32) {
        return keccak256(abi.encode(_proof, _pubSignals));
    }

    // ZK proof is generated in the browser and submitted as a transaction w/ the proof as fixed-size arrays.
    function submitProof(uint256[24] calldata _proof, uint256[1] calldata _pubSignals) public nonReentrant returns (bool) {
        bytes32 proofHash = _calculateProofHash(_proof, _pubSignals);
        
        // Check if user has already submitted this proof
        require(s_addressToProofHash[msg.sender] != proofHash, "Proof already submitted by this user");
        
        bool result = IPlonkVerifier(s_plonkVerifierAddress).verifyProof(_proof, _pubSignals);
        emit ProofResult(result);
        
        if (result) {
            // Increment claim ID
            uint256 claimId = s_claimIdCounter++;
            
            // Update mappings
            s_claimIdToSubmitter[claimId] = msg.sender;
            s_addressToProofHash[msg.sender] = proofHash;
            s_rewardsEarned[msg.sender] += REWARD_AMOUNT;
            
            // Register the claim
            emit ClaimRegistered(claimId, msg.sender, proofHash);
            
            require(address(this).balance >= REWARD_AMOUNT, "Insufficient contract balance");
            (bool success, ) = payable(msg.sender).call{value: REWARD_AMOUNT}("");
            require(success, "Failed to send reward");
            emit RewardPaid(msg.sender, REWARD_AMOUNT, claimId);
        }
        
        return result;
    }

    // Allow the contract to receive ETH
    receive() external payable {}
}