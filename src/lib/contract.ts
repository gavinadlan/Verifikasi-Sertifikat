import { ethers, BrowserProvider, JsonRpcProvider, Contract } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI, RPC_URL } from "@/constants";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const getProvider = (): BrowserProvider => {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No crypto wallet found. Please install MetaMask.");
  }
  return new ethers.BrowserProvider(window.ethereum);
};

export const getSigner = async () => {
  const provider = getProvider();
  return await provider.getSigner();
};

export const getContract = (signerOrProvider: ethers.Signer | ethers.Provider): Contract => {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
};

export const getReadOnlyContract = (): Contract => {
  const provider = new JsonRpcProvider(RPC_URL);
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
};
