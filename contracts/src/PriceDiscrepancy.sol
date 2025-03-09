// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

// Interface to PlonkVerifier.sol
interface IPlonkVerifier {
    function verifyProof(uint256[24] calldata _proof, uint256[1] calldata _pubSignals) external view returns (bool);
}

contract PriceDiscrepancy {
    address public s_plonkVerifierAddress;
    uint256 public immutable REWARD_AMOUNT = 0.00001 ether; // Fixed reward of 0.00001 ETH

    event ProofResult(bool result);
    event RewardPaid(address recipient, uint256 amount);

    constructor(address plonkVerifierAddress) payable {
        s_plonkVerifierAddress = plonkVerifierAddress;
    }

    // ZK proof is generated in the browser and submitted as a transaction w/ the proof as fixed-size arrays.
    function submitProof(uint256[24] calldata _proof, uint256[1] calldata _pubSignals) public returns (bool) {
        bool result = IPlonkVerifier(s_plonkVerifierAddress).verifyProof(_proof, _pubSignals);
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