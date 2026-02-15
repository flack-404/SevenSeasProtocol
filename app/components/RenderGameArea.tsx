import React, { useState, useEffect } from "react";
import { usePlayer } from "../libs/providers/player-provider";

export const RenderGameArea = ({children}: {children: React.ReactNode}) => {
  const { playerAccount, isTraveling } = usePlayer();
  const [isPort, setIsPort] = useState(false);
  
  // Check if player is at a port location
  useEffect(() => {
    if (playerAccount) {
      // Port locations are 25, 55, and 89
      const portLocations = [25, 55, 89];
      setIsPort(portLocations.includes(playerAccount.location));
    }
  }, [playerAccount?.location]);
  
  
    return (
      <div className="relative h-[40vh]  w-screen">

        <div className="relative flex flex-col h-full items-center justify-center">
          {/* Ocean waves background - shown with reduced opacity at ports */}
          <div className={`w-screen h-[256px] absolute bottom-5 left-0 flex flex-col items-center justify-center bg-[url('/ocean_l2.gif')] ${isPort ? 'opacity-30' : 'opacity-50'} scale-x-[-100%] bg-[length:512px_256px] bg-bottom bg-repeat-x transition-opacity duration-500`} />

          {/* Port visuals - only shown when at a port location */}
          {isPort && !isTraveling && (
            <>
              <div className="w-screen h-[256px] absolute bottom-5 left-0 flex flex-col items-center justify-center bg-[url('/port.png')] bg-[length:1024px_512px] bg-bottom bg-no-repeat" />
            </>
          )}
          {children}
          
          <div className="w-screen h-[64px]  absolute bottom-0 left-0 flex flex-col items-center justify-center  bg-[url('/ocean_l1.gif')] bg-[length:512px_64px] bg-top bg-repeat-x" />
        </div>
        <div className="h-full bg-[#063c65] w-full"></div>
      </div>
    )
}