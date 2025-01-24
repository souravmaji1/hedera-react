'use client'
import { useState } from 'react';
import { ContractId, AccountId } from "@hashgraph/sdk";
import { Loader2 } from 'lucide-react';
import { useWriteContract, useApproveTokenAllowance, useAssociateTokens } from '@buidlerlabs/hashgraph-react-wallets';
import CONTRACT_ABI from '../abis/abi.json';
import './AirTool.css';
import { TokenInfoQuery } from "@hashgraph/sdk";

const DECIMALS = 8; // Decimal places for the token


export default function AirdropPage() {
  const [tokenAddress, setTokenAddress] = useState('');
  const [expirationTime, setExpirationTime] = useState('');
  const [totalTokens, setTotalTokens] = useState('');
  const [conditions, setConditions] = useState([]);
  const [showPercentageRules, setShowPercentageRules] = useState(false);
  const [firstClaimPercentage, setFirstClaimPercentage] = useState('');
  const [secondClaimPercentage, setSecondClaimPercentage] = useState('');
  const [otherClaimPercentage, setOtherClaimPercentage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactionStatus, setTransactionStatus] = useState('');

  const { writeContract } = useWriteContract();
  const { approve } = useApproveTokenAllowance();
  const { associateTokens } = useAssociateTokens();

  const CONTRACT_ID = ContractId.fromString("0.0.5408321"); // Replace with your AirdropSystem contract ID

  const handleApproveTokens = async () => {
    if (!tokenAddress || !totalTokens) return;

    try {
      setLoading(true);
      setError('');
      setTransactionStatus('Approving tokens...');

      const amountInDecimals = Math.floor(Number(totalTokens) * 1e8);

      await approve(
        [{
          tokenId: tokenAddress,
          amount: amountInDecimals
        }],
        CONTRACT_ID,
        {
          gas: 800000,
          maxPriorityFeePerGas: 1000000000,
        }
      );

      setTransactionStatus('Tokens approved successfully!');
    } catch (err) {
      console.error('Token approval error:', err);
      setError(`Token approval failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAirdrop = async () => {
    if (
      !tokenAddress ||
      !expirationTime ||
      !totalTokens ||
      !firstClaimPercentage ||
      !secondClaimPercentage ||
      !otherClaimPercentage
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    const firstPercentage = Number(firstClaimPercentage);
    const secondPercentage = Number(secondClaimPercentage);
    const otherPercentage = Number(otherClaimPercentage);

    if (
      isNaN(firstPercentage) ||
      isNaN(secondPercentage) ||
      isNaN(otherPercentage) ||
      firstPercentage <= 0 ||
      secondPercentage <= 0 ||
      otherPercentage <= 0
    ) {
      setError('Percentages must be positive numbers.');
      return;
    }

    const totalPercentage = firstPercentage + secondPercentage + otherPercentage;
    if (totalPercentage > 100) {
      setError('The sum of percentages must not exceed 100%.');
      return;
    }

    try {
      await handleApproveTokens(); // Approve tokens first
      setLoading(true);
      setError('');
      setTransactionStatus('Creating airdrop...');

      const tokenAccountId = AccountId.fromString(tokenAddress);
      const tokenSolidityAddress = `0x${tokenAccountId.toSolidityAddress()}`;

      const expirationTimestamp = Math.floor(new Date(expirationTime).getTime() / 1000);
      const totalTokensInWei = Math.floor(Number(totalTokens) * 1e8);

      const formattedConditions = conditions.map((condition) => ({
        conditionTokenAddress: `0x${AccountId.fromString(condition.tokenAddress).toSolidityAddress()}`,
        conditionMinBalance: Math.floor(Number(condition.minBalance) * 1e8),
      }));

      await writeContract({
        contractId: CONTRACT_ID,
        abi: CONTRACT_ABI,
        functionName: 'createAirdrop',
        args: [
          tokenSolidityAddress,
          tokenAddress,
          expirationTimestamp,
          totalTokensInWei,
          formattedConditions,
          firstPercentage,
          secondPercentage,
          otherPercentage,
        ],
        metaArgs: {
          gas: 2000000,
          maxPriorityFeePerGas: 1000000000,
        },
      });

      setTransactionStatus('Airdrop created successfully!');
    } catch (err) {
      console.error('Airdrop creation error:', err);
      setError(`Airdrop creation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addCondition = () => {
    setConditions([...conditions, { tokenAddress: "", minBalance: "" }]);
  };

  const updateCondition = (index, field, value) => {
    const updatedConditions = [...conditions];
    updatedConditions[index][field] = value;
    setConditions(updatedConditions);
  };

  const removeCondition = (index) => {
    const updatedConditions = conditions.filter((_, i) => i !== index);
    setConditions(updatedConditions);
  };

  return (
    <div className="airtool-container">
      <div className="airtool-card">
        <h2 className="text-2xl font-bold text-center text-gray-100 mb-6">Create Airdrop</h2>

        {error && (
          <div className="alert-error">
            <p>{error}</p>
          </div>
        )}

        {transactionStatus && !error && (
          <div className="alert-status">
            <p>{transactionStatus}</p>
          </div>
        )}

        <div className="form-group">
          <label className="text-sm font-medium text-gray-300">Token Address (Hedera ID)</label>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="0.0.xxxx"
            className="input-field"
          />
        </div>

        <div className="form-group">
          <label className="text-sm font-medium text-gray-300">Expiration Time</label>
          <input
            type="datetime-local"
            value={expirationTime}
            onChange={(e) => setExpirationTime(e.target.value)}
            className="input-field"
          />
        </div>

        <div className="form-group">
          <label className="text-sm font-medium text-gray-300">Total Tokens</label>
          <input
            type="number"
            value={totalTokens}
            onChange={(e) => setTotalTokens(e.target.value)}
            placeholder="1000"
            className="input-field"
          />
        </div>

        <button
          onClick={() => setShowPercentageRules(!showPercentageRules)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 px-4"
        >
          {showPercentageRules ? 'Hide Percentage Rules' : 'Add Percentage Rules'}
        </button>

        {showPercentageRules && (
          <div className="percentage-rules">
            <div className="form-group">
              <label className="text-sm font-medium text-gray-300">First Claim Percentage (%)</label>
              <input
                type="number"
                value={firstClaimPercentage}
                onChange={(e) => setFirstClaimPercentage(e.target.value)}
                placeholder="50"
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label className="text-sm font-medium text-gray-300">Second Claim Percentage (%)</label>
              <input
                type="number"
                value={secondClaimPercentage}
                onChange={(e) => setSecondClaimPercentage(e.target.value)}
                placeholder="30"
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label className="text-sm font-medium text-gray-300">Other Claim Percentage (%)</label>
              <input
                type="number"
                value={otherClaimPercentage}
                onChange={(e) => setOtherClaimPercentage(e.target.value)}
                placeholder="20"
                className="input-field"
              />
            </div>
          </div>
        )}

        <div className="conditions-section">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Conditions (Optional)</h3>
          <button
            onClick={addCondition}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 px-4 mb-4"
          >
            Add Condition
          </button>

          {conditions.map((condition, index) => (
            <div key={index} className="condition-item bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="form-group">
                <label className="text-sm font-medium text-gray-300">Condition Token Address (Hedera ID)</label>
                <input
                  type="text"
                  value={condition.tokenAddress}
                  onChange={(e) => updateCondition(index, 'tokenAddress', e.target.value)}
                  placeholder="0.0.12345"
                  className="input-field"
                />
              </div>
              <div className="form-group">
                <label className="text-sm font-medium text-gray-300">Minimum Balance Required</label>
                <input
                  type="number"
                  value={condition.minBalance}
                  onChange={(e) => updateCondition(index, 'minBalance', e.target.value)}
                  placeholder="100"
                  className="input-field"
                />
              </div>
              <button
                onClick={() => removeCondition(index)}
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 px-4 mt-2"
              >
                Remove Condition
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleCreateAirdrop}
          disabled={
            loading ||
            !tokenAddress ||
            !expirationTime ||
            !totalTokens ||
            !firstClaimPercentage ||
            !secondClaimPercentage ||
            !otherClaimPercentage ||
            (showPercentageRules && (Number(firstClaimPercentage) + Number(secondClaimPercentage) + Number(otherClaimPercentage) > 100))
          }
          className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg mt-4 flex items-center justify-center"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {transactionStatus}
            </>
          ) : (
            'Create Airdrop'
          )}
        </button>
      </div>
    </div>
  );
}