"use client";

import { getContract } from "thirdweb";
import { useThirdweb } from "./useThirdweb";

/**
 * Hook to get the MantleArmada contract instance (updated for Mantle network)
 * Returns the contract ready for read/write operations
 */
export function useSeasOfLinkardiaContract() {
  const { client, activeChain, isMainnet, isTestnet } = useThirdweb();

  // Get contract address based on network - now using Mantle addresses
  const getContractAddress = () => {
    // Always use the main game contract address
    return process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS;
  };

  const contractAddress = getContractAddress();

  // Return contract instance if address is available
  if (!contractAddress) {
    console.warn(`Contract address not set for current network: ${activeChain.name}`);
    return null;
  }

  const contract = getContract({
    client,
    chain: activeChain,
    address: contractAddress,
  });

  return {
    contract,
    contractAddress,
    isMainnet,
    isTestnet,
    networkName: activeChain.name,
  };
}

/**
 * Backward compatibility hook - redirects to Mantle contract
 * NOTE: This maintains compatibility with existing components
 * New code should use hooks from useContracts.ts instead
 */
export function useGameContract() {
  const contractData = useSeasOfLinkardiaContract();
  const { isConnected, account } = useThirdweb();

  if (!contractData || !isConnected) {
    return {
      contract: null,
      isReady: false,
      ...contractData,
    };
  }

  return {
    ...contractData,
    isReady: true,
    playerAddress: account?.address,
  };
} 