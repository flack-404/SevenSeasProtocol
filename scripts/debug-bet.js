const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://testnet-rpc.monad.xyz');
const PLAYER_PK = '0x2339234f2974ad7a958b9df78eab2c5eae2b93c7463329c5e60ac936485cfcd0';
const player = new ethers.Wallet(PLAYER_PK, provider);
const PM = '0x2364f8B4319C524B7a946Df69d668134d45A3809';
const SEAS = '0x91DBBCc719a8F34c273a787D0014EDB9d456cdf6';

const seas = new ethers.Contract(SEAS, [
  'function allowance(address,address) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
], provider);
const pm = new ethers.Contract(PM, [
  'function predictions(uint256) view returns (uint256,address,address,uint256,uint256,bool,bool,address)',
  'function bets(uint256,address) view returns (uint256,bool,bool)',
], provider);

(async () => {
  const addr = player.address;
  const bal = await seas.balanceOf(addr);
  const allowance = await seas.allowance(addr, PM);
  const pred = await pm.predictions(6);
  const existingBet = await pm.bets(6, addr);

  console.log('Player balance:', ethers.formatEther(bal));
  console.log('PM allowance :', ethers.formatEther(allowance));
  console.log('Pred 6 isOpen:', pred[5], '| isSettled:', pred[6]);
  console.log('Existing bet: amount:', ethers.formatEther(existingBet[0]), '| betOnAgent1:', existingBet[1], '| claimed:', existingBet[2]);

  const betAmount = ethers.parseEther('10');
  const existingAmount = existingBet[0];
  const existingClaimed = existingBet[2];
  const existingSide = existingBet[1];
  const betOnAgent1 = false;

  console.log('\nConditions:');
  console.log('isOpen:', pred[5]);
  console.log('not settled:', pred[6] === false);
  console.log('amount >= 1 SEAS:', betAmount >= ethers.parseEther('1'));
  console.log('not claimed:', existingClaimed === false);
  console.log('amount==0 or same side:', existingAmount === 0n || existingSide === betOnAgent1);
  console.log('Full "switch sides" check:', (existingClaimed === false) && (existingAmount === 0n || existingSide === betOnAgent1));

  // Check SEAS contract behavior
  const seas2 = new ethers.Contract(SEAS, [
    'function balanceOf(address) view returns (uint256)',
  ], provider);
  const pmBal = await seas2.balanceOf(PM);
  console.log('\nPM SEAS balance:', ethers.formatEther(pmBal));
})().catch(console.error);
