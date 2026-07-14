'use client';

import React from 'react';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/Button';

export const WalletConnectButton: React.FC = () => {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();

  if (isConnected && address) {
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    return (
      <Button variant="secondary" onClick={disconnect}>
        Disconnect ({shortAddress})
      </Button>
    );
  }

  return (
    <Button onClick={connect} isLoading={isConnecting}>
      Connect Wallet
    </Button>
  );
};
