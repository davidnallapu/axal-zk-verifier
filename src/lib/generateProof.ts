import path from "path";
// @ts-expect-error snarkjs lacks TypeScript type definitions
import * as snarkjs from 'snarkjs';
import fs from 'fs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generateProof = async (price1: number, price2: number, threshold: number): Promise<any> => {
  console.log(`generateProof/Generating vote proof with inputs: ${price1}, ${price2}, ${threshold}`);
  
  // Scale down the numbers to fit within 32 bits (2^32 - 1)
  // We'll divide by 1e6 to handle large wei values while preserving 6 decimal places
  const SCALING_FACTOR = 1e10;
  const inputs = {
    price1: Math.floor(price1 / SCALING_FACTOR),
    price2: Math.floor(price2 / SCALING_FACTOR),
    threshold: threshold
  }

  // Log scaled inputs for debugging
  console.log(`generateProof/Scaled inputs: `, inputs);

  // Paths to the .wasm file and proving key
  const wasmPath = path.join(process.cwd(), 'circuits/build/price_discrepancy_js/price_discrepancy.wasm');
  const provingKeyPath = path.join(process.cwd(), 'circuits/build/proving_key.zkey')

  try {
    console.log("generateProof/Generating proof...");
    console.log("generateProof/Using paths:", { wasmPath, provingKeyPath });
    
    // Check if files exist before proceeding
    if (!fs.existsSync(wasmPath)) {
      throw new Error(`generateProof/WASM file not found at: ${wasmPath}`);
    }
    if (!fs.existsSync(provingKeyPath)) {
      throw new Error(`generateProof/Proving key not found at: ${provingKeyPath}`);
    }

    // Generate a proof of the circuit and create a structure for the output signals
    const { proof, publicSignals } = await snarkjs.plonk.fullProve(inputs, wasmPath, provingKeyPath);

    console.log("generateProof/Raw proof:", proof);


    console.log("generateProof/Proof structure:", Object.keys(proof));
    if (!proof || !publicSignals) {
      throw new Error('generateProof/Proof generation failed - proof or publicSignals is undefined');
    }

    console.log("generateProof/Proof generated successfully!");
    console.log("generateProof/Proof structure:", Object.keys(proof));
    console.log("generateProof/Public signals:", publicSignals);

    // Convert the data into Solidity calldata that can be sent as a transaction
    // Generate the calldata blob from snarkjs
    const calldataBlob = await snarkjs.plonk.exportSolidityCallData(proof, publicSignals);
    console.log("generateProof/raw calldataBlob", calldataBlob);

    const splitProofAndPubSigs = calldataBlob.split("]");
    console.log("generateProof/splitProofAndPubSigs", splitProofAndPubSigs);
    
    const proofArrayStr = splitProofAndPubSigs[0] + "]";
    console.log("generateProof/proofArrayStr", proofArrayStr);
    
    const proofArray = JSON.parse(proofArrayStr);

    console.log("generateProof/proofArray", proofArray);


    // // Fix the calldata string if it contains a concatenated array without a comma
    // let fixedCalldata = calldataBlob.trim();
    // // Check if the string contains the pattern '"]["'
    // if (fixedCalldata.includes('"]["')) {
    //   // Replace the pattern with a comma, and ensure the string is a valid JSON array
    //   fixedCalldata = fixedCalldata.replace('"]["', '","');
    // }

    // console.log("Fixed calldata:", fixedCalldata);

    // Parse the fixed calldata
    // const parsedCalldata = JSON.parse(fixedCalldata);

    // Now, assuming parsedCalldata is an array with two elements:
    return {
      proof: proofArray, 
      publicSignals: publicSignals,
    };

  } catch (err) {
    console.log(`generateProof/Error:`, err)
    return {
      proof: "", 
      publicSignals: [],
    }
  }
}