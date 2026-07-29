import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { CHAIN_ID } from "@/constants";

export const useWallet = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  const checkConnection = useCallback(async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts && accounts.length > 0) {
          setAddress(accounts[0]);
        }
        
        try {
          const chain = await window.ethereum.request({ method: "eth_chainId" });
          setChainId(parseInt(chain, 16));
        } catch(e) {}
      } catch (error) {
        console.error("Error checking wallet connection", error);
      }
    }
    setIsInitializing(false);
  }, []);

  // Fetch balance whenever address changes
  const fetchBalance = useCallback(async (addr: string) => {
    if (typeof window === "undefined" || !window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const bal = await provider.getBalance(addr);
      setBalance(ethers.formatEther(bal));
    } catch (err) {
      console.error("Failed to fetch balance", err);
      setBalance(null);
    }
  }, []);

  useEffect(() => {
    if (address) fetchBalance(address);
    else setBalance(null);
  }, [address, fetchBalance]);

  useEffect(() => {
    checkConnection();

    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) setAddress(accounts[0]);
        else setAddress(null);
      });
      
      window.ethereum.on("chainChanged", (_chainId: string) => {
        setChainId(parseInt(_chainId, 16));
        window.location.reload();
      });
    }

    return () => {
      if (typeof window !== "undefined" && window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged");
        window.ethereum.removeAllListeners("chainChanged");
      }
    };
  }, [checkConnection]);

  const connect = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAddress(accounts[0]);
      
      const chain = await window.ethereum.request({ method: "eth_chainId" });
      setChainId(parseInt(chain, 16));
    } catch (error) {
      console.error("Failed to connect wallet", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setChainId(null);
    setBalance(null);
  };

  const switchNetwork = async () => {
    if (!window.ethereum) return;
    
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: `0x${CHAIN_ID.toString(16)}`,
              chainName: "Polygon Amoy Testnet",
              rpcUrls: ["https://rpc-amoy.polygon.technology"], // RPC publik: lebih kompatibel untuk didaftarkan ke wallet daripada URL Alchemy ber-API-key
              nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
              blockExplorerUrls: [process.env.NEXT_PUBLIC_POLYGONSCAN_URL]
            }],
          });
        } catch (addError) {
          console.error("Failed to add network", addError);
        }
      }
    }
  };

  const isConnected = !!address;
  const isCorrectNetwork = chainId === CHAIN_ID;

  return {
    address,
    balance,
    isConnected,
    isConnecting,
    isInitializing,
    chainId,
    isCorrectNetwork,
    connect,
    disconnect,
    switchNetwork,
  };
};
