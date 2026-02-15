"use client";

import { useActiveAccount, useActiveWallet, useWalletBalance } from "thirdweb/react";
import { client, monadMainnet, monadTestnet, getActiveChain } from "../providers/thirdweb-provider";

/**
 * Custom hook to simplify Thirdweb usage in the Seven Seas Protocol app
 */
export function useThirdweb() {
  const account = useActiveAccount();
  const wallet = useActiveWallet();

  const activeChain = getActiveChain();

  const { data: balance, isLoading: isLoadingBalance } = useWalletBalance({
    client,
    chain: activeChain,
    address: account?.address,
  });

  const isConnected = !!account && !!wallet;
  const address = account?.address;
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null;

  const isMainnet = activeChain.id === monadMainnet.id;
  const isTestnet = activeChain.id === monadTestnet.id;

  const networkName = isMainnet ? "Monad Mainnet" : "Monad Testnet";
  const explorerUrl = isMainnet
    ? "https://monadexplorer.com"
    : "https://testnet.monadexplorer.com";

  return {
    isConnected,
    account,
    wallet,
    address,
    shortAddress,
    balance,
    isLoadingBalance,
    activeChain,
    isMainnet,
    isTestnet,
    networkName,
    explorerUrl,
    client,
    chains: {
      mainnet: monadMainnet,
      testnet: monadTestnet,
    },
  };
}
