import Image from "next/image";
import { useThirdweb } from "../libs/hooks/useThirdweb";
import { useState } from "react";
import { TravelModal } from "./TravelModal";
import { usePlayer } from "../libs/providers/player-provider";
import { PlayerStatsSection } from "./PlayerStatsSection";
import { ShipStatsSection } from "./ShipStatsSection";
import { ShipActionsSection } from "./ShipActionsSection";
import { ShipUpgradesSection } from "./ShipUpgradesSection";
import { DailyCheckInSection } from "./DailyCheckInSection";
import { DiamondPurchaseModal } from "./DiamondPurchaseModal";
import { RepairModal } from "./RepairModal";
const NamePlate = ({ boatName }: { boatName: string }) => {
  return (
    <div className="absolute text-white top-[-50px] left-[-50px] bg-[url('/parchment.webp')] capitalize text-shadow-full-outline !text-2xl flex items-center justify-center bg-no-repeat bg-[length:auto_90px] bg-center w-[384px] h-[90px]">
      {boatName || "Unnamed boat"}
    </div>
  );
};

const AffiliationFlag = ({
  affiliation,
  className,
}: {
  affiliation: "pirates" | "navy";
  className?: string;
}) => {
  return (
    <Image
      unoptimized
      src={`/flags/${affiliation}_flag.webp`}
      alt={affiliation}
      width={32}
      height={32}
      className={className}
    />
  );
};

const UserBoatPanelContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="max-w-[1680px] mx-auto  left-1/2 -translate-x-1/2 flex p-7 flex-col bottom-[20px]  w-[calc(100dvw-40px)] items-center justify-center  ui1 fixed h-[350px]">
      <div className="flex pt-[70px]  pl-[10px] flex-col items-center justify-start w-full h-full relative">
        {children}
      </div>
    </div>
  );
};

export default function UserBoatPanel() {
  const { isConnected, address } = useThirdweb();
  const {
    playerAccount,
    isLoading,
    error,
    refreshPlayerData,
    forceRefresh,
    setNotification,
  } = usePlayer();

  const [showTravelModal, setShowTravelModal] = useState(false);
  const [showDiamondModal, setShowDiamondModal] = useState(false);
  const [showRepairModal, setShowRepairModal] = useState(false);

  const handleTravelStart = () => {
    // Show travel notification
    setNotification("⛵ Setting sail! Updating ship status...");

    // Immediate refresh to show travel state
    refreshPlayerData();

    // Additional refresh after delay to ensure blockchain state is updated
    setTimeout(() => {
      //refresh the page
      window.location.reload();
    }, 1000);
  };

  const handleTravelComplete = () => {
    // Refresh player data when travel completes
    refreshPlayerData();
  };
  // Handle repair success
  const handleRepairSuccess = async () => {
    setNotification("✅ Repair initiated successfully!");
    await refreshPlayerData();
  };

  if (!isConnected || !address || !playerAccount) {
    return null;
  }

  if (isLoading) {
    return (
      <UserBoatPanelContainer>
        <div className="flex items-center justify-center w-full h-full">
          <div className="text-white text-lg">Loading ship data...</div>
        </div>
      </UserBoatPanelContainer>
    );
  }

  if (error) {
    return (
      <UserBoatPanelContainer>
        <div className="flex items-center justify-center w-full h-full">
          <div className="text-red-400 text-lg">{error}</div>
        </div>
      </UserBoatPanelContainer>
    );
  }

  return (
    <>
      <UserBoatPanelContainer>
        <NamePlate boatName={playerAccount.boatName} />
        <AffiliationFlag
          affiliation={playerAccount.isPirate ? "pirates" : "navy"}
          className="absolute top-[-50px] left-[290px] w-[90px] h-[90px]"
        />
        <div className="flex flex-col w-full md:mt-0">
          {/* PLAYER STATS */}
          <PlayerStatsSection setShowDiamondModal={setShowDiamondModal} />

          {/* SHIP STATS AND ACTIONS */}
          <div className="md:flex-row gap-3 flex-col flex w-full  [&>section]:!min-h-[220px]">
            {/* STATS */}
            <ShipStatsSection />

            {/* SHIP UPGRADES */}
            <ShipUpgradesSection />

            {/* ACTIONS */}
            <ShipActionsSection
              showTravelModal={showTravelModal}
              setShowTravelModal={setShowTravelModal}
              showRepairModal={showRepairModal}
              setShowRepairModal={setShowRepairModal}
              handleTravelComplete={handleTravelComplete}
            />
          </div>
        </div>

        {/* Travel Modal */}
      </UserBoatPanelContainer>

      <TravelModal
        isOpen={showTravelModal}
        onClose={() => setShowTravelModal(false)}
        currentLocation={playerAccount.location}
        onTravelStart={handleTravelStart}
      />

      <DailyCheckInSection />

      <DiamondPurchaseModal
        isOpen={showDiamondModal}
        onClose={() => setShowDiamondModal(false)}
      />

      {/* Repair Modal */}
      <RepairModal
        isOpen={showRepairModal}
        onClose={() => setShowRepairModal(false)}
        onRepairSuccess={handleRepairSuccess}
        playerAccount={playerAccount}
      />

    </>
  );
}
