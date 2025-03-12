"use client";

import '@/styles/globals.css';
import React, { FormEvent, useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { 
  Container, 
  Paper, 
  Title, 
  Text, 
  TextInput, 
  Button, 
  Stack, 
  Group, 
  Box, 
  rem,
  MantineProvider,
  createTheme
} from '@mantine/core';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { useAccount } from 'wagmi';
import { notifications } from '@mantine/notifications';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { executeTransaction } from '@/lib/executeTransaction';
import { createPublicClient, http } from 'viem';
import { mainnet, base } from 'viem/chains';
import { Addresses } from '@/shared/addresses';

const BASE_EXPLORER_URL = 'https://sepolia.basescan.org';

// Create a theme
const theme = createTheme({
  // Add basic spacing configuration
  spacing: {
    xs: rem(8),
    sm: rem(16),
    md: rem(24),
    lg: rem(32),
    xl: rem(40)
  },
  colors: {
    // Matrix-inspired color palette
    dark: [
      '#C1C2C5', // 0
      '#A6A7AB', // 1
      '#909296', // 2
      '#5C5F66', // 3
      '#373A40', // 4
      '#2C2E33', // 5
      '#1A1B1E', // 6
      '#141517', // 7
      '#101113', // 8
      '#0A0A0B', // 9
    ],
    matrix: [
      '#E2FFE9', // 0 - lightest
      '#CCFFDB', // 1
      '#9DFFC1', // 2
      '#50FF8A', // 3
      '#00FF41', // 4 - primary matrix green
      '#00D938', // 5
      '#00B22E', // 6
      '#008C24', // 7
      '#00661A', // 8
      '#003E10', // 9 - darkest
    ],
  },
  primaryColor: 'matrix',
  primaryShade: 4,
});

export default function Home() {
  // Remove or comment out the useStyles function call since we'll use CSS classes instead
  // const styles = useStyles();

  // State
  const [mainnetPrice, setMainnetPrice] = useState<string>('');
  const [basePrice, setBasePrice] = useState<string>('');
  const [priceDiff, setPriceDiff] = useState<string>('');
  const [threshold, setThreshold] = useState('');
  const [proofData, setProofData] = useState<string>('');
  const [publicSignalsData, setPublicSignalsData] = useState<string>('');
  const { isConnected } = useAccount();
  const [showConnectButton, setShowConnectButton] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  const SCALING_FACTOR = 1e10;

  // Create public clients for both chains
  const mainnetClient = createPublicClient({
    chain: mainnet,
    transport: http(),
  });
  const baseClient = createPublicClient({
    chain: base,
    transport: http(),
  });

  // Add this effect to detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setIsMobileDevice(mobile);
      console.log('Is mobile device:', mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch data
  const fetchPoolData = useCallback(async () => {
    try {
      const abi = [
        {
          inputs: [],
          name: 'slot0',
          outputs: [
            { internalType: 'uint160', name: 'sqrtPriceX96', type: 'uint160' },
            { internalType: 'int24', name: 'tick', type: 'int24' },
            { internalType: 'uint16', name: 'observationIndex', type: 'uint16' },
            { internalType: 'uint16', name: 'observationCardinality', type: 'uint16' },
            { internalType: 'uint16', name: 'observationCardinalityNext', type: 'uint16' },
            { internalType: 'uint8', name: 'feeProtocol', type: 'uint8' },
            { internalType: 'bool', name: 'unlocked', type: 'bool' },
          ],
          stateMutability: 'view',
          type: 'function',
        },
      ];

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
        }) as Promise<[bigint, number, number, number, number, number, boolean]>,
      ]);

      const mainnetSqrtPrice = mainnetSlot0[0];
      const baseSqrtPrice = baseSlot0[0];

      // 2^96
      const Q96 = BigInt(2) ** BigInt(96);

      const calculatePriceMainnet = (sqrtPriceX96: bigint): number => {
        const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
        const rawPrice = sqrtPrice ** 2;
        return Math.round(rawPrice * 1e-12 * 1e18);
      };

      const calculatePriceBase = (sqrtPriceX96: bigint): number => {
        const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
        const rawPrice = sqrtPrice ** 2;
        return Math.round((1 / (rawPrice * 1e12)) * 1e18);
      };

      const mainnetPriceValue = calculatePriceMainnet(BigInt(mainnetSqrtPrice));
      const basePriceValue = calculatePriceBase(BigInt(baseSqrtPrice));

      // Add fallback values if calculation fails on mobile
      if (!mainnetPriceValue || isNaN(mainnetPriceValue)) {
        console.log('Setting fallback mainnet price');
        setMainnetPrice('1000000000000000000');
      } else {
        setMainnetPrice(mainnetPriceValue.toString());
      }
      
      if (!basePriceValue || isNaN(basePriceValue)) {
        console.log('Setting fallback base price');
        setBasePrice('1000000000000000000');
      } else {
        setBasePrice(basePriceValue.toString());
      }
      
      // Ensure price difference is calculated and set
      const lowerPrice = Math.min(mainnetPriceValue || 0, basePriceValue || 0);
      const higherPrice = Math.max(mainnetPriceValue || 0, basePriceValue || 0);
      const diff = Math.max(1, Math.floor(higherPrice / SCALING_FACTOR) - Math.floor(lowerPrice / SCALING_FACTOR));
      console.log('Calculated price difference:', diff);
      setPriceDiff(diff.toString());
    } catch (error) {
      console.error('Error fetching pool data:', error);
      // Set fallback values on error
      setMainnetPrice('1000000000000000000');
      setBasePrice('1000000000000000000');
      setPriceDiff('10'); // Default difference
      notifications.show({
        message: 'Error fetching pool prices, using fallback values',
        color: 'orange',
      });
    }
  }, [mainnetClient, baseClient, SCALING_FACTOR]);

  // Show connect button after 1 second
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConnectButton(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Generate proof & transaction
  const handleGenerateProofSendTransaction = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = {
      price1: mainnetPrice,
      price2: basePrice,
      threshold: threshold,
    };
    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    try {
      const res = await axios.post('/api/generate_proof', data, config);
      notifications.show({
        message: 'Proof generated successfully! Submitting transaction...',
        color: 'green',
      });

      const { proof, publicSignals } = res.data;
      setProofData(JSON.stringify(proof, null, 2));
      setPublicSignalsData(JSON.stringify(publicSignals, null, 2));

      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('No Ethereum wallet found. Please install MetaMask or similar wallet.');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const { chainId } = await provider.getNetwork();
      if (chainId !== 84532) {
        alert('Please switch your wallet network to Base Sepolia.');
        return;
      }

      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();

      const txResult = await executeTransaction(proof, publicSignals, signer);
      const txHash = txResult.transactionHash;

      // Create a div element to be shown as a modal
      const ModalContent = (
        <div className="transaction-modal">
          <div className="modal-content">
            <div className="modal-header">
              <Title order={3} className="matrix-text">Transaction Successful</Title>
              <button 
                className="close-button" 
                onClick={() => notifications.hide(notificationId)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <Text size="md" mb="md">
                Your proof has been successfully verified and the transaction has been processed.
              </Text>
              <Text size="sm">
                View on Base Sepolia:{' '}
                <a
                  href={`${BASE_EXPLORER_URL}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="matrix-link"
                >
                  {txHash.slice(0, 6)}...{txHash.slice(-4)}
                </a>
              </Text>
            </div>
          </div>
        </div>
      );

      // Show the modal notification
      const notificationId = notifications.show({
        id: `tx-${txHash}`,
        message: ModalContent,
        autoClose: false,
        withCloseButton: false,
        withBorder: false,
        className: "notification-container",
        styles: {
          root: { backgroundColor: 'transparent', boxShadow: 'none' }
        }
      });
    } catch (err: unknown) {
      const statusCode = (err as AxiosError).response?.status;
      const errorMsg = ((err as AxiosError).response?.data as { error?: string })?.error || 'Unknown error';
      
      const ErrorModal = (
        <div className="transaction-modal error-modal">
          <div className="modal-content">
            <div className="modal-header">
              <Title order={3} className="error-text">Transaction Failed</Title>
              <button 
                className="close-button" 
                onClick={() => notifications.clean()}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <Text size="md">
                Error {statusCode}: {errorMsg}
              </Text>
            </div>
          </div>
        </div>
      );

      notifications.show({
        message: ErrorModal,
        autoClose: false,
        withCloseButton: false,
        withBorder: false,
        className: "notification-container",
        styles: {
          root: { backgroundColor: 'transparent', boxShadow: 'none' }
        }
      });
    }
  };

  const handleFetchLatestPrices = () => {
    fetchPoolData();
  };

  // Update the condition check to be more reliable
  const isThresholdMet = useCallback(() => {
    const diffNum = Number(priceDiff);
    const thresholdNum = Number(threshold);
    
    // Verbose logging
    console.log('Connection status:', isConnected);
    console.log('Price difference:', diffNum, typeof diffNum);
    console.log('Threshold:', thresholdNum, typeof thresholdNum);
    console.log('Is mobile:', isMobileDevice);
    
    // More lenient condition for mobile
    if (isMobileDevice) {
      return thresholdNum > 0 && (diffNum >= thresholdNum || diffNum === 0);
    }
    
    // Standard condition for desktop
    return isConnected && 
           !isNaN(diffNum) && 
           !isNaN(thresholdNum) && 
           diffNum >= thresholdNum && 
           thresholdNum > 0;
  }, [isConnected, priceDiff, threshold, isMobileDevice]);

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      {/* Matrix digital rain background */}
      <div className="matrix-background">
        <canvas id="matrix-canvas" className="matrix-canvas"></canvas>
      </div>

      {/* Hero Section */}
      <Box className="heroSection">
        <Container size="lg">
          <div className="hero-text-container">
            <Title className="heroTitle glow-text">Uniswap Price Discrepancy Prover</Title>
            <Text size="lg" className="heroSubtitle matrix-text">
              Seamlessly prove a price gap between USDC pools on Mainnet and Base. 
              Keep actual prices private—only submit a zero-knowledge proof.
            </Text>
          </div>
        </Container>
      </Box>

      {/* Main Content */}
      <Container size="md" mb="xl">
        <Paper shadow="md" radius="md" className="contentCard terminal-panel">
          {/* Author Info Card */}
          <div className="author-card">
            <div className="author-image-container">
              <img src="/matrix.png" alt="David Nallapu" className="author-image" />
            </div>
            <div className="author-social-links">
              <a href="https://www.linkedin.com/in/davidnallapu/" target="_blank" rel="noopener noreferrer" className="social-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
              <a href="https://github.com/davidnallapu" target="_blank" rel="noopener noreferrer" className="social-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
              <a href="https://x.com/dave2peer" target="_blank" rel="noopener noreferrer" className="social-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
                </svg>
              </a>
            </div>
          </div>

          <Group justify="space-between" mb="lg" className="divider terminal-header">
            <div>
              <Title order={3} mb="xs" className="matrix-text">
                Smart Contract Addresses
              </Title>
              <Text size="sm" className="code-text">
                Proxy:{' '}
                <a
                  href={`${BASE_EXPLORER_URL}/address/${Addresses.PRICE_DISCREPANCY_PROXY_ADDR}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="matrix-link"
                >
                  {Addresses.PRICE_DISCREPANCY_PROXY_ADDR}
                </a>
              </Text>
              <Text size="sm" className="code-text">
                Implementation:{' '}
                <a
                  href={`${BASE_EXPLORER_URL}/address/${Addresses.PRICE_DISCREPANCY_IMPLEMENTATION_ADDR}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="matrix-link"
                >
                  {Addresses.PRICE_DISCREPANCY_IMPLEMENTATION_ADDR}
                </a>
              </Text>
              <Text size="sm" className="code-text">
                Verifier:{' '}
                <a
                  href={`${BASE_EXPLORER_URL}/address/${Addresses.PLONK_VERIFIER_ADDR}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="matrix-link"
                >
                  {Addresses.PLONK_VERIFIER_ADDR}
                </a>
              </Text>
              <Text size="sm" className="code-text">
                Deployer:{' '}
                <a
                  href={`${BASE_EXPLORER_URL}/address/${Addresses.PRICE_DISCREPANCY_DEPLOYER_ADDR}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="matrix-link"
                >
                  {Addresses.PRICE_DISCREPANCY_DEPLOYER_ADDR}
                </a>
              </Text>
            </div>
            <div className="wallet-button-container">
              {showConnectButton && <ConnectWalletButton />}
            </div>
          </Group>

          <Text color="dimmed" size="sm" mb="xl" className="code-text pool-addresses">
            Mainnet Pool: 0xE0554a476A092703abdB3Ef35c80e0D76d32939F <br />
            Base Pool: 0xd0b53D9277642d899DF5C87A3966A349A798F224
          </Text>

          {/* Form */}
          <form onSubmit={handleGenerateProofSendTransaction}>
            <Stack gap="md">
              <TextInput
                label="Mainnet USDC Pool Price (wei)"
                value={mainnetPrice}
                readOnly
                radius="md"
                classNames={{ 
                  input: "terminal-input", 
                  label: "terminal-label"
                }}
              />
              <TextInput
                label="Mainnet USDC Pool Price (scaled)"
                value={Math.floor(Number(mainnetPrice) / SCALING_FACTOR)}
                readOnly
                radius="md"
                classNames={{ 
                  input: "terminal-input", 
                  label: "terminal-label"
                }}
              />
              <TextInput
                label="Base USDC Pool Price (wei)"
                value={basePrice}
                readOnly
                radius="md"
                classNames={{ 
                  input: "terminal-input", 
                  label: "terminal-label"
                }}
              />
              <TextInput
                label="Base USDC Pool Price (scaled)"
                value={Math.floor(Number(basePrice) / SCALING_FACTOR)}
                readOnly
                radius="md"
                classNames={{ 
                  input: "terminal-input", 
                  label: "terminal-label"
                }}
              />
              <TextInput 
                label="Price Difference" 
                value={priceDiff} 
                readOnly 
                radius="md" 
                classNames={{ 
                  input: "terminal-input", 
                  label: "terminal-label"
                }}
              />
              <TextInput
                label="Price Difference Threshold(Threshold must be ≤ price difference)"
                placeholder="Enter threshold value"
                value={threshold}
                onChange={(e) => setThreshold(e.currentTarget.value)}
                radius="md"
                classNames={{ 
                  input: "terminal-input", 
                  label: "terminal-label"
                }}
                description={
                  Number(priceDiff) < Number(threshold)
                    ? 'Warning: Current price difference is less than threshold'
                    : ''
                }
                error={
                  Number(priceDiff) < Number(threshold)
                    ? 'Proof will fail - decrease threshold or wait for a larger price difference'
                    : ''
                }
              />

              {/* Proof Data */}
              {proofData && (
                <div>
                  <Title order={5} className="matrix-text">Generated Proof as call data</Title>
                  <div className="proofBox terminal-output">{proofData}</div>
                </div>
              )}

              {publicSignalsData && (
                <div>
                  <Title order={5} className="matrix-text">Public Signals</Title>
                  <div className="proofBox terminal-output">{publicSignalsData}</div>
                </div>
              )}

              <Button 
                type="submit"
                size="md"
                variant="filled"
                color="matrix"
                fullWidth
                disabled={!isThresholdMet()}
                title={!isThresholdMet() ? `Connection: ${isConnected}, Diff: ${priceDiff}, Threshold: ${threshold}` : ''}
                className="actionButton matrix-button glow-effect"
                onClick={(e) => {
                  // Add click logging
                  console.log('Button clicked');
                  if (!isThresholdMet()) {
                    e.preventDefault();
                    notifications.show({
                      message: `Connection: ${isConnected}, Diff: ${priceDiff}, Threshold: ${threshold}`,
                      color: 'orange',
                    });
                  }
                }}
              >
                Generate Proof &amp; Send Transaction
              </Button>

              {isMobileDevice && (
                <Button 
                  onClick={() => {
                    console.log('Debug values:', {
                      connected: isConnected,
                      mainnetPrice,
                      basePrice,
                      priceDiff,
                      threshold
                    });
                    setPriceDiff('15'); // Force a value
                    notifications.show({
                      message: `Set price diff to 15, threshold: ${threshold}`,
                      color: 'green',
                    });
                  }}
                  size="sm"
                  variant="outline"
                  color="matrix"
                  className="debug-button"
                  mt="xs"
                >
                </Button>
              )}

              <Button 
                onClick={handleFetchLatestPrices} 
                size="md" 
                variant="outline"
                color="matrix"
                fullWidth
                className="actionButton matrix-button-outline"
              >
                Fetch Latest Prices
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
      
      {/* Matrix digital rain script */}
      <script dangerouslySetInnerHTML={{
        __html: `
          document.addEventListener('DOMContentLoaded', function() {
            const canvas = document.getElementById('matrix-canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            const matrixChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@&%*+=-*/\\|<>[]{}()「」『』";
            const fontSize = 14;
            const columns = Math.floor(canvas.width / fontSize);
            const drops = [];
            
            for (let i = 0; i < columns; i++) {
              drops[i] = Math.random() * -100;
            }
            
            function draw() {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              ctx.fillStyle = '#00FF41';
              ctx.font = fontSize + 'px monospace';
              
              for (let i = 0; i < drops.length; i++) {
                const text = matrixChars[Math.floor(Math.random() * matrixChars.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                  drops[i] = 0;
                }
                
                drops[i]++;
              }
            }
            
            setInterval(draw, 40);
            
            window.addEventListener('resize', function() {
              canvas.width = window.innerWidth;
              canvas.height = window.innerHeight;
              drops.length = 0;
              for (let i = 0; i < Math.floor(canvas.width / fontSize); i++) {
                drops[i] = Math.random() * -100;
              }
            });
          });
        `
      }}/>

      <style jsx global>{`
        body {
          background-color: #000;
          color: #00FF41;
          font-family: 'Courier New', monospace;
          margin: 0;
          padding: 0;
          min-height: 100vh;
          overflow-x: hidden;
        }
        
        .matrix-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: -1;
          overflow: hidden;
        }
        
        .matrix-canvas {
          display: block;
          position: absolute;
          top: 0;
          left: 0;
        }
        
        .heroSection {
          padding: 5rem 0 3rem;
          text-align: center;
          position: relative;
        }
        
        .hero-text-container {
          background-color: rgba(0, 0, 0, 0.7);
          padding: 2rem;
          border-radius: 1rem;
          backdrop-filter: blur(5px);
          border: 1px solid rgba(0, 255, 65, 0.3);
          box-shadow: 0 0 20px rgba(0, 255, 65, 0.2);
        }
        
        .heroTitle {
          font-size: 3rem;
          margin-bottom: 1.5rem;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          text-shadow: 0 0 15px rgba(0, 255, 65, 1), 0 0 30px rgba(0, 255, 65, 0.8);
        }
        
        .heroSubtitle {
          opacity: 0.9;
          max-width: 700px;
          margin: 0 auto;
          font-size: 1.2rem;
          text-shadow: 0 0 10px rgba(0, 255, 65, 0.8);
          font-weight: 500;
        }
        
        .contentCard {
          background-color: rgba(0, 10, 2, 0.85) !important;
          border: 1px solid #00FF41 !important;
          padding: 2rem;
          margin-bottom: 2rem;
          backdrop-filter: blur(10px);
        }
        
        .terminal-panel {
          box-shadow: 0 0 15px rgba(0, 255, 65, 0.5) !important;
        }
        
        .terminal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid #00FF41;
          padding-bottom: 1rem;
        }
        
        .terminal-input {
          background-color: rgba(0, 20, 5, 0.7) !important;
          color: #00FF41 !important;
          border: 1px solid #00FF41 !important;
          font-family: 'Courier New', monospace !important;
          caret-color: #00FF41;
          word-break: break-all;
        }
        
        .terminal-label {
          color: #CCFFDB !important;
          font-family: 'Courier New', monospace !important;
          margin-bottom: 0.3rem;
          font-size: 14px !important;
        }
        
        .terminal-output {
          background-color: rgba(0, 20, 5, 0.7) !important;
          color: #00FF41 !important;
          border: 1px solid #00FF41 !important;
          font-family: 'Courier New', monospace !important;
          padding: 1rem;
          border-radius: 4px;
          white-space: pre-wrap;
          overflow-x: auto;
          max-height: 300px;
          overflow-y: auto;
        }
        
        .matrix-text {
          color: #00FF41 !important;
          text-shadow: 0 0 5px rgba(0, 255, 65, 0.7);
        }
        
        .code-text {
          font-family: 'Courier New', monospace !important;
          color: #00FF41 !important;
          word-break: break-all;
          overflow-wrap: break-word;
        }
        
        .glow-text {
          color: #00FF41 !important;
          text-shadow: 0 0 10px rgba(0, 255, 65, 0.8), 0 0 20px rgba(0, 255, 65, 0.5);
          animation: pulse 2s infinite alternate;
        }
        
        @keyframes pulse {
          from {
            text-shadow: 0 0 10px rgba(0, 255, 65, 0.8), 0 0 20px rgba(0, 255, 65, 0.5);
          }
          to {
            text-shadow: 0 0 15px rgba(0, 255, 65, 1), 0 0 30px rgba(0, 255, 65, 0.8);
          }
        }
        
        .matrix-button {
          background-color: #00B22E !important;
          color: #000 !important;
          font-weight: bold !important;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: all 0.3s ease !important;
          border: none !important;
          padding: 12px !important;
        }
        
        .matrix-button:hover:not(:disabled) {
          background-color: #00FF41 !important;
          box-shadow: 0 0 15px rgba(0, 255, 65, 0.8) !important;
          transform: translateY(-2px);
        }
        
        .matrix-button:disabled {
          background-color: rgba(0, 178, 46, 0.5) !important;
          color: rgba(0, 0, 0, 0.7) !important;
        }
        
        .matrix-button-outline {
          background-color: transparent !important;
          color: #00FF41 !important;
          border: 1px solid #00FF41 !important;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: all 0.3s ease !important;
        }
        
        .matrix-button-outline:hover {
          background-color: rgba(0, 255, 65, 0.1) !important;
          box-shadow: 0 0 15px rgba(0, 255, 65, 0.5) !important;
        }
        
        .matrix-link {
          color: #50FF8A !important;
          text-decoration: none !important;
          transition: all 0.3s ease;
          border-bottom: 1px dashed #00B22E;
        }
        
        .matrix-link:hover {
          color: #00FF41 !important;
          text-shadow: 0 0 8px rgba(0, 255, 65, 0.8);
          border-bottom: 1px solid #00FF41;
        }
        
        .glow-effect {
          position: relative;
        }
        
        .glow-effect::after {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          z-index: -1;
          border-radius: inherit;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .glow-effect:hover::after {
          opacity: 1;
          box-shadow: 0 0 20px 5px rgba(0, 255, 65, 0.7);
        }
        
        .pool-addresses {
          opacity: 0.7;
        }
        
        .proofBox {
          margin-top: 0.5rem;
          margin-bottom: 1.5rem;
        }
        
        .divider {
          position: relative;
        }
        
        .wallet-button-container {
          align-self: flex-start;
          margin-top: 0.5rem;
        }
        
        /* Modal notification styles */
        .notification-container {
          width: 100vw !important;
          max-width: 100vw !important;
          height: 100vh !important;
          max-height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
          top: 0 !important;
          left: 0 !important;
          position: fixed !important;
          z-index: 9999 !important;
        }
        
        .transaction-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
          backdrop-filter: blur(5px);
        }
        
        .modal-content {
          background-color: rgba(0, 20, 5, 0.95);
          border: 2px solid #00FF41;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 0 30px rgba(0, 255, 65, 0.7);
          animation: glow-pulse 2s infinite alternate;
        }
        
        @keyframes glow-pulse {
          from { box-shadow: 0 0 20px rgba(0, 255, 65, 0.6); }
          to { box-shadow: 0 0 40px rgba(0, 255, 65, 0.9); }
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #00FF41;
        }
        
        .modal-body {
          padding: 1.5rem;
        }
        
        .close-button {
          background: none;
          border: none;
          color: #00FF41;
          font-size: 1.5rem;
          cursor: pointer;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.3s ease;
        }
        
        .close-button:hover {
          background-color: rgba(0, 255, 65, 0.2);
          transform: scale(1.1);
        }
        
        .error-modal .modal-content {
          border-color: #ff3e3e;
          box-shadow: 0 0 30px rgba(255, 62, 62, 0.7);
        }
        
        .error-modal .modal-header {
          border-bottom-color: #ff3e3e;
        }
        
        .error-modal .close-button {
          color: #ff3e3e;
        }
        
        .error-modal .close-button:hover {
          background-color: rgba(255, 62, 62, 0.2);
        }
        
        .error-text {
          color: #ff3e3e !important;
          text-shadow: 0 0 10px rgba(255, 62, 62, 0.8);
        }
        
        /* Author card styles */
        .author-card {
          position: absolute;
          top: 110px;
          right: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          background-color: rgba(0, 10, 2, 0.85);
          border: 1px solid #00FF41;
          border-radius: 8px;
          padding: 1rem;
          box-shadow: 0 0 15px rgba(0, 255, 65, 0.5);
          z-index: 10;
          animation: glow-pulse 2s infinite alternate;
        }
        
        .author-image-container {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid #00FF41;
          box-shadow: 0 0 10px rgba(0, 255, 65, 0.8);
          margin-bottom: 1rem;
        }
        
        .author-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: sepia(20%) hue-rotate(90deg) brightness(1.1) contrast(1.1);
          transition: all 0.3s ease;
        }
        
        .author-image:hover {
          filter: sepia(0%) hue-rotate(0deg) brightness(1) contrast(1);
          transform: scale(1.05);
        }
        
        .author-social-links {
          display: flex;
          flex-direction: row;
          gap: 12px;
          justify-content: center;
        }
        
        .social-link {
          color: #00FF41;
          text-decoration: none;
          padding: 8px;
          border: 1px solid #00FF41;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          background-color: rgba(0, 255, 65, 0.1);
          position: relative;
          overflow: hidden;
        }
        
        .social-link::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(0, 255, 65, 0.2),
            transparent
          );
          transition: all 0.6s ease;
        }
        
        .social-link:hover {
          background-color: rgba(0, 255, 65, 0.2);
          box-shadow: 0 0 15px rgba(0, 255, 65, 0.5);
          transform: translateY(-2px);
        }
        
        .social-link:hover::before {
          left: 100%;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .author-card {
            position: static;
            margin: 0 auto 20px auto;
            width: auto;
            max-width: 250px;
            padding: 10px;
          }
          
          .author-image-container {
            width: 60px;
            height: 60px;
            margin-bottom: 0.5rem;
          }
          
          .author-social-links {
            flex-direction: row;
            justify-content: center;
            gap: 10px;
          }
          
          .social-link {
            width: 30px;
            height: 30px;
            padding: 5px;
          }
          
          .contentCard {
            padding: 1rem !important;
          }
          
          .terminal-header {
            flex-direction: column;
            align-items: center;
          }
          
          .wallet-button-container {
            margin-top: 1rem;
            width: 100%;
            display: flex;
            justify-content: center;
          }
          
          .pool-addresses {
            word-break: break-all;
          }
          
          /* Make buttons more prominent on mobile */
          .actionButton {
            height: 60px !important;
            margin-top: 25px !important;
            margin-bottom: 25px !important;
          }
          
          /* Give more space at the bottom for buttons */
          form {
            padding-bottom: 30px;
          }
          
          /* Fix text size on mobile */
          .terminal-label {
            font-size: 14px !important;
          }
          
          .terminal-input {
            font-size: 14px !important;
          }
        }
        
        /* Fix for mobile buttons */
        .matrix-button:active {
          transform: scale(0.98);
          background-color: #00D938 !important;
        }
        
        /* Ensure button is visibly enabled/disabled */
        .matrix-button:disabled {
          opacity: 0.5 !important;
          background-color: rgba(0, 178, 46, 0.5) !important;
          color: rgba(0, 0, 0, 0.7) !important;
        }
        
        .matrix-button:not(:disabled) {
          opacity: 1 !important;
          cursor: pointer !important;
        }
        
        /* Mobile fixes */
        @media (max-width: 768px) {
          /* Make wallet connection more prominent */
          .wallet-button-container {
            margin: 20px auto;
            width: 100%;
          }
          
          /* Improve button tap targets for mobile */
          .actionButton {
            height: 60px !important;
            margin-top: 25px !important;
            margin-bottom: 25px !important;
            -webkit-tap-highlight-color: rgba(0, 255, 65, 0.3) !important;
          }
          
          /* Fix top spacing */
          .contentCard {
            margin-top: 20px !important;
          }
          
          /* Make sure the form is properly spaced */
          form {
            padding-bottom: 50px;
          }
        }
      `}</style>
    </MantineProvider>
  );
}
