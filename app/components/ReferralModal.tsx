"use client";

import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import Button from "./Button";
import { useGameContract } from "../libs/hooks/useGameContract";
import { useThirdweb } from "../libs/hooks/useThirdweb";
import { toast } from "sonner";

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReferralModal({ isOpen, onClose }: ReferralModalProps) {
  const { address } = useThirdweb();
  const gameContract = useGameContract();
  const [referralCode, setReferralCode] = useState<string>("");
  const [stats, setStats] = useState({
    totalReferrals: 0,
    referralRewards: "0",
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch referral data when modal opens
  useEffect(() => {
    if (isOpen && address && gameContract.isReady) {
      fetchReferralData();
    }
  }, [isOpen, address, gameContract.isReady]);

  const fetchReferralData = async () => {
    if (!address || !gameContract.isReady) return;

    setIsLoading(true);
    try {
      // Fetch referral stats from contract
      if ('getReferralStats' in gameContract) {
        const result = await gameContract.getReferralStats(address);
        setReferralCode(result[0]); // referralCode
        setStats({
          totalReferrals: Number(result[2]), // totalReferrals
          referralRewards: result[3].toString(), // referralRewards in wei
        });
      }
    } catch (error) {
      console.error("Error fetching referral data:", error);
      toast.error("Failed to load referral data");
    } finally {
      setIsLoading(false);
    }
  };

  const [shareUrl, setShareUrl] = useState<string>("");

  // Set share URL on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(`${window.location.origin}?ref=${referralCode}`);
    }
  }, [referralCode]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

 

  const formatArmadaRewards = (wei: string) => {
    try {
      const value = BigInt(wei);
      return (Number(value) / 1e18).toFixed(2);
    } catch {
      return "0.00";
    }
  };

  return (
    <Modal open={isOpen} setOpen={onClose} removeCloseButton={false}>
      <div className="w-full max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Invite Your Friends
        </h2>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading your referral data...</p>
          </div>
        ) : (
          <>
            {/* Referral Code Display */}
            <div className="mb-6 ui2 p-6 rounded-lg">
              <p className="text-sm text-gray-400 mb-2 text-center">Your Referral Code</p>
              <div className="flex items-center justify-center gap-3">
                <div className="ui5 p-4 rounded-md">
                  <p className="text-2xl font-bold text-black tracking-wider">
                    {referralCode || "Loading..."}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => copyToClipboard(referralCode)}
                  className="!px-4 !py-2"
                >
                  Copy
                </Button>
              </div>
            </div>

            {/* Rewards Info */}
            <div className="mb-6 ui2 p-4 rounded-lg">
              <h3 className="text-lg font-bold text-[#fbc988] mb-3">Referral Rewards</h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-blue-900/30 p-3 rounded-lg">
                  <p className="text-sm text-gray-400">Your Friend Gets</p>
                  <p className="text-lg font-bold text-green-400">+100 ARMADA</p>
                  <p className="text-sm text-green-400">+200 Gold</p>
                  <p className="text-sm text-green-400">+1 Diamond</p>
                </div>
                <div className="bg-purple-900/30 p-3 rounded-lg">
                  <p className="text-sm text-gray-400">You Get</p>
                  <p className="text-lg font-bold text-yellow-400">+50 ARMADA</p>
                  <p className="text-sm text-yellow-400">+1 Diamond</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mb-6 ui2 p-4 rounded-lg">
              <h3 className="text-lg font-bold text-[#fbc988] mb-3">Your Referral Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-400">{stats.totalReferrals}</p>
                  <p className="text-sm text-gray-400">Total Referrals</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-400">
                    {formatArmadaRewards(stats.referralRewards)}
                  </p>
                  <p className="text-sm text-gray-400">ARMADA Earned</p>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <Button
              variant="secondary"
              onClick={onClose}
              className="w-full"
            >
              Close
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
