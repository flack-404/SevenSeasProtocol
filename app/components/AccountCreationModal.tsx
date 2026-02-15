"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal } from "./Modal";
import Button from "./Button";
import { useGameContract } from "../libs/hooks/useGameContract";
import { usePlayer } from "../libs/providers/player-provider";

interface AccountCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountCreated: () => void;
}

type Step = 'faction' | 'ship-name' | 'port-selection' | 'creating' | 'success';

export function AccountCreationModal({ isOpen, onClose, onAccountCreated }: AccountCreationModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('faction');
  const [selectedFaction, setSelectedFaction] = useState<'pirate' | 'navy' | null>(null);
  const [shipName, setShipName] = useState('');
  const [selectedPort, setSelectedPort] = useState<25 | 55 | 89 | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  
  const gameContract = useGameContract();
  const { forceRefresh } = usePlayer();

  const resetModal = () => {
    setCurrentStep('faction');
    setSelectedFaction(null);
    setShipName('');
    setSelectedPort(null);
    setReferralCode('');
    setIsCreating(false);
    setError('');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleFactionSelect = (faction: 'pirate' | 'navy') => {
    setSelectedFaction(faction);
    setCurrentStep('ship-name');
  };

  const handleShipNameSubmit = () => {
    if (shipName.trim().length === 0) {
      setError('Ship name cannot be empty');
      return;
    }
    if (shipName.length > 12) {
      setError('Ship name must be 12 characters or less');
      return;
    }
    setError('');
    setCurrentStep('port-selection');
  };

  const handlePortSelection = (port: 25 | 55 | 89) => {
    setSelectedPort(port);
    setCurrentStep('creating');
    createAccount(port);
  };

  const createAccount = async (startPort: 25 | 55 | 89) => {
    if (!gameContract.isReady || !selectedFaction) return;

    setIsCreating(true);
    try {
      const isPirate = selectedFaction === 'pirate';

      // Use referral code if provided, otherwise use standard creation
      if (referralCode.trim().length > 0) {
        // Create account with referral
        if ('createAccountWithReferral' in gameContract) {
          await gameContract.createAccountWithReferral(
            shipName.trim(),
            isPirate,
            startPort,
            referralCode.trim().toUpperCase() // Convert to uppercase to match contract format
          );
        } else {
          throw new Error('Referral system not available');
        }
      } else {
        // Create account without referral (standard)
        if ('createAccount' in gameContract) {
          await gameContract.createAccount(shipName.trim(), isPirate, startPort);
        } else {
          throw new Error('Contract not ready');
        }
      }

      setCurrentStep('success');

      // Force refresh player data immediately
      forceRefresh();

      // Also trigger the parent callback
      onAccountCreated();
    } catch (error) {
      console.error('Error creating account:', error);
      setError(error instanceof Error ? error.message : 'Failed to create account');
      setCurrentStep('port-selection'); // Go back to port selection step
    } finally {
      setIsCreating(false);
    }
  };

  const renderFactionStep = () => (
    <div className="text-center">
      <h2 className="!text-2xl font-bold text-[#fbc988] mb-6">Choose Your Faction</h2>
      <p className="text-gray-300 mb-8">
        Will you sail under the black flag of piracy, or serve with honor in the navy?
      </p>
      
      <div className="flex gap-6 justify-center mb-8">
        {/* Pirates Option */}
        <div 
          className={`cursor-pointer p-4 ui2 rounded-lg  flex flex-col items-center justify-center hover:scale-105 ${
            selectedFaction === 'pirate' 
              ? 'scale-105 !brightness-125' 
              : 'scale-100'
          }`}
          onClick={() => setSelectedFaction('pirate')}
        >
          <Image 
          unoptimized
            src="/flags/pirates_flag.webp" 
            alt="Pirates Flag" 
            width={120} 
            height={80}
            className="mb-3"
          />
          <h3 className="text-lg font-bold text-[#fbc988]">Pirates</h3>
          <p className="text-sm mt-2">
            Freedom and chaos.
            Plunder and adventure await!
          </p>
        </div>

        {/* Navy Option */}
        <div 
          className={`cursor-pointer p-4 ui2 rounded-lg  flex flex-col items-center justify-center hover:scale-105 ${
            selectedFaction === 'navy' 
              ? 'scale-105 !brightness-125' 
              : 'scale-100'
          }`}
          onClick={() => setSelectedFaction('navy')}
        >
          <Image 
          unoptimized
            src="/flags/navy_flag.webp" 
            alt="Navy Flag" 
            width={120} 
            height={80}
            className="mb-3"
          />
          <h3 className="!text-lg font-bold text-[#fbc988]">Navy</h3>
          <p className="text-sm  mt-2">
            Honor and discipline.
            Protect the innocent seas!
          </p>
        </div>
      </div>

      <div className="flex gap-3 justify-center">
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={() => selectedFaction && handleFactionSelect(selectedFaction)}
          disabled={!selectedFaction}
        >
          Continue
        </Button>
      </div>
    </div>
  );

  const renderShipNameStep = () => (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-white mb-6">Name Your Ship</h2>
      <p className="text-gray-300 mb-6">
        Every great {selectedFaction === 'pirate' ? 'pirate' : 'naval'} vessel needs a legendary name.
        Choose wisely, captain!
      </p>

      <div className="mb-6 h-[128px]  overflow-hidden relative flex items-center justify-center">
        <Image 
          src={`/ships/0-healed-${selectedFaction === 'pirate' ? 'pirate' : 'navy'}.gif`} 
          alt="Your Ship" 
          width={256} 
          height={256}
          className="min-h-[256px] absolute bottom-0 mx-auto mb-4"
        />
      </div>

      <div className="mb-6 space-y-4">
        <div>
          <input
            type="text"
            value={shipName}
            onChange={(e) => setShipName(e.target.value)}
            placeholder="Enter ship name..."
            maxLength={12}
            className="ui5 w-full max-w-xs mx-auto p-4 rounded-md text-black placeholder-gray-400 focus:outline-none focus:border-blue-500"
            autoFocus
          />
          <p className="text-sm text-gray-400 mt-2">
            {shipName.length}/12 characters
          </p>
        </div>

        {/* Referral Code Input - Optional */}
        <div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-sm text-gray-400">Have a referral code?</span>
            <span className="text-xs text-blue-400">(Optional)</span>
          </div>
          <input
            type="text"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            placeholder="REF_A3F2B1"
            maxLength={10}
            className="ui5 w-full max-w-xs mx-auto p-4 rounded-md text-black placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-gray-400 mt-2">
            {referralCode ? `Code: ${referralCode}` : 'Skip if you don\'t have one'}
          </p>
          {referralCode && (
            <p className="text-xs text-green-400 mt-1">
              ✨ You'll receive +100 ARMADA, +200 Gold, and +1 Diamond!
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-md">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <Button variant="secondary" onClick={() => setCurrentStep('faction')}>
          Back
        </Button>
        <Button 
          variant="primary" 
          onClick={handleShipNameSubmit}
          disabled={shipName.trim().length === 0}
        >
          Create Account
        </Button>
      </div>
    </div>
  );

  const renderPortSelectionStep = () => {
    const ports = [
      { 
        id: 25 as const, 
        name: "Port Libertalia", 
        description: "A bustling trading hub in the northern seas",
        climate: "Temperate",
        specialty: "Trade & Commerce"
      },
      { 
        id: 55 as const, 
        name: "Port Royal", 
        description: "The crown jewel of naval operations",
        climate: "Tropical", 
        specialty: "Naval Command"
      },
      { 
        id: 89 as const, 
        name: "Tortuga Bay", 
        description: "A lawless haven for pirates and privateers",
        climate: "Caribbean",
        specialty: "Pirate Haven"
      }
    ];

    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-6">Choose Your Starting Port</h2>
        <p className="text-gray-300 mb-8">
          Select where your {selectedFaction === 'pirate' ? 'pirate' : 'naval'} career will begin.
          Each port offers unique opportunities and challenges.
        </p>

        <div className="grid gap-4 mb-8">
          {ports.map((port) => (
            <div 
              key={port.id}
              className={`cursor-pointer p-4 ui2 rounded-lg hover:scale-105 transition-transform ${
                selectedPort === port.id 
                  ? 'scale-105 !brightness-125 border-2 border-blue-500' 
                  : 'scale-100'
              }`}
              onClick={() => setSelectedPort(port.id)}
            >
              <div className="flex items-center justify-between">
                <div className="text-left flex-1">
                  <h3 className="text-lg font-bold text-[#fbc988] mb-1">
                    {port.name} (Location {port.id})
                  </h3>
                  <p className="text-sm text-gray-300 mb-2">{port.description}</p>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>🌡️ {port.climate}</span>
                    <span>⚓ {port.specialty}</span>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <span className="text-xl">⚓</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-blue-900/30 rounded-lg p-4 mb-6 text-left">
          <h3 className="text-sm font-bold text-blue-300 mb-2">💡 Port Benefits:</h3>
          <ul className="text-xs text-gray-300 space-y-1">
            <li>• Safe zones - no combat allowed</li>
            <li>• Hire crew to restore your workforce</li>
            <li>• Faster ship repairs and maintenance</li>
            <li>• Access to premium services and upgrades</li>
          </ul>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-md">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={() => setCurrentStep('ship-name')}>
            Back
          </Button>
          <Button 
            variant="primary" 
            onClick={() => selectedPort && handlePortSelection(selectedPort)}
            disabled={!selectedPort}
          >
            Start Adventure
          </Button>
        </div>
      </div>
    );
  };

  const renderCreatingStep = () => {
    const getPortName = (portId: number) => {
      switch (portId) {
        case 25: return "Port Libertalia";
        case 55: return "Port Royal";
        case 89: return "Tortuga Bay";
        default: return "Unknown Port";
      }
    };

    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-6">Creating Your Account</h2>
        
        <div className="mb-6">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300 mb-2">
            Setting sail for the Seven Seas Protocol...
          </p>
          <p className="text-sm text-gray-400 mb-1">
            Your ship "{shipName}" is being prepared for {selectedFaction === 'pirate' ? 'piracy' : 'naval service'}
          </p>
          <p className="text-sm text-blue-300">
            Starting at {getPortName(selectedPort || 25)} (Location {selectedPort})
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-md">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
      </div>
    );
  };

  const renderSuccessStep = () => {
    const getPortName = (portId: number) => {
      switch (portId) {
        case 25: return "Port Libertalia";
        case 55: return "Port Royal";
        case 89: return "Tortuga Bay";
        default: return "Unknown Port";
      }
    };

    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-green-400 mb-6">Welcome Aboard, Captain!</h2>
        
        <div className="mb-6">
          <Image 
            src="/ships/0.gif" 
            alt="Your Ship" 
            width={150} 
            height={100}
            className="mx-auto mb-4"
          />
          <p className="text-lg text-white mb-2">
            The "{shipName}" is ready for adventure!
          </p>
          <p className="text-sm text-gray-400 mb-1">
            {selectedFaction === 'pirate' ? 'Pirate' : 'Navy'} • Starting at {getPortName(selectedPort || 25)}
          </p>
          <p className="text-sm text-blue-300">
            Location {selectedPort} • Safe Harbor ⚓
          </p>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 mb-6 text-left">
          <h3 className="text-lg font-bold text-white mb-3">Captain's Tips:</h3>
          <ul className="text-sm text-gray-300 space-y-2">
            <li>• Check in daily to earn gold and maintain your crew</li>
            <li>• Visit ports (locations 25, 55, 89) for faster repairs</li>
            <li>• Attack other players to steal their gold, but beware retaliation!</li>
            <li>• Upgrade your ship with Hull, Cannons, Speed, and Crew improvements</li>
            <li>• Travel to different locations to find the best opportunities</li>
            <li>• Use diamonds for instant repairs and premium upgrades</li>
          </ul>
        </div>

        <Button variant="primary" onClick={handleClose} className="w-full">
          Set Sail! ⚓
        </Button>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'faction':
        return renderFactionStep();
      case 'ship-name':
        return renderShipNameStep();
      case 'port-selection':
        return renderPortSelectionStep();
      case 'creating':
        return renderCreatingStep();
      case 'success':
        return renderSuccessStep();
      default:
        return renderFactionStep();
    }
  };

  return (
    <Modal removeCloseButton open={isOpen} setOpen={currentStep !== 'creating' ? () => handleClose() : () => {}}>
      <div className="w-full max-w-2xl mx-auto p-6">
        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-2">
            {['faction', 'ship-name', 'port-selection', 'creating', 'success'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div 
                  className={`w-3 h-3 rounded-full ${
                    currentStep === step 
                      ? 'bg-blue-500' 
                      : ['faction', 'ship-name', 'port-selection', 'creating', 'success'].indexOf(currentStep) > index
                        ? 'bg-green-500'
                        : 'bg-gray-600'
                  }`}
                />
                {index < 4 && (
                  <div 
                    className={`w-8 h-0.5 ${
                      ['faction', 'ship-name', 'port-selection', 'creating', 'success'].indexOf(currentStep) > index
                        ? 'bg-green-500'
                        : 'bg-gray-600'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {renderCurrentStep()}
      </div>
    </Modal>
  );
} 