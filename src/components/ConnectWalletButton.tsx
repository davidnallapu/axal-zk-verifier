declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum?: any;
  }
}

import { Button } from "@mantine/core"
import { Web3Provider } from '@ethersproject/providers';
import { useState, useEffect } from 'react';

export const ConnectWalletButton = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    checkConnection();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', checkConnection);
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', checkConnection);
      }
    }
  }, []);

  const checkConnection = async () => {
    try {
      const provider = new Web3Provider(window.ethereum);
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
      } else {
        setAddress(null);
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const handleClick = async (): Promise<void> => {
    if (isConnected) {
      setAddress(null);
      setIsConnected(false);
    } else {
      try {
        if (!window.ethereum) {
          alert('Please install MetaMask!');
          return;
        }
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Error connecting wallet:', error);
      }
    }
  }

  const renderConnectText = (): string => {
    if (isConnected && address) {
      const start = address.slice(0,6);
      const end = address.slice(address.length-4, address.length);
      return `${start}...${end}`;
    } else {
      return "Connect Wallet";
    }
  }
  
  return (
    <Button onClick={handleClick}>
      { renderConnectText() }
    </Button>
  )
}