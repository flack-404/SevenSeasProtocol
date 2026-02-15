"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayer } from '../libs/providers/player-provider';
import {
  usePlayerShips,
  useShipNFTTransaction,
  useContractInstances,
} from '../libs/hooks/useContracts';
import { useReadContract, useSendTransaction, useActiveAccount } from 'thirdweb/react';
import { prepareContractCall } from 'thirdweb';
import Button from '../components/Button';
import { formatEther } from 'viem';
import Image from 'next/image';

/**
 * Ship NFT Page - Mint ships, view gallery, claim yield, stake ships
 * Matches pirate theme from existing UI
 */
export default function NFTsPage() {
  const router = useRouter();
  const { playerAccount, isLoading: playerLoading, refreshPlayerData } = usePlayer();
  const { shipIds, totalYield, refetch: refetchShips } = usePlayerShips();
  const { shipNFTContract } = useContractInstances();
  const { mutate: sendTransaction, isPending, isSuccess, isError, error: txError } = useSendTransaction();
  const account = useActiveAccount();

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedShips, setSelectedShips] = useState<number[]>([]);
  const [lastAction, setLastAction] = useState<'mint' | 'claim' | 'claimAll' | 'stake' | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('NFTs Debug:', {
      playerLoading,
      playerAccount: playerAccount ? 'EXISTS' : 'NULL',
      boatName: playerAccount?.boatName,
    });
  }, [playerLoading, playerAccount]);

  // Just wait for loading to finish
  if (playerLoading || !playerAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[url('/sea-bg.jpg')] bg-cover">
        <div className="ui1 p-8 text-white text-center">
          <p>Loading Ship NFTs...</p>
        </div>
      </div>
    );
  }

  const battlePower = Number(playerAccount.attack + playerAccount.defense + playerAccount.speed);
  const canMintNFT = battlePower >= 10;
  const powerProgress = (battlePower / 10) * 100;

  const handleMintNFT = () => {
    if (!canMintNFT) {
      setError('Your battle power must be at least 10 to mint an NFT');
      return;
    }

    if (!account?.address) {
      setError('Wallet not connected');
      return;
    }

    setError('');
    setSuccess('');
    setLastAction('mint');

    try {
      const transaction = prepareContractCall({
        contract: shipNFTContract,
        method: 'function mintShipNFT(address _owner, uint256 _battlePower)',
        params: [account.address, BigInt(battlePower)],
      });

      sendTransaction(transaction);
    } catch (err) {
      setError('Failed to mint NFT: ' + (err as Error).message);
      setLastAction(null);
    }
  };

  const handleClaimYield = (tokenId: number) => {
    setError('');
    setSuccess('');
    setLastAction('claim');

    try {
      const transaction = prepareContractCall({
        contract: shipNFTContract,
        method: 'function claimYield(uint256 tokenId)',
        params: [BigInt(tokenId)],
      });

      sendTransaction(transaction);
    } catch (err) {
      setError('Failed to claim yield: ' + (err as Error).message);
      setLastAction(null);
    }
  };

  const handleClaimAllYields = () => {
    if (selectedShips.length === 0) {
      setError('No ships selected');
      return;
    }

    setError('');
    setSuccess('');
    setLastAction('claimAll');

    try {
      const transaction = prepareContractCall({
        contract: shipNFTContract,
        method: 'function claimMultipleYields(uint256[] tokenIds)',
        params: [selectedShips.map(id => BigInt(id))],
      });

      sendTransaction(transaction);
      setSelectedShips([]);
    } catch (err) {
      setError('Failed to claim yields: ' + (err as Error).message);
      setLastAction(null);
    }
  };

  const handleStakeShip = (tokenId: number) => {
    setError('');
    setSuccess('');
    setLastAction('stake');

    try {
      const transaction = prepareContractCall({
        contract: shipNFTContract,
        method: 'function stakeShip(uint256 tokenId)',
        params: [BigInt(tokenId)],
      });

      sendTransaction(transaction);
    } catch (err) {
      setError('Failed to stake ship: ' + (err as Error).message);
      setLastAction(null);
    }
  };

  // Watch for transaction success
  useEffect(() => {
    if (isSuccess && lastAction) {
      console.log('NFT transaction succeeded, lastAction:', lastAction);

      if (lastAction === 'mint') {
        setSuccess('Ship NFT minted! Your ship is now a tradeable asset! 🚢');
        setTimeout(async () => {
          await refreshPlayerData();
          await refetchShips();
          setSuccess('');
          setLastAction(null);
        }, 2000);
      } else if (lastAction === 'claim') {
        setSuccess('Yield claimed! 🪙');
        setTimeout(async () => {
          await refreshPlayerData();
          await refetchShips();
          setSuccess('');
          setLastAction(null);
        }, 2000);
      } else if (lastAction === 'claimAll') {
        setSuccess('All yields claimed! 🎉');
        setTimeout(async () => {
          await refreshPlayerData();
          await refetchShips();
          setSuccess('');
          setLastAction(null);
        }, 2000);
      } else if (lastAction === 'stake') {
        setSuccess('Ship staked! Earning 2x yield now! ⚓');
        setTimeout(async () => {
          await refreshPlayerData();
          await refetchShips();
          setSuccess('');
          setLastAction(null);
        }, 2000);
      }
    }
  }, [isSuccess]);

  // Watch for transaction errors
  useEffect(() => {
    if (isError && lastAction) {
      console.log('NFT transaction failed:', txError);
      setError(txError?.message || 'Transaction failed');
      setLastAction(null);
    }
  }, [isError]);

  const toggleShipSelection = (tokenId: number) => {
    if (selectedShips.includes(tokenId)) {
      setSelectedShips(selectedShips.filter(id => id !== tokenId));
    } else {
      setSelectedShips([...selectedShips, tokenId]);
    }
  };

  return (
    <div className="h-screen bg-[url('/sea-bg.jpg')] bg-cover p-4 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="ui1 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-[#fbc988] mb-2">🚢 Ship NFT Gallery</h1>
              <p className="text-gray-300">Turn your ship into a yield-bearing NFT asset</p>
            </div>
            <Button variant="secondary" onClick={() => router.push('/')}>
              ← Back to Sea
            </Button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="ui2 p-4 border-2 border-red-500">
            <p className="text-red-300">⚠️ {error}</p>
          </div>
        )}
        {success && (
          <div className="ui2 p-4 border-2 border-green-500">
            <p className="text-green-300">✅ {success}</p>
          </div>
        )}

        {/* Mint Section */}
        <div className="ui1 p-6">
          <h2 className="text-2xl font-bold text-[#fbc988] mb-4">⚓ Mint Ship NFT</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Ship Preview */}
            <div className="ui2 p-6 text-center">
              <h3 className="text-lg font-bold text-white mb-4">{playerAccount.boatName}</h3>
              <div className="h-32 relative overflow-hidden flex items-center justify-center mb-4">
                <Image
                  src={`/ships/${playerAccount.hp === 0n ? '0' : '0-healed'}-${playerAccount.isPirate ? 'pirate' : 'navy'}.gif`}
                  alt="Your Ship"
                  width={256}
                  height={256}
                  className="min-h-64 absolute bottom-0"
                />
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-gray-300">⚔️ Attack: <span className="text-red-400 font-bold">{playerAccount.attack.toString()}</span></p>
                <p className="text-gray-300">🛡️ Defense: <span className="text-blue-400 font-bold">{playerAccount.defense.toString()}</span></p>
                <p className="text-gray-300">⚡ Speed: <span className="text-yellow-400 font-bold">{playerAccount.speed.toString()}</span></p>
                <p className="text-gray-300">💪 Total Power: <span className="text-purple-400 font-bold text-lg">{battlePower}</span></p>
              </div>
            </div>

            {/* Mint Requirements */}
            <div className="ui2 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Requirements</h3>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-300 mb-2">
                  <span>Battle Power</span>
                  <span className={canMintNFT ? 'text-green-400' : 'text-red-400'}>
                    {battlePower} / 10
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-6">
                  <div
                    className={`h-6 rounded-full transition-all duration-500 ${
                      canMintNFT ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-orange-500'
                    }`}
                    style={{ width: `${Math.min(powerProgress, 100)}%` }}
                  />
                </div>
              </div>

              {!canMintNFT && (
                <div className="bg-red-900/20 rounded p-4 mb-4 border border-red-500">
                  <p className="text-red-300 text-sm">
                    ⚠️ You need {10 - battlePower} more power to mint an NFT
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    💡 Tip: Upgrade your attack, defense, or speed in the main game
                  </p>
                </div>
              )}

              {canMintNFT && (
                <div className="bg-green-900/20 rounded p-4 mb-4 border border-green-500">
                  <p className="text-green-300 text-sm">
                    ✅ Your ship is ready to become an NFT!
                  </p>
                </div>
              )}

              <Button
                variant="primary"
                onClick={handleMintNFT}
                disabled={!canMintNFT || isPending}
                className="w-full"
              >
                {isPending ? 'Minting...' : canMintNFT ? 'Mint Ship NFT (FREE)' : '🔒 Unlock at 10 Power'}
              </Button>

              {/* Benefits */}
              <div className="mt-6 space-y-2">
                <h4 className="text-sm font-bold text-[#fbc988]">NFT Benefits:</h4>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• Earn passive ARMADA yield based on ship power</li>
                  <li>• Tradeable on secondary markets (future)</li>
                  <li>• Stake for 2x yield multiplier</li>
                  <li>• Unique on-chain asset you own forever</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Your Ships Gallery */}
        {shipIds.length > 0 && (
          <div className="ui1 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-[#fbc988]">⚓ Your Fleet ({shipIds.length})</h2>
              {selectedShips.length > 0 && (
                <Button
                  variant="primary"
                  onClick={handleClaimAllYields}
                  disabled={isPending}
                >
                  Claim Selected ({selectedShips.length}) Yields
                </Button>
              )}
            </div>

            <div className="max-h-[600px] overflow-y-auto pr-2">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shipIds.map((tokenId) => (
                  <ShipNFTCard
                    key={tokenId.toString()}
                    tokenId={Number(tokenId)}
                    isSelected={selectedShips.includes(Number(tokenId))}
                    onSelect={() => toggleShipSelection(Number(tokenId))}
                    onClaimYield={handleClaimYield}
                    onStake={handleStakeShip}
                    isPending={isPending}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {shipIds.length === 0 && (
          <div className="ui2 p-6 text-center">
            <p className="text-gray-300 mb-2">🚢 You don't have any Ship NFTs yet</p>
            <p className="text-sm text-gray-400">
              Upgrade your ship to 10+ power and mint your first NFT above!
            </p>
          </div>
        )}

        {/* Yield System Info */}
        <div className="ui2 p-6">
          <h3 className="text-lg font-bold text-[#fbc988] mb-3">💰 Yield System</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-bold text-white mb-2">APY by Power Level</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>Power 10-25:</span>
                  <span className="text-green-400">0.1% APY</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Power 26-50:</span>
                  <span className="text-green-400">0.25% APY</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Power 51-100:</span>
                  <span className="text-blue-400">0.5% APY</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Power 100+:</span>
                  <span className="text-purple-400">1.0% APY</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-2">Ship Classes</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>🛶 Sloop:</span>
                  <span className="text-gray-400">Power 10-25</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>⛵ Brigantine:</span>
                  <span className="text-green-400">Power 26-50</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>🚢 Frigate:</span>
                  <span className="text-blue-400">Power 51-100</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>⚓ Man-of-War:</span>
                  <span className="text-purple-400">Power 100+</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 bg-blue-900/20 rounded p-3">
            <p className="text-xs text-gray-300">
              💡 <span className="font-bold">Staking:</span> Stake your ship to earn 2x yield!
              Staked ships cannot be transferred but generate double rewards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Ship NFT Card Component
 */
function ShipNFTCard({
  tokenId,
  isSelected,
  onSelect,
  onClaimYield,
  onStake,
  isPending,
}: {
  tokenId: number;
  isSelected: boolean;
  onSelect: () => void;
  onClaimYield: (tokenId: number) => void;
  onStake: (tokenId: number) => void;
  isPending: boolean;
}) {
  const { shipNFTContract } = useContractInstances();

  // Use public mapping directly
  const { data: shipData } = useReadContract({
    contract: shipNFTContract,
    method: 'function ships(uint256) view returns (uint256 tokenId, uint256 battlePower, uint256 yieldRate, uint256 lastYieldClaim, uint256 totalYieldGenerated, uint256 mintedAt, string shipClass, bool isStaked)',
    params: [BigInt(tokenId)],
  });

  const { data: claimableYield } = useReadContract({
    contract: shipNFTContract,
    method: 'function getClaimableYield(uint256) view returns (uint256)',
    params: [BigInt(tokenId)],
  });

  if (!shipData) return null;

  const battlePower = Number(shipData[1]);
  const yieldRate = Number(shipData[2]);
  const mintedAt = Number(shipData[5]);
  const shipClassFromContract = shipData[6];
  const isStaked = shipData[7];
  const power = battlePower;

  // Determine ship class display with emoji
  let shipClassDisplay = '🛶 Sloop';
  let classColor = 'text-gray-400';
  if (shipClassFromContract === 'Man-of-War') {
    shipClassDisplay = '⚓ Man-of-War';
    classColor = 'text-purple-400';
  } else if (shipClassFromContract === 'Frigate') {
    shipClassDisplay = '🚢 Frigate';
    classColor = 'text-blue-400';
  } else if (shipClassFromContract === 'Brigantine') {
    shipClassDisplay = '⛵ Brigantine';
    classColor = 'text-green-400';
  }

  const hasYield = claimableYield && claimableYield > 0n;

  return (
    <div
      className={`ui2 p-4 cursor-pointer transition-all hover:scale-[1.02] ${
        isSelected ? 'border-2 border-yellow-400' : ''
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-white">Ship #{tokenId}</h3>
        {isStaked && <span className="text-xs bg-purple-600 px-2 py-1 rounded">⚡ STAKED</span>}
      </div>

      <p className={`text-sm ${classColor} mb-3`}>{shipClassDisplay}</p>

      <div className="space-y-1 text-xs mb-3">
        <p className="text-gray-300">💪 Battle Power: <span className="text-purple-400 font-bold">{power}</span></p>
        <p className="text-gray-300">📊 Yield Rate: <span className="text-green-400">{(yieldRate / 100).toFixed(2)}% daily</span></p>
        <p className="text-gray-300">⏰ Minted: <span className="text-gray-400">{new Date(mintedAt * 1000).toLocaleDateString()}</span></p>
      </div>

      <div className="bg-green-900/20 rounded p-2 mb-3">
        <p className="text-xs text-gray-300">Claimable Yield:</p>
        <p className="text-sm font-bold text-green-400">
          {claimableYield ? formatEther(claimableYield) : '0'} ARMADA
        </p>
      </div>

      <div className="space-y-2">
        <Button
          variant="primary"
          onClick={(e: any) => {
            e.stopPropagation();
            onClaimYield(tokenId);
          }}
          disabled={isPending || !hasYield}
          className="w-full text-xs"
        >
          {hasYield ? 'Claim Yield' : 'No Yield Yet'}
        </Button>
        {!isStaked && (
          <Button
            variant="secondary"
            onClick={(e: any) => {
              e.stopPropagation();
              onStake(tokenId);
            }}
            disabled={isPending}
            className="w-full text-xs"
          >
            Stake (2x Yield)
          </Button>
        )}
      </div>
    </div>
  );
}
