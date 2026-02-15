"use client";

import { useState, useEffect } from "react";

interface TravelCountdownProps {
  travelEndTime: number; // Unix timestamp when travel ends
  onTravelComplete?: () => void;
  suffix?: string;
}

export function TravelCountdown({ travelEndTime, onTravelComplete, suffix }: TravelCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = travelEndTime - now;
      
      if (remaining <= 0) {
        setTimeLeft(0);
        if (!isComplete) {
          setIsComplete(true);
          onTravelComplete?.();
        }
      } else {
        setTimeLeft(remaining);
        setIsComplete(false);
      }
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [travelEndTime, isComplete, onTravelComplete]);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "Arrived!";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getProgressPercentage = () => {
    if (isComplete) return 100;
    // This would need the original travel duration to calculate progress
    // For now, we'll show a pulsing animation
    return 0;
  };

  if (isComplete) {
    return (
      <div className="text-center">
        <div className="text-green-400 text-2xl font-bold mb-2 animate-pulse">
          ⚓ Arrived!
        </div>
        <div className="text-gray-300 text-sm">
          You have reached your destination
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="text-yellow-400 text-xl font-bold mb-2">
       Traveling {suffix}
      </div>
      <div className="text-white text-lg mb-3 font-mono">
        {formatTime(timeLeft)} 
      </div>
      
      
      <style jsx>{`
        .sailing-ship {
          left: 10%;
          animation: sail 3s ease-in-out infinite alternate, bounce 1s ease-in-out infinite;
        }
        
        @keyframes sail {
          0% { left: 10%; }
          100% { left: 70%; }
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(-50%) translateY(-2px); }
          50% { transform: translateY(-50%) translateY(2px); }
        }
      `}</style>
    </div>
  );
} 