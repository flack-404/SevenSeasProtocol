"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import Button from "./Button";
import { useGameContract } from "../libs/hooks/useGameContract";
import { usePlayer } from "../libs/providers/player-provider";
import { map, Map } from "../libs/constants/map";

interface TravelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: number;
  onTravelStart: () => void;
}

export function TravelModal({
  isOpen,
  onClose,
  currentLocation,
  onTravelStart,
}: TravelModalProps) {
  const [destination, setDestination] = useState<number>(0);
  const [useFastTravel, setUseFastTravel] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gameContract = useGameContract();
  const { playerAccount, forceRefresh, setNotification } = usePlayer();

  const handleClose = () => {
    setDestination(0);
    setUseFastTravel(false);
    setError(null);
    onClose();
  };

  const calculateTravelTime = (from: number, to: number, speed: number = 1) => {
    const distance = Math.abs(to - from);
    const baseTime = distance * 60 * 60; // 1 hour per location
    const speedReduction = speed * 5 * 60 * distance; // 5 minutes per speed point per distance
    return Math.max(0, baseTime - speedReduction);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleTravel = async () => {
    if (!gameContract.isReady || !("travelToLocation" in gameContract)) {
      setError("Game contract not ready");
      return;
    }

    if (destination === currentLocation) {
      setError("Cannot travel to current location");
      return;
    }

    if (destination < 0 || destination > 100) {
      setError("Invalid destination (0-100)");
      return;
    }

    // Check if player has enough diamonds for fast travel
    if (useFastTravel) {
      const playerDiamonds = playerAccount?.diamonds ?? 0;
      if (playerDiamonds < diamondCost) {
        setError(
          `Not enough diamonds. Need ${diamondCost}, have ${playerDiamonds}`
        );
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      await gameContract.travelToLocation(destination, useFastTravel);

      // Close modal first
      handleClose();

      // Show travel notification
      setNotification("⛵ Setting sail! Updating ship status...");

      // Trigger immediate refresh to show updated travel state
      onTravelStart();
      forceRefresh();

      // Additional refresh after a short delay to ensure blockchain state is updated
      setTimeout(() => {
        forceRefresh();
      }, 2000);
    } catch (error) {
      console.error("Travel error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to start travel"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Port locations for quick selection
  const ports = [
    { location: 25, name: "Port Royal" },
    { location: 55, name: "Tortuga Bay" },
    { location: 89, name: "Nassau Harbor" },
  ];

  // Popular destinations
  const popularDestinations = [
    { location: 0, name: "The Edge" },
    { location: 50, name: "Central Seas" },
    { location: 75, name: "Treasure Cove" },
    { location: 100, name: "World's End" },
  ];

  const distance = Math.abs(destination - currentLocation);
  const playerSpeed = playerAccount?.speed ?? 1; // Use player's actual speed or fallback to 1
  const estimatedTime = calculateTravelTime(
    currentLocation,
    destination,
    playerSpeed
  );

  // Calculate diamond cost for fast travel (minimum 1 diamond)
  const baseDiamondCost = Math.floor(estimatedTime / 3600); // 1 diamond per hour of travel time
  const diamondCost = Math.max(1, baseDiamondCost); // Minimum 1 diamond for fast travel

  const LocationMarker = ({
    location,
    x,
    onClick,
  }: {
    location: Partial<Map>;
    x: number;
    onClick: () => void;
  }) => {
    return (
      <button
        className="h-full group hover:!z-[10] z-[0]  w-[1%] absolute"
        style={{ left: x + "%" }}
        onClick={onClick}
      >
        <div
          style={{ top: location.y + "%" }}
          className={`absolute  group-hover:scale-150  text-center  w-[10px] h-[10px] border-3 group-hover:border-2 border-[#402511] ${
            currentLocation === location.coord
              ? "bg-yellow-400 border-yellow-400"
              : ""
          } ${location.isPort ? "bg-[#402511] !border-[#402511]" : ""}`}
        >
          {currentLocation === location.coord && (
            <div className="absolute top-0 left-0 w-full h-full bg-yellow-400 animate-spin"></div>
          )}
          <div className="text-white text-xs absolute scale-75 bottom-[20px] w-[100px] left-[-50px] ui1 p-6 opacity-0 group-hover:opacity-100 ">
            {location.locationName
              ? location.locationName
              : `Coord. ${location.coord}`}
          </div>
        </div>
      </button>
    );
  };

  return (
    <Modal
      open={isOpen}
      setOpen={handleClose}
      removeCloseButton={isLoading}
      className="!min-w-screen !max-w-screen"
      containerClassName="!w-screen "
    >
      <div className="w-full  mx-auto !pt-0 p-6">
        <h2 className="!text-2xl font-bold text-[#fbc988] mb-2 text-center">
          Linkardia's Map
        </h2>
        <p className="text-gray-300 mb-4 text-center">
          Current Location:{" "}
          <span className="text-yellow-400">Coordinate {currentLocation}</span>  {!destination ? " - Select a destination to travel to" : ""}
        </p>
        <div className="ui2 p-6 relative  max-w-[1200px] mx-auto w-full h-[495px]">
          <div className='bg-[url("/map.webp")] relative bg-[length:100%_100%] bg-center w-full h-full '>
            {map.map((location, index) => (
              <LocationMarker
                key={location.coord}
                location={location}
                x={index}
                onClick={() => setDestination(location.coord ?? 0)}
              />
            ))}
          </div>
        </div>

        <div className="mb-6  max-w-[1200px] mx-auto w-full">

          {/* Travel Options */}
          {destination !== currentLocation && (
            <div className="mb-6 mt-3 ui2 p-4">
              <h3 className="text-lg font-bold text-white mb-3">
                Travel from {currentLocation} to {destination}
              </h3>
            <div className="flex gap-4 w-full">
              {/* Normal Travel */}
              <div
                className={`p-4 ui4 rounded cursor-pointer transition-all w-full ${
                  !useFastTravel
                    ? " bg-blue-500/20"
                    : "border-gray-600"
                }`}
                onClick={() => setUseFastTravel(false)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-white font-bold">Normal Travel</div>
                    <div className="text-gray-300 text-sm">
                      Safe and steady journey
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white">Free</div>
                    <div className="text-gray-300 text-sm">
                      ~{formatTime(estimatedTime)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fast Travel */}
              <div
                className={`p-4  ui4 rounded transition-all mt-2 w-full ${
                  useFastTravel
                    ? "border-yellow-500 bg-yellow-500/20"
                    : "border-gray-600"
                } ${
                  (playerAccount?.diamonds ?? 0) < diamondCost
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
                onClick={() => {
                  if ((playerAccount?.diamonds ?? 0) >= diamondCost) {
                    setUseFastTravel(true);
                  }
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-white font-bold">Instant Travel</div>
                    <div className="text-gray-300 text-sm">
                      {(playerAccount?.diamonds ?? 0) < diamondCost
                        ? "Insufficient diamonds"
                        : "Instant arrival with diamonds"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400">
                      {diamondCost} Diamond{diamondCost === 1 ? "" : "s"}
                    </div>
                    <div className="text-gray-300 text-sm">
                      <div className="mb-1">
                        You have: {playerAccount?.diamonds ?? 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div></div>
            </div>
          )}

          {error && (
            <div className="mb-4 mt-3 p-3 bg-red-500/20 border border-red-500 rounded-md">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleTravel}
            className="disabled:opacity-50"
            disabled={
              isLoading ||
              destination === currentLocation ||
              destination < 0 ||
              destination > 100 ||
              (useFastTravel && (playerAccount?.diamonds ?? 0) < diamondCost)
            }
          >
            {isLoading ? "Setting Sail..." : `Travel to ${destination}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
