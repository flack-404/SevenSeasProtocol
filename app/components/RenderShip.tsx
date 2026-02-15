import Image from "next/image";
import { Ship } from "./ShipArea";

export const RenderShip = ({
  ship,
  className,
}: {
  ship: Ship; //TODO: Change to correct type
  className?: string;
}) => {
  const level = ship.level;

  const ConvertShipFromLevel = (level: number) => {
    // 5 or less is 0

       // 6 or more is 1
       if (level >= 20) {
        return 2;
      }
      if (level >= 10) {
        return 1;
      }
      // 6 or more is 1
      if (level <= 9) {
        return 0;
      }
    return 0;
  };

  // Function to determine ship condition - only when HP data is available
  const getShipCondition = () => {
    // If HP data is not loaded yet, return null to show loading state
    if (ship.hp === null || ship.maxHp === null) {
      return null;
    }
    
    // If HP is 0 or less, ship is wrecked
    if (ship.hp <= 0) {
      return "wrecked";
    }
    
    // If HP is less than 50% of max HP, ship is damaged
    if (ship.hp < ship.maxHp * 0.5) {
      return "damaged";
    }
    
    // Otherwise, ship is healed
    return "healed";
  };

  const shipCondition = getShipCondition();

  return (
    <div className={`w-full ${className ? className : ""}  max-w-full flex relative flex-col items-center justify-start`}>
      {shipCondition && ship.isPirate !== null ? (
        // Render ship image only when we have all required data
        <Image
          src={`/ships/${ConvertShipFromLevel(level)}-${shipCondition}-${ship.isPirate ? "pirate" : "navy"}.gif`}
          alt="ship"
          width={256}
          height={256}
          className={`min-h-[256px] min-w-[256px] h-[256px] w-[256px] flex flex-col items-center justify-center floating-animation`}
        />
      ) : (
        // Show loading placeholder while data is being fetched
        <div className="min-h-[256px] min-w-[256px] h-[256px] w-[256px] flex flex-col items-center justify-center rounded-lg">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full"></div>
          <div className="text-white text-sm mt-2">Loading ship...</div>
        </div>
      )}
    </div>
  );
};
