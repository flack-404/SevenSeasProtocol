"use client";

import Image from "next/image";
import { ConnectButton } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { useThirdweb } from "../libs/hooks/useThirdweb";
import { Logo } from "./Logo";

// Configure supported wallets (SSO and MetaMask only as requested)
const wallets = [
  createWallet("io.metamask"), // MetaMask
  inAppWallet({
    auth: {
      options: ["google", "discord", "telegram", "farcaster", "email", "x", "coinbase", "apple", "facebook"],
    },
  }), // SSO options
];

export const Header = () => {
  const { isConnected, shortAddress, address, client, activeChain, networkName } = useThirdweb();

  return (
    <header className="flex items-start justify-between p-10 w-screen">
      {(isConnected && address) ? <Logo className="scale-80 origin-top-left"/> : <div className="h-[256px]"/>}
      
      {isConnected && address && <div className="flex items-center gap-4">
        
        <ConnectButton
          client={client}
          wallets={wallets}
          chain={activeChain}
          connectModal={{
            size: "wide",
            title: "Connect to Seven Seas Protocol",
            welcomeScreen: {
              title: "Welcome to Seven Seas Protocol",
              subtitle: "Connect your wallet to start your maritime adventure on Monad",
              img: {
                src: "/logo.png",
                width: 150,
                height: 150,
              },
            },
          }}
          theme="dark"
          detailsButton={{
            render: () => {
              
              return <button className="ui1 p-6 text-white">
                <div className="flex items-center gap-2"><div className="w-[10px] h-[10px] bg-green-300 "/>{address.slice(0, 6)}...{address.slice(-4)}</div>
              </button>
            },
          }}
          connectButton={{
            label: "Connect Wallet",
            style: {
              backgroundColor: "transparent",
              color: "black",
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontWeight: "500",
            },
          }}
        />
      </div>}
    </header>
  );
};
