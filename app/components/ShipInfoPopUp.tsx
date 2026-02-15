import { Icon } from "./Icons";
import { Ship } from "./ShipArea";

export const ShipInfoPopup = ({ship, selectedShip}: {ship: Ship, selectedShip: Ship | null}) => {
    return (
        <div className="hidden group-hover:block ui1 mt-2 p-6 text-center absolute min-w-[200px] z-20">
               <div className="flex items-center justify-center gap-2 mb-1">
               {ship.isPirate !== null && (
                   <Icon iconName={ship.isPirate ? "pirates" : "navy"} />
                 )}
                 <div className="text-white font-bold text-sm truncate" title={ship.name}>
                   {ship.name} (Lv.{ship.level})
                 </div>

               </div>
               <div className="text-gray-300 text-xs mt-1">
                 {ship.hp !== null && ship.maxHp !== null ? (
                   <>
                     HP: <span className={ship.hp > ship.maxHp * 0.5 ? 'text-green-400' : ship.hp > ship.maxHp * 0.2 ? 'text-yellow-400' : 'text-red-400'}>
                       {ship.hp}/{ship.maxHp}
                     </span>
                   </>
                 ) : (
                   <span className="text-gray-400">Loading HP...</span>
                 )}
               </div>
               <div className="text-gray-400 text-xs truncate" title={ship.address}>
                 {ship.address.slice(0, 6)}...{ship.address.slice(-4)}
               </div>
               {selectedShip?.address === ship.address && (
                 <div className="mt-2 text-yellow-400 text-xs animate-pulse flex items-center gap-2 justify-center">
                   <Icon iconName="swords" /> Selected
                 </div>
               )}
             </div>
    )
}