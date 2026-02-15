"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import UserBoatPanel from "./components/UserBoatPanel";
import { Header } from "./components/Header";
import { RenderGameArea } from "./components/RenderGameArea";
import { MainContainer } from "./components/MainContainer";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { ShipArea } from "./components/ShipArea";
import { RankingSection } from "./components/RankingSection";
import { EcosystemDashboard } from "./components/EcosystemDashboard";
import { ReferralModal } from "./components/ReferralModal";
import { useThirdweb } from "./libs/hooks/useThirdweb";
import { usePlayer } from "./libs/providers/player-provider";
import Button from "./components/Button";

export default function Home() {
  const router = useRouter();
  const { isConnected } = useThirdweb();
  const { playerAccount } = usePlayer();
  const hasAccount = playerAccount !== null;
  const [showReferralModal, setShowReferralModal] = useState(false);

  // Only show ecosystem dashboard if connected and has account
  const showDashboard = isConnected && hasAccount;

  return (
    <MainContainer>
      <Header />
      <RenderGameArea>
        <ShipArea />
      </RenderGameArea>
      <UserBoatPanel />
      <RankingSection />
      <WelcomeScreen />

      {/* New Mantle Ecosystem Features Dashboard - Minimized Version */}
      {showDashboard && (
        <div className="fixed bottom-[380px] right-[20px] z-10 max-w-[280px]">
          <EcosystemDashboard />
        </div>
      )}

      {/* Agent Arena floating button */}
      {isConnected && (
        <div className="fixed bottom-[80px] left-[10px] z-10">
          <button
            onClick={() => router.push('/arena')}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-600 hover:to-purple-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg hover:scale-105 transition-all border border-indigo-500/40"
          >
            <span>⚔️</span>
            <span>Arena</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>
      )}

      {/* Invite Your Friends Button - Only show when user has account */}
      {showDashboard && (
        <div className="fixed bottom-[20px] right-[10px] z-10">
          <Button
            variant="primary"
            onClick={() => setShowReferralModal(true)}
            className="!px-6 !py-3 text-sm font-bold shadow-lg hover:scale-105 transition-transform"
          >
            🎁 Invite
          </Button>
        </div>
      )}

      {/* Referral Modal */}
      <ReferralModal
        isOpen={showReferralModal}
        onClose={() => setShowReferralModal(false)}
      />
    </MainContainer>
  );
}
