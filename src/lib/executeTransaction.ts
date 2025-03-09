import { Addresses } from '@/shared/addresses';
import abiPath from './abi/PriceDiscrepancy.json';
import { ethers } from 'ethers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const executeTransaction = async (proof: any, publicSignals: Array<string>, signer: any): Promise<any> => {
  try {

    console.log("formattedPublicSignals", publicSignals);
    console.log("finalProof", proof);
    console.log("Contract Address:", Addresses.PRICE_DISCREPANCY_ADDR);


    // Create a contract instance with the signer (the connected wallet)
    const contract = new ethers.Contract(Addresses.PRICE_DISCREPANCY_ADDR, abiPath.abi, signer);

    // Convert string array to BigNumber array for uint256 compatibility
    const formattedPublicSignals = publicSignals.map(signal => {
      // Check if the signal is a hex string and ensure it has the 0x prefix
      if (typeof signal === 'string') {
        return signal.startsWith('0x') 
          ? ethers.BigNumber.from(signal)
          : ethers.BigNumber.from(`0x${signal}`);
      }
      return ethers.BigNumber.from(signal);
    });

    console.log("formattedPublicSignals2", formattedPublicSignals);

    try {
        const result = await contract.callStatic.submitProof(proof, formattedPublicSignals);
        console.log("Static call result:", result);
      } catch (error) {
        console.error("Static call error:", error);
      }

    // Execute the transaction
    const tx = await contract.submitProof(proof, formattedPublicSignals, { gasLimit: 1000000 });

    console.log("Ethers transaction hash:", tx.hash);

    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    console.log("Ethers transaction receipt:", receipt);
    return receipt;
  } catch (error) {
    console.error("Error executing transaction with ethers:", error);
    throw error;
  }
};