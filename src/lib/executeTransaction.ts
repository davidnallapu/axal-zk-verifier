import { Addresses } from '@/shared/addresses';
import { ethers } from 'ethers';
import abiPath from './abi/PriceDiscrepancy.json';


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const executeTransaction = async (proof: any, publicSignals: Array<string>): Promise<any> => {
  try {
    // Ensure that the window.ethereum provider is available (e.g. MetaMask)
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("No Ethereum wallet found. Please install MetaMask or similar wallet.");
    }

    // Create a Web3 provider using the injected wallet
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    // Request account access if needed
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

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