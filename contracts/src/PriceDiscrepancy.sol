// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

// Interface to PlonkVerifier.sol
interface IPlonkVerifier {
    function verifyProof(bytes memory proof, uint[] memory pubSignals) external view returns (bool);
}

contract PriceDiscrepancy {
    address public s_plonkVerifierAddress;
    uint256 public immutable REWARD_AMOUNT = 0.001 ether; // Fixed reward of 0.001 ETH

    event ProofResult(bool result);
    event RewardPaid(address recipient, uint256 amount);

    constructor(address plonkVerifierAddress) payable {
        s_plonkVerifierAddress = plonkVerifierAddress;
    }

    // ZK proof is generated in the browser and submitted as a transaction w/ the proof as bytes.
    function submitProof(bytes memory proof, uint256[] memory pubSignals) public returns (bool) {
        bool result = IPlonkVerifier(s_plonkVerifierAddress).verifyProof(proof, pubSignals);
        emit ProofResult(result);
        
        if (result) {
            require(address(this).balance >= REWARD_AMOUNT, "Insufficient contract balance");
            (bool success, ) = payable(msg.sender).call{value: REWARD_AMOUNT}("");
            require(success, "Failed to send reward");
            emit RewardPaid(msg.sender, REWARD_AMOUNT);
        }
        
        return result;
    }

    // Allow the contract to receive ETH
    receive() external payable {}
}