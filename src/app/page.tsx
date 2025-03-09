"use client";

import '@/styles/globals.css'
import { ethers } from 'ethers';
import { Container, Paper, Title, Text, TextInput, Button, Stack, Group, Box } from '@mantine/core';
import { useState, FormEvent, useEffect, useCallback } from 'react';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { useAccount } from 'wagmi';
import { notifications } from "@mantine/notifications";
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { executeTransaction } from '@/lib/executeTransaction';
import { createPublicClient, http } from 'viem';
import { mainnet, base } from 'viem/chains';

// Add this constant at the top of the component
const CONTRACT_ADDRESS = "0xa59B95f0359b6941005DEcC757B517d2F4701f63";
const BASE_EXPLORER_URL = "https://sepolia.basescan.org";

export default function Home() {
  const [mainnetPrice, setMainnetPrice] = useState<string>("");
  const [basePrice, setBasePrice] = useState<string>("");
  const [priceDiff, setPriceDiff] = useState<string>("");
  const [threshold, setThreshold] = useState("");
  // Add new state variables for proof and public signals
  const [proofData, setProofData] = useState<string>("");
  const [publicSignalsData, setPublicSignalsData] = useState<string>("");
  const { isConnected } = useAccount();
  const SCALING_FACTOR = 1e10;
  // Create public clients for both chains
  const mainnetClient = createPublicClient({
    chain: mainnet,
    transport: http()
  });

  const baseClient = createPublicClient({
    chain: base,
    transport: http()
  });

  // Add state to control when to show connect button
  const [showConnectButton, setShowConnectButton] = useState(false);

  // Wrap fetchPoolData with useCallback
  const fetchPoolData = useCallback(async () => {
    try {
      // ABI for slot0 function
      const abi = [{
        "inputs": [],
        "name": "slot0",
        "outputs": [
          { "internalType": "uint160", "name": "sqrtPriceX96", "type": "uint160" },
          { "internalType": "int24", "name": "tick", "type": "int24" },
          { "internalType": "uint16", "name": "observationIndex", "type": "uint16" },
          { "internalType": "uint16", "name": "observationCardinality", "type": "uint16" },
          { "internalType": "uint16", "name": "observationCardinalityNext", "type": "uint16" },
          { "internalType": "uint8", "name": "feeProtocol", "type": "uint8" },
          { "internalType": "bool", "name": "unlocked", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
      }];

      // Fetch data from both chains
      const [mainnetSlot0, baseSlot0] = await Promise.all([
        mainnetClient.readContract({
          address: '0xE0554a476A092703abdB3Ef35c80e0D76d32939F',
          abi,
          functionName: 'slot0',
        }) as Promise<[bigint, number, number, number, number, number, boolean]>,
        baseClient.readContract({
          address: '0xd0b53D9277642d899DF5C87A3966A349A798F224',
          abi,
          functionName: 'slot0',
        }) as Promise<[bigint, number, number, number, number, number, boolean]>
      ]);

      // Convert sqrtPriceX96 to actual price for both chains
      const mainnetSqrtPrice = mainnetSlot0[0];
      const baseSqrtPrice = baseSlot0[0];
      
      // Calculate prices using BigInt to handle large numbers
      const Q96 = BigInt(2) ** BigInt(96);
      
      // Calculate prices for both chains
      // 1. Define the scale factor (2^96)

      // 2. Compute the unscaled sqrtPrice (this is the square root of the price ratio)

      // 3. Square the sqrtPrice to get the raw price ratio between tokens.
      // This raw price represents token1 per token0 (e.g. WETH per USDC) before adjusting for decimals.

      // 4. Adjust for token decimals. For USDC/WETH:
      //    - USDC has 6 decimals, WETH has 18 decimals,
      //    - So multiply by 10^(6 - 18) = 1e-12

      const calculatePriceMainnet = (sqrtPriceX96: bigint): number => {
        const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
        const rawPrice = sqrtPrice ** 2;
        // Adjust for USDC(6 decimals)/WETH(18 decimals)
        return Math.round((rawPrice * 1e-12) * 1e18);
      };

      const calculatePriceBase = (sqrtPriceX96: bigint): number => {
        const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
        const rawPrice = sqrtPrice ** 2;
        // Adjust for USDC(6 decimals)/WETH(18 decimals)
        return Math.round((1/(rawPrice * 1e12))* 1e18);
      };

      const mainnetPriceValue = calculatePriceMainnet(BigInt(mainnetSqrtPrice));
      const basePriceValue = calculatePriceBase(BigInt(baseSqrtPrice));

      setMainnetPrice(mainnetPriceValue.toString());
      setBasePrice(basePriceValue.toString());

      // Calculate price difference as a percentage
      const lowerPrice = Math.min(mainnetPriceValue, basePriceValue);
      const higherPrice = Math.max(mainnetPriceValue, basePriceValue);
      const diff = (Math.floor(higherPrice/SCALING_FACTOR) - Math.floor(lowerPrice/SCALING_FACTOR));
      setPriceDiff(diff.toString());

    } catch (error) {
      console.error('Error fetching pool data:', error);
      notifications.show({
        message: "Error fetching pool prices",
        color: "red",
      });
    }
  }, [mainnetClient, baseClient]);

  useEffect(() => {
    // Set showConnectButton to true after a short delay
    const timer = setTimeout(() => {
      setShowConnectButton(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleGenerateProofSendTransaction = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // We will send an HTTP request with our inputs to our next.js backend to 
    // request a proof to be generated.
    const data = {
      price1: mainnetPrice,
      price2: basePrice,
      threshold: threshold,
    }
    const config: AxiosRequestConfig = {
      headers: {
        "Content-Type": "application/json",
      }
    }

    // Send the HTTP request
    try {
      const res = await axios.post("/api/generate_proof", data, config);
      notifications.show({
        message: "Proof generated successfully! Submitting transaction...",
        color: "green",
      });

      // Split out the proof and public signals from the response data
      const { proof, publicSignals } = res.data;
      // Store proof and public signals in state
      setProofData(JSON.stringify(proof, null, 2));
      setPublicSignalsData(JSON.stringify(publicSignals, null, 2));
      console.log("Got the proof as calldata. Going to submit transaction...", proof);
      console.log("Got the public signals as calldata, Going to submit transaction... ", publicSignals);

      // Ensure that the window.ethereum provider is available (e.g. MetaMask)
      if (typeof window === "undefined" || !window.ethereum) {
        throw new Error("No Ethereum wallet found. Please install MetaMask or similar wallet.");
      }

      // Create a Web3 provider using the injected wallet
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const { chainId } = await provider.getNetwork();
      if (chainId !== 84532) {
        alert("Please switch your wallet network to Base Sepolia.");
        return;
      }
      

      // Request account access if needed
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();

      // Write the transaction
      const txResult = await executeTransaction(proof, publicSignals, signer);
      const txHash = txResult.transactionHash;

      console.log("Transaction submitted successfully! Tx Hash: ", txHash);

      notifications.show({
        message: (
          <Paper p="xs" withBorder radius="sm" style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f8f9fa'
          }}>
            <Text size="sm">
              Transaction succeeded! View on Base Sepolia:{' '}
              <a 
                href={`${BASE_EXPLORER_URL}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  color: '#228be6',
                  textDecoration: 'none',
                  fontWeight: 500
                }}
                className="hover:underline"
              >
                {txHash.slice(0, 6)}...{txHash.slice(-4)}
              </a>
            </Text>
          </Paper>
        ),
        color: "green",
        autoClose: false,
      });
    } catch (err: unknown) {
      const statusCode = (err as AxiosError).response?.status;
      // Type assertion for the error response data
      const errorMsg = ((err as AxiosError).response?.data as { error?: string })?.error || 'Unknown error';
      notifications.show({
        message: `Error ${statusCode}: ${errorMsg}`,
        color: "red",
      });
    }
  }

  // Modify the renderSubmitButton function
  const renderSubmitButton = () => {
    if (!isConnected && showConnectButton) {
      return <ConnectWalletButton />
    }
    
    // Add condition to check if price difference meets threshold
    const diffValue = Number(priceDiff);
    const thresholdValue = Number(threshold);
    const isThresholdMet = diffValue >= thresholdValue && thresholdValue > 0;
    
    return (
      <Button 
        // style={{ display: 'block', visibility: 'visible', opacity: 1 }} 
        type="submit" 
        size="md" 
        variant="filled"
        color="blue"
        fullWidth
        disabled={!isThresholdMet}
        title={!isThresholdMet ? "Price difference must be ≥ threshold for a valid proof" : ""}
      >
        Generate Proof & Send Transaction
      </Button>
    )
  }

  // Add a new function to handle button click
  const handleFetchLatestPrices = () => {
    fetchPoolData();
  };

  return (
    <Box py="xl" style={{ minHeight: '100vh' }}>
      <Container size="md" px="xs">
        <Paper shadow="sm" radius="md" p={{ base: 'sm', sm: 'xl' }} withBorder>
          <Group justify="space-between" mb="lg" pb="md" style={{ 
            borderBottom: '1px solid #eee',
            flexDirection: 'column', // Stack items vertically on mobile
            alignItems: 'stretch', // Full width items on mobile
            gap: '1rem'
          }}>
            <Title order={2} c="dark" size="h2">
              Uniswap Price Discrepancy Prover
            </Title>
            <Text size="sm">
              Contract Address:{' '}
              <a 
                href={`${BASE_EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'blue', textDecoration: 'underline' }}
              >
                {CONTRACT_ADDRESS}
              </a>
            </Text>
            {showConnectButton && <ConnectWalletButton />}
          </Group>

          <Text c="dimmed" size="sm" mb="xl">
            This tool proves that there exists a significant price discrepancy between USDC pools on 
            Ethereum Mainnet and Base. The proof is generated locally in your browser, and only the 
            zero-knowledge proof is sent to the blockchain, keeping the actual prices private while 
            proving their difference exceeds the threshold.
          </Text>

          <Text c="dimmed" size="xs" mb="xl" style={{ wordBreak: 'break-all' }}>
            Mainnet Pool: 0xE0554a476A092703abdB3Ef35c80e0D76d32939F
            <br />
            Base Pool: 0xd0b53D9277642d899DF5C87A3966A349A798F224
          </Text>

          <form onSubmit={handleGenerateProofSendTransaction}>
            <Stack gap="md">
              <TextInput
                label="Mainnet USDC Pool Price(in wei)"
                value={mainnetPrice}
                readOnly
                radius="md"
              />
              <TextInput
                label="Mainnet USDC Pool Price(scaled for fast proof generation)"
                value={Math.floor(Number(mainnetPrice) / SCALING_FACTOR)}
                readOnly
                radius="md"
              />
              <TextInput
                label="Base USDC Pool Price (in wei)"
                value={basePrice}
                readOnly
                radius="md"
              />
              <TextInput
                label="Base USDC Pool Price(scaled for fast proof generation)"
                value={Math.floor(Number(basePrice) / SCALING_FACTOR)}
                readOnly
                radius="md"
              />
              <TextInput
                label="Price Difference"
                value={priceDiff}
                readOnly
                radius="md"
              />
              <TextInput
                label="Price Difference Threshold (Difference ≥ Threshold for valid proof)"
                placeholder="Enter threshold value"
                value={threshold}
                onChange={(e) => setThreshold(e.currentTarget.value)}
                radius="md"
                description={Number(priceDiff) < Number(threshold) ? "Warning: Current price difference is less than threshold" : ""}
                error={Number(priceDiff) < Number(threshold) ? "Proof will fail - decrease threshold or wait for larger price difference" : ""}
              />
              {/* Add proof display boxes */}
              {proofData && (
                <Paper p="md" withBorder radius="md">
                  <Title order={4} mb="sm">Generated Proof</Title>
                  <Text component="pre" style={{ 
                    overflowX: 'auto', 
                    whiteSpace: 'pre-wrap',
                    backgroundColor: '#f8f9fa',
                    padding: '1rem',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}>
                    {proofData}
                  </Text>
                </Paper>
              )}
              
              {publicSignalsData && (
                <Paper p="md" withBorder radius="md">
                  <Title order={4} mb="sm">Public Signals</Title>
                  <Text component="pre" style={{ 
                    overflowX: 'auto', 
                    whiteSpace: 'pre-wrap',
                    backgroundColor: '#f8f9fa',
                    padding: '1rem',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}>
                    {publicSignalsData}
                  </Text>
                </Paper>
              )}

              {renderSubmitButton()}
              <Button 
                onClick={handleFetchLatestPrices} 
                size="md" 
                variant="outline"
                color="blue"
                fullWidth
              >
                Fetch Latest Prices
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </Box>
  )
}