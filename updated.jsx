'use client'
import { useState } from 'react';
import { ContractId, AccountId } from "@hashgraph/sdk";
import { Loader2 } from 'lucide-react';
import { 
  useWriteContract, 
  useApproveTokenAllowance, 
  useApproveTokenNftAllowance,
  useAssociateTokens, 
  useWallet, 
  useAccountId 
} from '@buidlerlabs/hashgraph-react-wallets';
import { HashpackConnector } from '@buidlerlabs/hashgraph-react-wallets/connectors';
import CONTRACT_ABI from './abi.json';

const DECIMALS = 8; // Decimal places for the token

export default function AirdropPage() {
  // Wallet connection state
  const { isConnected, disconnect } = useWallet();
  const { data: accountId } = useAccountId();

  // Airdrop type selection
  const [airdropType, setAirdropType] = useState('ERC20'); // 'ERC20' or 'ERC721'

  // Common airdrop form state
  const [tokenAddress, setTokenAddress] = useState('');
  const [expirationTime, setExpirationTime] = useState('');
  const [title, setTitle] = useState('');
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactionStatus, setTransactionStatus] = useState('');

  // ERC20 specific state
  const [totalTokens, setTotalTokens] = useState('');
  const [showPercentageRules, setShowPercentageRules] = useState(false);
  const [firstClaimPercentage, setFirstClaimPercentage] = useState('');
  const [secondClaimPercentage, setSecondClaimPercentage] = useState('');
  const [otherClaimPercentage, setOtherClaimPercentage] = useState('');

  // ERC721 specific state
  const [nftSerials, setNftSerials] = useState('');
  const [nftTokenId, setNftTokenId] = useState('');

  const { writeContract } = useWriteContract();
  const { approve: approveToken } = useApproveTokenAllowance();
  const { approve: approveNft } = useApproveTokenNftAllowance();
  const { associateTokens } = useAssociateTokens();

  const CONTRACT_ID = ContractId.fromString("0.0.6536013"); // Replace with your AirdropSystem contract ID

  const { connect } = useWallet(HashpackConnector);

  const handleConnectWallet = async () => {
    try {
      await connect();
    } catch (err) {
      console.error('Connection error:', err);
      setError(`Wallet connection failed: ${err.message}`);
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      await disconnect();
    } catch (err) {
      console.error('Disconnection error:', err);
      setError(`Wallet disconnection failed: ${err.message}`);
    }
  };

  const handleApproveTokens = async () => {
    if (!tokenAddress) return;

    try {
      setLoading(true);
      setError('');
      setTransactionStatus('Approving tokens...');

      if (airdropType === 'ERC20') {
        const amountInDecimals = Math.floor(Number(totalTokens) * 1e8);
        await approveToken(
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
      } else {
        // For NFTs
        const serials = nftSerials.split(',').map(s => parseInt(s.trim()));
        await approveNft(
          serials.map(serial => ({
            tokenId: tokenAddress,
            serial: serial
          })),
          CONTRACT_ID,
          {
            gas: 800000,
            maxPriorityFeePerGas: 1000000000,
          }
        );
      }

      setTransactionStatus('Tokens approved successfully!');
    } catch (err) {
      console.error('Token approval error:', err);
      setError(`Token approval failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAirdrop = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!tokenAddress || !expirationTime || !title) {
      setError('Please fill in all required fields.');
      return;
    }

    if (airdropType === 'ERC20') {
      if (!totalTokens) {
        setError('Please specify total tokens for ERC20 airdrop.');
        return;
      }

      if (showPercentageRules) {
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
      }
    } else {
      // ERC721 validation
      if (!nftSerials || !nftTokenId) {
        setError('Please specify NFT serials and token ID for ERC721 airdrop.');
        return;
      }
    }

    try {
      await handleApproveTokens(); // Approve tokens/NFTs first
      setLoading(true);
      setError('');
      setTransactionStatus('Creating airdrop...');

      const tokenAccountId = AccountId.fromString(tokenAddress);
      const tokenSolidityAddress = `0x${tokenAccountId.toSolidityAddress()}`;

      const expirationTimestamp = Math.floor(new Date(expirationTime).getTime() / 1000);
      const formattedConditions = conditions.map((condition) => ({
        conditionTokenAddress: `0x${AccountId.fromString(condition.tokenAddress).toSolidityAddress()}`,
        conditionMinBalance: Math.floor(Number(condition.minBalance) * 1e8),
      }));

      if (airdropType === 'ERC20') {
        const totalTokensInWei = Math.floor(Number(totalTokens) * 1e8);
        
        await writeContract({
          contractId: CONTRACT_ID,
          abi: CONTRACT_ABI,
          functionName: 'createERC20Airdrop',
          args: [
            tokenSolidityAddress,
            nftTokenId || "", // Using nftTokenId if available
            expirationTimestamp,
            totalTokensInWei,
            formattedConditions,
            showPercentageRules ? Number(firstClaimPercentage) : 100,
            showPercentageRules ? Number(secondClaimPercentage) : 0,
            showPercentageRules ? Number(otherClaimPercentage) : 0,
            title
          ],
          metaArgs: {
            gas: 2000000,
            maxPriorityFeePerGas: 1000000000,
          },
        });
      } else {
        // ERC721 airdrop
        const serialNumbers = nftSerials.split(',').map(s => parseInt(s.trim()));
        
        await writeContract({
          contractId: CONTRACT_ID,
          abi: CONTRACT_ABI,
          functionName: 'createERC721Airdrop',
          args: [
            tokenSolidityAddress,
            serialNumbers,
            nftTokenId,
            expirationTimestamp,
            formattedConditions,
            title
          ],
          metaArgs: {
            gas: 2000000,
            maxPriorityFeePerGas: 1000000000,
          },
        });
      }

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
        <div className="wallet-section mb-6">
          {isConnected ? (
            <div className="flex items-center justify-between bg-gray-800 p-4 rounded-lg">
              <span className="text-gray-300">
                Connected: <span className="font-mono">{accountId?.toString()}</span>
              </span>
              <button
                onClick={handleDisconnectWallet}
                className="bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2 text-sm"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectWallet}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 px-6 text-lg font-semibold"
            >
              Connect Hashpack Wallet
            </button>
          )}
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-100 mb-6">Create Airdrop</h2>

        {error && (
          <div className="alert-error mb-4">
            <p>{error}</p>
          </div>
        )}

        {transactionStatus && !error && (
          <div className="alert-status mb-4">
            <p>{transactionStatus}</p>
          </div>
        )}

        <div className="form-group mb-4">
          <label className="text-sm font-medium text-gray-300">Airdrop Type</label>
          <div className="flex space-x-4 mt-2">
            <button
              onClick={() => setAirdropType('ERC20')}
              className={`px-4 py-2 rounded-lg ${airdropType === 'ERC20' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              ERC20 Tokens
            </button>
            <button
              onClick={() => setAirdropType('ERC721')}
              className={`px-4 py-2 rounded-lg ${airdropType === 'ERC721' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              ERC721 NFTs
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="text-sm font-medium text-gray-300">Token Address (Hedera ID)</label>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="0.0.xxxx"
            className="input-field"
            disabled={!isConnected}
          />
        </div>

        {airdropType === 'ERC721' && (
          <>
            <div className="form-group">
              <label className="text-sm font-medium text-gray-300">NFT Serial Numbers (comma separated)</label>
              <input
                type="text"
                value={nftSerials}
                onChange={(e) => setNftSerials(e.target.value)}
                placeholder="123,456,789"
                className="input-field"
                disabled={!isConnected}
              />
            </div>
            <div className="form-group">
              <label className="text-sm font-medium text-gray-300">NFT Token ID</label>
              <input
                type="text"
                value={nftTokenId}
                onChange={(e) => setNftTokenId(e.target.value)}
                placeholder="my-nft-collection"
                className="input-field"
                disabled={!isConnected}
              />
            </div>
          </>
        )}

        <div className="form-group">
          <label className="text-sm font-medium text-gray-300">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Awesome Airdrop"
            className="input-field"
            disabled={!isConnected}
          />
        </div>

        <div className="form-group">
          <label className="text-sm font-medium text-gray-300">Expiration Time</label>
          <input
            type="datetime-local"
            value={expirationTime}
            onChange={(e) => setExpirationTime(e.target.value)}
            className="input-field"
            disabled={!isConnected}
          />
        </div>

        {airdropType === 'ERC20' && (
          <>
            <div className="form-group">
              <label className="text-sm font-medium text-gray-300">Total Tokens</label>
              <input
                type="number"
                value={totalTokens}
                onChange={(e) => setTotalTokens(e.target.value)}
                placeholder="1000"
                className="input-field"
                disabled={!isConnected}
              />
            </div>

            <button
              onClick={() => setShowPercentageRules(!showPercentageRules)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 px-4 mb-4"
              disabled={!isConnected}
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
                    disabled={!isConnected}
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
                    disabled={!isConnected}
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
                    disabled={!isConnected}
                  />
                </div>
              </div>
            )}
          </>
        )}

        <div className="conditions-section">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Conditions (Optional)</h3>
          <button
            onClick={addCondition}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 px-4 mb-4"
            disabled={!isConnected}
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
                  disabled={!isConnected}
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
                  disabled={!isConnected}
                />
              </div>
              <button
                onClick={() => removeCondition(index)}
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 px-4 mt-2"
                disabled={!isConnected}
              >
                Remove Condition
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleCreateAirdrop}
          disabled={
            !isConnected ||
            loading ||
            !tokenAddress ||
            !expirationTime ||
            !title ||
            (airdropType === 'ERC20' && !totalTokens) ||
            (airdropType === 'ERC721' && (!nftSerials || !nftTokenId)) ||
            (showPercentageRules && airdropType === 'ERC20' && 
              (Number(firstClaimPercentage) + Number(secondClaimPercentage) + Number(otherClaimPercentage) > 100)
  )}
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
