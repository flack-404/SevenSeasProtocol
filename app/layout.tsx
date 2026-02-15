import type { Metadata } from "next";
import "./globals.css";
import localFont from 'next/font/local'
import { ThirdwebProviderWrapper } from "./libs/providers/thirdweb-provider";
import { PlayerProvider } from "./libs/providers/player-provider";
import { Toaster } from "sonner";
import { NotificationToaster } from "./components/NotificationToaster";
import { Logo } from "./components/Logo";

const Arcadepix = localFont({ src: './fonts/Arcadepix.woff', display: 'swap', weight: '400', style: 'normal' })


export const metadata: Metadata = {
  title: "Seven Seas Protocol",
  description: "Conquer the Seven Seas on Monad - A Fully On-Chain Naval Strategy Game with AI Agents",
  keywords: "blockchain game, NFT, pirates, naval strategy, Monad, MON, Web3, GameFi, AI agents, SEAS",
  authors: [{ name: "Seven Seas Protocol Team" }],
  openGraph: {
    title: "Seven Seas Protocol",
    description: "Conquer the Seven Seas on Monad - A Fully On-Chain Naval Strategy Game with AI Agents",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
          className={`${Arcadepix.className} antialiased`}
      >
        {/* Mobile Not Supported Message */}
        <div className="min-[1014px]:hidden flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 p-6">
          <div className="ui2 p-8 max-w-md w-full text-center">
            <div className="text-4xl mb-6 flex items-center justify-center"><Logo/></div>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
              Ahoy Captain! This game is not yet optimized for mobile screens. 
              Please use a desktop or laptop computer with a screen width of at least 1014px to enjoy the full gaming experience.
            </p>
            <div className="text-gray-400 text-xs">
              🖥️ Desktop Experience Required
            </div>
          </div>
        </div>

        {/* Desktop Game Content */}
        <div className="hidden min-[1014px]:block">
          <ThirdwebProviderWrapper>
            <PlayerProvider>
              {children}
              <NotificationToaster />
            </PlayerProvider>
          </ThirdwebProviderWrapper>
          <Toaster 
            position="top-center"
            richColors={false}
            closeButton
            duration={4000}
            toastOptions={{
              className: 'ui1 p-6',
              style: {
                fontSize: '14px',
                fontFamily: Arcadepix.style.fontFamily,
                background: `
                  url('/ui/ui2_bottom_right.png') no-repeat 100% 100%,
                  url('/ui/ui2_bottom_left.png') no-repeat 0 100%,
                  url('/ui/ui2_bottom_center.png') no-repeat 50% 100%,
                  url('/ui/ui2_top_right.png') no-repeat 100% 0,
                  url('/ui/ui2_top_left.png') no-repeat 0 0,
                  url('/ui/ui2_top_center.png') no-repeat 50% 0,
                  url('/ui/ui2_middle_left.png') no-repeat 0 50%,
                  url('/ui/ui2_middle_right.png') no-repeat 100% 50%,
                  url('/ui/ui2_middle_center.png') no-repeat 50% 50%
                `,
                backgroundSize: '32px 32px, 32px 32px, calc(100% - 61px) 32px, 32px 32px, 32px 32px, calc(100% - 61px) 32px, 32px calc(100% - 61px), 32px calc(100% - 61px), calc(100% - 61px) calc(100% - 61px)',
                filter: 'drop-shadow(5px 5px 0px rgba(0, 0, 0, 0.25))',
                border: 'none',
                borderRadius: '0',
                padding: '16px',
                color: 'white',
                minWidth: '300px',
              },
            }}
          />
        </div>
      </body>
    </html>
  );
}
