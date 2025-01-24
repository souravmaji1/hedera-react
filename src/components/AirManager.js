import { useState, useEffect } from 'react';
import React from 'react';
import { ethers } from 'ethers';
import CONTRACT_ABI from '../abis/abi.json';
import { ContractId, AccountId } from "@hashgraph/sdk";
import { useWriteContract, useApproveTokenAllowance, useAssociateTokens } from '@buidlerlabs/hashgraph-react-wallets';
import { useWallet, useAccountId } from '@buidlerlabs/hashgraph-react-wallets';
import { HashpackConnector } from '@buidlerlabs/hashgraph-react-wallets/connectors';
import './AirManager.css';

const CONTRACT_EVM_ADDRESS = '0x8ce836B95599C23b1354570A1c42B8B0d7C0bE3f'; // Replace with your contract address

export default function AirdropPage() {
  const [creatorAirdrops, setCreatorAirdrops] = useState([]);
  const [selectedAirdropId, setSelectedAirdropId] = useState('');
  const [whitelistAddress, setWhitelistAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactionStatus, setTransactionStatus] = useState('');
  const { data: accountId } = useAccountId();
  const { writeContract } = useWriteContract();

  const CONTRACT_ID = ContractId.fromString("0.0.5408321");

  const { connect, disconnect, isConnected } = useWallet(HashpackConnector);


  
  // Fetch EVM address from Hedera account ID
  const fetchEvmAddress = async (accountId) => {
    try {
      const response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`);
      const data = await response.json();
      return data.evm_address; // This is the EVM address displayed on HederaScan
    } catch (err) {
      console.error('Error fetching EVM address:', err);
      return null;
    }
  };

  // Fetch airdrops created by the connected wallet
  const fetchAirdropsByCreator = async () => {
    if (!accountId) return;

    setLoading(true);
    setError('');

    try {
      const evmAddress = await fetchEvmAddress(accountId);
      if (!evmAddress) {
        throw new Error('Failed to fetch EVM address for the connected account.');
      }

      const provider = new ethers.JsonRpcProvider('https://testnet.hashio.io/api');
      const contract = new ethers.Contract(CONTRACT_EVM_ADDRESS, CONTRACT_ABI, provider);

      const airdropDetails = await contract.getAirdropsByCreator(evmAddress);

      const formattedAirdrops = airdropDetails.ids.map((id, index) => ({
        id: id.toString(),
        tokenAddress: airdropDetails.tokenAddresses[index],
        expirationTime: new Date(Number(airdropDetails.expirationTimes[index]) * 1000).toLocaleString(),
        totalTokens: ethers.formatUnits(airdropDetails.totalTokens[index], 8),
        claimedTokens: ethers.formatUnits(airdropDetails.claimedTokens[index], 8),
        isActive: airdropDetails.isActive[index] ? 'Active' : 'Inactive',
        conditions: airdropDetails.conditions[index].map((condition) => ({
          conditionTokenAddress: condition.conditionTokenAddress,
          conditionMinBalance: ethers.formatUnits(condition.conditionMinBalance, 8),
        })),
      }));

      setCreatorAirdrops(formattedAirdrops);
    } catch (err) {
      console.error('Error fetching airdrops by creator:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add address to whitelist
  const handleAddToWhitelist = async () => {
    if (!selectedAirdropId || !whitelistAddress) {
      setError('Please select an airdrop and provide a whitelist address.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setTransactionStatus('Adding to whitelist...');

      const evmAddress = await fetchEvmAddress(whitelistAddress);

      const usersToWhitelist = [evmAddress];

      await writeContract({
        contractId: CONTRACT_ID,
        abi: CONTRACT_ABI,
        functionName: 'addToWhitelist',
        args: [selectedAirdropId, usersToWhitelist],
        metaArgs: {
          gas: 500000,
          maxPriorityFeePerGas: 1000000000,
        },
      });

      setTransactionStatus('Address added to whitelist successfully!');
      setWhitelistAddress('');
    } catch (err) {
      console.error('Error adding to whitelist:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Connect wallet
  useEffect(() => {
    if (accountId) {
      fetchAirdropsByCreator();
    }
  }, [accountId]);

  return (
    <div className="airmanager-container">
      <h1 className="section-title">Airdrop Manager</h1>

      {!isConnected ? (
        <div className="flex justify-center">
          <button
            onClick={connect}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
          >
            Connect HashPack Wallet
          </button>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          {/* Error and Transaction Status */}
          {error && (
            <div className="bg-red-600 text-white p-4 rounded mb-4">
              <p>{error}</p>
            </div>
          )}
          {transactionStatus && (
            <div className="bg-green-600 text-white p-4 rounded mb-4">
              <p>{transactionStatus}</p>
            </div>
          )}

          {/* Airdrop Selection */}
          <div className="mb-8">
            <label className="section-subtitle">Select Airdrop:</label>
            <select
              value={selectedAirdropId}
              onChange={(e) => setSelectedAirdropId(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            >
              <option value="" disabled>Select an Airdrop</option>
              {creatorAirdrops.map((airdrop) => (
                <option key={airdrop.id} value={airdrop.id}>
                  Airdrop ID: {airdrop.id} - Token: {airdrop.tokenAddress}
                </option>
              ))}
            </select>
          </div>

          {/* Whitelist Address Input */}
          <div className="mb-8">
            <label className="section-subtitle">Add to Whitelist:</label>
            <input
              type="text"
              value={whitelistAddress}
              onChange={(e) => setWhitelistAddress(e.target.value)}
              placeholder="Enter EVM address"
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            />
            <button
              onClick={handleAddToWhitelist}
              disabled={loading || !selectedAirdropId || !whitelistAddress}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
            >
              {loading ? 'Adding...' : 'Add to Whitelist'}
            </button>
          </div>

          {/* Airdrop List */}
          <div className="airdrops-list">
            <h2 className="section-title">Your Airdrops</h2>
            {creatorAirdrops.length > 0 ? (
              <div className="space-y-4">
                {creatorAirdrops.map((airdrop) => (
                  <div key={airdrop.id} className="airdrop-item">
                    <p><strong>ID:</strong> {airdrop.id}</p>
                    <p><strong>Token Address:</strong> {airdrop.tokenAddress}</p>
                    <p><strong>Expiration Time:</strong> {airdrop.expirationTime}</p>
                    <p><strong>Total Tokens:</strong> {airdrop.totalTokens}</p>
                    <p><strong>Claimed Tokens:</strong> {airdrop.claimedTokens}</p>
                    <p><strong>Status:</strong> {airdrop.isActive}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>No airdrops found for your address.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}