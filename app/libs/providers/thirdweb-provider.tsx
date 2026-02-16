"use client";

import { ThirdwebProvider } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { defineChain } from "thirdweb/chains";
import type { ReactNode } from "react";

interface ThirdwebProviderWrapperProps {
  children: ReactNode;
}

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

// Monad Mainnet
const monadMainnet = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://monadexplorer.com",
    },
  },
  testnet: false,
});

// Monad Testnet (RPC can be overridden for local Anvil fork)
const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Testnet Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
  testnet: true,
});

export function ThirdwebProviderWrapper({ children }: ThirdwebProviderWrapperProps) {
  if (!process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID) {
    console.error("NEXT_PUBLIC_THIRDWEB_CLIENT_ID is not set");
    return <>{children}</>;
  }

  return (
    <ThirdwebProvider>
      {children}
    </ThirdwebProvider>
  );
}

export { client, monadMainnet, monadTestnet };

export const getActiveChain = () => {
  const network = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
  return network === 'mainnet' ? monadMainnet : monadTestnet;
};
