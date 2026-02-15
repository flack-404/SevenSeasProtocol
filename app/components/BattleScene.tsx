import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { RenderShip } from "./RenderShip";
import { Ship } from "./ShipArea";
import { Icon } from "./Icons";
import { PlayerAccount } from "@/lib/contracts";

// This modal is a little animation that shows the battle between two ships. After 10 seconds, it closes.

export const BattleScene = ({ship1, ship2, dmgShip1, dmgShip2, onClose, isOpen}: {ship1: Ship, ship2: Ship, dmgShip1: number, dmgShip2: number, onClose: () => void, isOpen: boolean}) => {
    const [ship1Damage, setShip1Damage] = useState<number | null>(null);
    const [ship2Damage, setShip2Damage] = useState<number | null>(null);
    const [ship1ExplosionUrl, setShip1ExplosionUrl] = useState<string | null>(null);
    const [ship2ExplosionUrl, setShip2ExplosionUrl] = useState<string | null>(null);

    const RenderDamage = (damage: number | null, explosionUrl: string | null) => {
        if (damage === null) return null;
        
        return (
            <>
                <div className="text-red-500 absolute damage-animation top-0 left-[50%] translate-x-[-50%] text-shadow-full-outline">
                    -{damage}
                </div>
                {explosionUrl && (
                    <img 
                        src={explosionUrl}
                        className="absolute bottom-0 left-[50%] z-10 translate-x-[-50%]"
                        alt="damage"
                        width={256}
                        height={256}
                    />
                )}
            </>
        );
    }

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setShip1Damage(null);
            setShip2Damage(null);
            setShip1ExplosionUrl(null);
            setShip2ExplosionUrl(null);
        }
    }, [isOpen]);

    // Handle ship2 damage (first animation)
    useEffect(() => {
        if (!isOpen) return;
        
        const timer = setTimeout(() => {
            // Add timestamp to force GIF reload
            setShip2ExplosionUrl(`/fx/explosion.gif?t=${Date.now()}`);
            setShip2Damage(dmgShip2);
        }, 2000);
        
        return () => clearTimeout(timer);
    }, [isOpen, dmgShip2]);
    
    // Handle ship1 damage (second animation)
    useEffect(() => {
        if (!isOpen) return;
        
        const timer = setTimeout(() => {
            // Add timestamp to force GIF reload
            setShip1ExplosionUrl(`/fx/explosion.gif?t=${Date.now()}`);
            setShip1Damage(dmgShip1);
        }, 5000);
        
        return () => clearTimeout(timer);
    }, [isOpen, dmgShip1]);
    
    // Handle battle completion
    useEffect(() => {
        if (!isOpen) return;
        
        const timer = setTimeout(() => {
            onClose();
        }, 7000);
        
        return () => clearTimeout(timer);
    }, [isOpen, onClose]);
    
    return (
        <Modal title="Battle" open={isOpen} setOpen={onClose}>
            <div className="bg-white w-full bg-[url('/sky.gif')] bg-[length:auto_780px] bg-center relative h-[400px] overflow-hidden border-3 border-black">
                <div className="absolute ui2 flex items-center justify-center gap-6 p-5 text-2xl text-center w-[90%] top-[24px] left-[50%] translate-x-[-50%]">
                    {ship1.name || "Unnamed Boat"} <Icon iconName="swords" /> {ship2.name || "Unnamed Boat"}
                </div>
                <div className="w-screen h-[256px] absolute bottom-5 left-0 flex flex-col items-center justify-center bg-[url('/ocean_l2.gif')] opacity-50 scale-x-[-100%] bg-[length:512px_256px] bg-bottom bg-repeat-x" />
                <div className="grid grid-cols-2 gap-4 align-bottom">
                    <div className="absolute bottom-10 left-0">
                        {RenderDamage(ship1Damage, ship1ExplosionUrl)}
                        <RenderShip ship={ship1} />
                    </div>
                    <div className="absolute bottom-10 right-0 transform">
                        {RenderDamage(ship2Damage, ship2ExplosionUrl)}
                        <div className="scale-x-[-1]"><RenderShip ship={ship2} /></div>
                    </div>
                </div>
                <div className="w-screen h-[64px] absolute bottom-0 left-0 flex flex-col items-center justify-center bg-[url('/ocean_l1.gif')] bg-[length:512px_64px] bg-top bg-repeat-x" />
            </div>
        </Modal>
    );
};
