import { useState, useEffect } from "react";
    import { usePlayer } from "../libs/providers/player-provider";

export const ShipStatsSection = () => {
    const { playerAccount, isWrecked, maxHp } = usePlayer();
    
    // Debug logging for component re-renders
    useEffect(() => {
      if (playerAccount) {
        console.log("ShipStatsSection re-rendered with stats:", {
          hp: playerAccount.hp,
          maxHp: playerAccount.maxHp,
          attack: playerAccount.attack,
          defense: playerAccount.defense,
          speed: playerAccount.speed,
          crew: playerAccount.crew,
          maxCrew: playerAccount.maxCrew,
        });
      }
    }, [playerAccount?.hp, playerAccount?.maxHp, playerAccount?.attack, playerAccount?.defense, playerAccount?.speed, playerAccount?.crew, playerAccount?.maxCrew]);

    return (
            <section className="flex flex-col  min-w-[200px] ui2 items-center justify-center p-6 h-full gap-2 text-white">
              <div className="flex flex-col [&_*]:!text-xl justify-center items-center w-full h-full">
                <div>
                  HP:{" "}
                  <span
                    className={`${
                      isWrecked
                        ? "text-red-600"
                        : (playerAccount?.hp || 0) <= 25
                        ? "text-red-400"
                        : "text-red-500"
                    }`}
                  >
                    {playerAccount?.hp}/{maxHp}
                  </span>
                  {isWrecked && (
                    <span className="text-red-600 ml-2">WRECKED!</span>
                  )}
                </div>
                <div>
                                     {[25, 55, 89].includes(playerAccount?.location || 0) && (
                     <span className="text-blue-400 ml-2">⚓ PORT</span>
                   )}
                </div>
                <div>
                  Level:{" "}
                  <span >{(playerAccount?.attack || 0) + (playerAccount?.defense || 0) + (playerAccount?.speed || 0)}</span>
                </div>
                <div>
                  Attack:{" "}
                  <span className="text-red-500">{playerAccount?.attack}</span>
                </div>
                <div>
                  Defense:{" "}
                  <span className="text-blue-500">{playerAccount?.defense}</span>
                </div>
                <div>
                  Speed:{" "}
                  <span className="text-green-500">{playerAccount?.speed}</span>
                </div>
                <div>
                  Crew:{" "}
                  <span >{playerAccount?.crew}/{playerAccount?.maxCrew}</span>
                </div>

              </div>
            </section>
    )
}