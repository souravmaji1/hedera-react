
import { useState, useEffect, useCallback } from 'react';
import { ContractId, AccountId } from "@hashgraph/sdk";
import { createClient } from '@supabase/supabase-js';
import { useWallet, useReadContract, useWriteContract, useApproveTokenAllowance, useAssociateTokens } from '@buidlerlabs/hashgraph-react-wallets';
import { useAccountId } from '@buidlerlabs/hashgraph-react-wallets'
import { HashpackConnector } from '@buidlerlabs/hashgraph-react-wallets/connectors'
import { ethers } from 'ethers';
import CONTRACT_ABI from '../abis/abi.json'
import './Claim.css'

const CONTRACT_ID = ContractId.fromString("0.0.5408321"); // Replace with your AirdropSystem contract ID
const contractAddress = '0x8ce836B95599C23b1354570A1c42B8B0d7C0bE3f';
const SAUCE_TOKEN_ID = "0.0.1183558";

export default function AirdropPage() {
  const [eligibleAirdrops, setEligibleAirdrops] = useState([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactionStatus, setTransactionStatus] = useState('');
  const { associateTokens } = useAssociateTokens();
  const { isExtensionRequired, extensionReady, isConnected, connect, disconnect, connector } =
    useWallet(HashpackConnector);
  const { readContract } = useReadContract();
  const { writeContract } = useWriteContract();
  const { data: accountId } = useAccountId();

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

  const handleClaimTokens = async (airdropId, tokenId) => {
    if (!airdropId || !accountId || !tokenId) return;
  
    try {
      setEligibleLoading(true);
      setError('');
      setTransactionStatus('Checking token association...');
  
      // Check if the token is already associated
      const isAssociated = await verifyTokenAssociation(tokenId);
      if (!isAssociated) {
        setTransactionStatus('Token not associated. Associating token...');
        await associateTokens([tokenId], {
          gas: 400000,
          maxPriorityFeePerGas: 1000000000,
        });
        setTransactionStatus('Token associated successfully!');
      } else {
        setTransactionStatus('Token is already associated.');
      }
  
      // Proceed with the claim
      setTransactionStatus('Claiming tokens...');
      await writeContract({
        contractId: CONTRACT_ID,
        abi: CONTRACT_ABI,
        functionName: 'claimTokens',
        args: [airdropId],
        metaArgs: {
          gas: 1000000,
          maxPriorityFeePerGas: 1000000000,
        }
      });
  
      setTransactionStatus('Tokens claimed successfully!');
      fetchEligibleAirdrops(); // Refresh the list after claiming
    } catch (err) {
      console.error('Token claim error:', err);
      setError(`Token claim failed: ${err.message}`);
    } finally {
      setEligibleLoading(false);
    }
  };

  const verifyTokenAssociation = async (tokenId) => {
    if (!accountId) return false;

    try {
      const htsPrecompile = "0x0000000000000000000000000000000000000167";
      const response = await readContract({
        address: htsPrecompile,
        abi: [{
          "inputs": [
            { "type": "address", "name": "token" },
            { "type": "address", "name": "account" }
          ],
          "name": "isTokenAssociated",
          "outputs": [{ "type": "bool" }],
          "stateMutability": "view",
          "type": "function"
        }],
        functionName: 'isTokenAssociated',
        args: [
          `0x${AccountId.fromString(tokenId).toSolidityAddress()}`,
          `0x${AccountId.fromString(accountId).toSolidityAddress()}`
        ]
      });

      return response;
    } catch (err) {
      console.error('Token association verification failed:', err);
      return false;
    }
  };

  const fetchEligibleAirdrops = async () => {
    if (!accountId) return;

    setEligibleLoading(true);
    setError('');

    try {
      const evmAddress = await fetchEvmAddress(accountId);
      const provider = new ethers.JsonRpcProvider('https://testnet.hashio.io/api');
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);

      const airdropDetails = await contract.getEligibleAirdrops(evmAddress);

      const formattedAirdrops = airdropDetails.map((airdrop) => ({
        id: airdrop.id.toString(),
        tokenAddress: airdrop.tokenAddress,
        tokenId: airdrop.tokenId,
        expirationTime: new Date(Number(airdrop.expirationTime) * 1000).toLocaleString(),
        totalTokens: ethers.formatUnits(airdrop.totalTokens, 8),
        claimedTokens: ethers.formatUnits(airdrop.claimedTokens, 8),
        isActive: airdrop.isActive ? 'Active' : 'Inactive',
        claimableAmount: ethers.formatUnits(airdrop.claimableAmount, 8),
        conditions: airdrop.conditions.map((condition) => ({
          conditionTokenAddress: condition.conditionTokenAddress,
          conditionMinBalance: ethers.formatUnits(condition.conditionMinBalance, 8),
        })),
        firstClaimPercentage: airdrop.firstClaimPercentage,
        secondClaimPercentage: airdrop.secondClaimPercentage,
        otherClaimPercentage: airdrop.otherClaimPercentage,
        isWhitelisted: airdrop.isWhitelisted,
      }));

      setEligibleAirdrops(formattedAirdrops);
    } catch (err) {
      console.error('Error fetching eligible airdrops:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setEligibleLoading(false);
    }
  };

  useEffect(() => {
    if (accountId) {
      fetchEligibleAirdrops();
    }
  }, [accountId]);

  return (
    <div className="claim-container">
      {!accountId ? (
        <button
          className="connect-wallet-button"
          onClick={connect}
        >
          Connect Wallet
        </button>
      ) : (
        <div className="eligible-airdrops-section">
          <h2 className="section-title">Eligible Airdrops</h2>

          {eligibleLoading && (
            <div className="loading-spinner">
              Loading...
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {eligibleAirdrops.length > 0 ? (
            <div className="airdrops-list">
              {eligibleAirdrops.map((airdrop) => (
                <div key={airdrop.id} className="airdrop-item">
                  <p><strong>ID:</strong> {airdrop.id}</p>
                  <p><strong>Token Address:</strong> {airdrop.tokenAddress}</p>
                  <p><strong>Token ID:</strong> {airdrop.tokenId}</p>
                  <p><strong>Expiration Time:</strong> {airdrop.expirationTime}</p>
                  <p><strong>Total Tokens:</strong> {airdrop.totalTokens}</p>
                  <p><strong>Claimed Tokens:</strong> {airdrop.claimedTokens}</p>
                  <p><strong>Claimable Amount:</strong> {airdrop.claimableAmount}</p>
                  <p><strong>Status:</strong> {airdrop.isActive}</p>

                  <div className="conditions">
                    <h4 className="condition-title">Conditions:</h4>
                    {airdrop.conditions.length > 0 ? (
                      airdrop.conditions.map((condition, index) => (
                        <div key={index} className="condition-item">
                          <p><strong>Token Address:</strong> {condition.conditionTokenAddress}</p>
                          <p><strong>Minimum Balance:</strong> {condition.conditionMinBalance}</p>
                        </div>
                      ))
                    ) : (
                      <p>No conditions set.</p>
                    )}
                  </div>

                  <button
                    className="claim-button"
                    onClick={() => handleClaimTokens(airdrop.id, airdrop.tokenId)}
                  >
                    Claim Tokens
                  </button>
                </div>
              ))}
            </div>
          ) : !eligibleLoading && (
            <p className="no-airdrops-message">No eligible airdrops found for your address.</p>
          )}
        </div>
      )}
    </div>
  );
}