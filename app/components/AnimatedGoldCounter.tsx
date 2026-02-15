"use client";

import { useState, useEffect, useRef } from "react";
import { usePlayer } from "../libs/providers/player-provider";

interface AnimatedGoldCounterProps {
  className?: string;
}

export const AnimatedGoldCounter = ({ className = "" }: AnimatedGoldCounterProps) => {
  const { playerAccount } = usePlayer();
  
  const [displayGold, setDisplayGold] = useState<number>(0);
  const [targetGold, setTargetGold] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | undefined>(undefined);
  const lastUpdateRef = useRef<number>(Date.now());

  // Calculate real-time gold including accumulated GPM (per second for smooth experience)
  const calculateRealTimeGold = () => {
    if (!playerAccount || playerAccount.gpm === 0 || playerAccount.hp === 0) {
      return playerAccount?.gold || 0;
    }

    const now = Date.now() / 1000; // Current time in seconds
    const lastClaim = playerAccount.lastGPMClaim; // Last claim time in seconds
    const timeElapsed = now - lastClaim;
    
    // Calculate gold per second (GPM / 60) and multiply by seconds elapsed
    const goldPerSecond = playerAccount.gpm / 60;
    const accumulatedGold = goldPerSecond * timeElapsed;
    
    return playerAccount.gold + accumulatedGold;
  };

  // Smooth animation function
  const animateToTarget = (start: number, target: number, duration: number = 1000) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startTime = Date.now();
    setIsAnimating(true);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = start + (target - start) * easeOutQuart;
      
      setDisplayGold(Math.floor(current));
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        setDisplayGold(target);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  // Update target gold and animate
  useEffect(() => {
    if (!playerAccount) return;

    const newTarget = calculateRealTimeGold();
    
    // Only animate if there's a significant change (more than 1 gold difference)
    if (Math.abs(newTarget - targetGold) > 1) {
      setTargetGold(newTarget);
      animateToTarget(displayGold, newTarget, 800);
    } else {
      setTargetGold(newTarget);
      setDisplayGold(newTarget);
    }
  }, [playerAccount?.gold, playerAccount?.lastGPMClaim, playerAccount?.gpm]);

  // Real-time updates for GPM accumulation (every second for smooth experience)
  useEffect(() => {
    if (!playerAccount || playerAccount.gpm === 0 || playerAccount.hp === 0) return;

    const interval = setInterval(() => {
      const newTarget = calculateRealTimeGold();
      
      // Update every second with smooth incremental changes
      if (newTarget > displayGold && !isAnimating) {
        const increment = newTarget - displayGold;
        
        // For small increments (less than 1 gold), just update directly
        if (increment < 1) {
          setDisplayGold(newTarget);
          setTargetGold(newTarget);
        } else {
          // For larger increments, animate smoothly
          setTargetGold(newTarget);
          animateToTarget(displayGold, newTarget, 300); // Quick animation for per-second updates
        }
      }
    }, 1000); // Update every second for smooth experience

    return () => clearInterval(interval);
  }, [playerAccount?.gpm, playerAccount?.lastGPMClaim, displayGold, isAnimating]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Initialize display gold
  useEffect(() => {
    if (playerAccount && displayGold === 0) {
      const initialGold = calculateRealTimeGold();
      setDisplayGold(initialGold);
      setTargetGold(initialGold);
    }
  }, [playerAccount]);

  const formatGold = (gold: number) => {
    return Math.floor(gold).toLocaleString();
  };

  const isAccumulating = playerAccount && playerAccount.gpm > 0 && playerAccount.hp > 0;
  
  // Calculate gold per second for display
  const goldPerSecond = playerAccount ? (playerAccount.gpm / 60).toFixed(2) : "0";

  return (
    <span className={`${className} ${isAnimating ? 'animate-pulse' : ''} ${isAccumulating ? 'text-yellow-300' : ''}`}>
      {formatGold(displayGold)}
      {isAccumulating && (
        <span className="text-xs text-green-400 ml-1 animate-pulse">
          +{goldPerSecond}/sec
        </span>
      )}
    </span>
  );
}; 