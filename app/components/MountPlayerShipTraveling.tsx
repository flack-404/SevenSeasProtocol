import { PlayerAccount } from "@/lib/contracts";
import { Ship } from "./ShipArea";
import { useThirdweb } from "../libs/hooks/useThirdweb";
import { LocationInfo } from "./LocationInfo";
import { usePlayer } from "../libs/providers/player-provider";
import { RenderShip } from "./RenderShip";

export const MountPlayerShipTraveling = ({isTraveling, ships}: {isTraveling: boolean, ships: Ship[]}) => {
    const { address } = useThirdweb();
    const { playerAccount: playerAccountData } = usePlayer();
        const mountPlayerShip : Ship = {
      address: address || "",
      name: playerAccountData?.boatName || "",
      hp: Number(playerAccountData?.hp),
      maxHp: Number(playerAccountData?.maxHp), 
      level: Number(playerAccountData?.speed) + Number(playerAccountData?.attack) + Number(playerAccountData?.defense),
      isPirate: playerAccountData?.isPirate || false,
    }
    return playerAccountData && <>
    <LocationInfo isTraveling={isTraveling} location={playerAccountData?.location || 0} ships={ships} />

    <div className=" w-screen px-10 absolute bottom-[40px]">
       <div 
         className="grid gap-4 content-start justify-center"
         style={{
           gridTemplateColumns: `repeat(${Math.min(ships.length, 6)}, minmax(0, 1fr))`,
           maxWidth: '1200px',
           margin: '0 auto'
         }}
       >
        {mountPlayerShip && <RenderShip ship={mountPlayerShip} />}
        </div>
        </div>
    </>
}