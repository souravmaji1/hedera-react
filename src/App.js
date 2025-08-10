'use client'
import { useState, useEffect } from 'react';
import { ContractId, AccountId } from "@hashgraph/sdk";
import { Loader2, PlusCircle, Trash2, Check, X } from 'lucide-react';
import { 
  useWriteContract, 
  useReadContract,
  useApproveTokenAllowance, 
  useApproveTokenNftAllowance,
  useAssociateTokens, 
  useWallet, 
  useAccountId 
} from '@buidlerlabs/hashgraph-react-wallets';
import { HashpackConnector } from '@buidlerlabs/hashgraph-react-wallets/connectors';
import { ethers } from 'ethers';
import CONTRACT_ABI from './abi.json';

const DECIMALS = 8; // Decimal places for the token
const CONTRACT_ID = ContractId.fromString("0.0.6540408"); // Replace with your AirdropSystem contract ID
const CONTRACT_ADDRESS = "0xb3cd9531395a734bab3d1f014ff3c6c21cb01064"; // Replace with your contract's Solidity address

export default function AirdropSystem() {
  // Wallet connection state
  const { isConnected, disconnect } = useWallet();
  const { data: accountId } = useAccountId();
  const { connect } = useWallet(HashpackConnector);

  // Tab state
  const [activeTab, setActiveTab] = useState('create'); // 'create', 'my-airdrops', 'claim'

  // Airdrop creation state
  const [airdropType, setAirdropType] = useState('ERC20');
  const [tokenAddress, setTokenAddress] = useState('');
  const [expirationTime, setExpirationTime] = useState('');
  const [title, setTitle] = useState('');
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactionStatus, setTransactionStatus] = useState('');
  const [totalTokens, setTotalTokens] = useState('');
  const [showPercentageRules, setShowPercentageRules] = useState(false);
  const [firstClaimPercentage, setFirstClaimPercentage] = useState('0');
  const [secondClaimPercentage, setSecondClaimPercentage] = useState('0');
  const [otherClaimPercentage, setOtherClaimPercentage] = useState('0');
  const [nftSerials, setNftSerials] = useState('');
  const [nftTokenId, setNftTokenId] = useState('');

  // My Airdrops state
  const [myAirdrops, setMyAirdrops] = useState([]);
  const [loadingMyAirdrops, setLoadingMyAirdrops] = useState(false);
  const [selectedAirdrop, setSelectedAirdrop] = useState(null);
  const [whitelistAddresses, setWhitelistAddresses] = useState('');
  const [removeWhitelistAddresses, setRemoveWhitelistAddresses] = useState('');

  // Claim Airdrops state
  const [eligibleAirdrops, setEligibleAirdrops] = useState([]);
  const [loadingEligibleAirdrops, setLoadingEligibleAirdrops] = useState(false);

  const { writeContract } = useWriteContract();
  const { readContract } = useReadContract();
  const { approve: approveToken } = useApproveTokenAllowance();
  const { approve: approveNft } = useApproveTokenNftAllowance();

  const getEvmAddressFromAccountId = async (accountId) => {
  try {
    const response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch account info: ${response.status}`);
    }
    const data = await response.json();
    
    if (!data.evm_address) {
      throw new Error('EVM address not found for this account');
    }
    
    return data.evm_address;
  } catch (error) {
    console.error('Error fetching EVM address:', error);
    throw error;
  }
}

  // Connect wallet handler
  const handleConnectWallet = async () => {
    try {
      await connect();
    } catch (err) {
      console.error('Connection error:', err);
      setError(`Wallet connection failed: ${err.message}`);
    }
  };

  // Disconnect wallet handler
  const handleDisconnectWallet = async () => {
    try {
      await disconnect();
    } catch (err) {
      console.error('Disconnection error:', err);
      setError(`Wallet disconnection failed: ${err.message}`);
    }
  };

  // Helper function to get the provider and contract instance
  const getContractInstance = () => {
    const provider = new ethers.JsonRpcProvider("https://testnet.hashio.io/api");
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  };

  // Approve tokens handler
  const handleApproveTokens = async () => {
    if (!tokenAddress) return;

    try {
      setLoading(true);
      setError('');
      setTransactionStatus('Approving tokens...');

      const tokenInfo = await fetchTokenInfo(tokenAddress);
      const decimals = tokenInfo.decimals;
      const multiplier = 10 ** decimals;

      if (airdropType === 'ERC20') {
        const amountInDecimals = Math.floor(Number(totalTokens) * multiplier);
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
      return { success: true, decimals };
    } catch (err) {
      console.error('Token approval error:', err);
      setError(`Token approval failed: ${err.message}`);
      return { success: false, decimals: 8 };
    } finally {
      setLoading(false);
    }
  };

  // Create airdrop handler
  const handleCreateAirdrop = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!tokenAddress || !expirationTime || !title) {
      setError('Please fill in all required fields.');
      return;
    }

    if (airdropType === 'ERC20' && !totalTokens) {
      setError('Please specify total tokens for ERC20 airdrop.');
      return;
    }

    if (airdropType === 'ERC721' && !nftSerials) {
      setError('Please specify NFT serials for ERC721 airdrop.');
      return;
    }

    try {
      const { success, decimals } = await handleApproveTokens();
      if (!success) return;

      setLoading(true);
      setError('');
      setTransactionStatus('Creating airdrop...');

      const tokenAccountId = AccountId.fromString(tokenAddress);
     // const tokenSolidityAddress = `0x${tokenAccountId.toSolidityAddress()}`;
      const tokenSolidityAddress  = await getEvmAddressFromAccountId(accountId.toString());
      const expirationTimestamp = Math.floor(new Date(expirationTime).getTime() / 1000);

      const formattedConditions = await Promise.all(conditions.map(async (condition) => {
        const tokenInfo = await fetchTokenInfo(condition.tokenAddress);
        const conditionDecimals = tokenInfo.decimals || 8;
        const multiplier = 10 ** conditionDecimals;
        
        return {
          conditionType: condition.conditionType === 'NFT_COLLECTION' ? 1 : 0,
          conditionTokenAddress: `0x${AccountId.fromString(condition.tokenAddress).toSolidityAddress()}`,
          conditionMinBalance: Math.floor(Number(condition.minBalance) * multiplier)
        };
      }));

      if (airdropType === 'ERC20') {
        const totalTokensInDecimals = Math.floor(Number(totalTokens) * (10 ** decimals));
        
        await writeContract({
          contractId: CONTRACT_ID,
          abi: CONTRACT_ABI,
          functionName: 'createERC20Airdrop',
          args: [
            tokenSolidityAddress,
            nftTokenId || "",
            expirationTimestamp,
            totalTokensInDecimals,
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
        const serialNumbers = nftSerials.split(',').map(s => parseInt(s.trim()));
        
        await writeContract({
          contractId: CONTRACT_ID,
          abi: CONTRACT_ABI,
          functionName: 'createERC721Airdrop',
          args: [
            tokenSolidityAddress,
            serialNumbers,
            tokenAccountId,
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
      // Reset form
      setTokenAddress('');
      setExpirationTime('');
      setTitle('');
      setConditions([]);
      setTotalTokens('');
      setNftSerials('');
      setNftTokenId('');
    } catch (err) {
      console.error('Airdrop creation error:', err);
      setError(`Airdrop creation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch airdrops created by the current user
  const fetchMyAirdrops = async () => {
  if (!isConnected || !accountId) return;

  try {
    setLoadingMyAirdrops(true);
    setError('');
    
    const contract = getContractInstance();
  //  const accountSolidityAddress = `0x${AccountId.fromString(accountId.toString()).toSolidityAddress()}`;

   const accountSolidityAddress  = await getEvmAddressFromAccountId(accountId.toString());

    console.log(accountSolidityAddress)
    
    const result = await contract.getAirdropsByCreator(accountSolidityAddress);
    
    // Convert the result to a more usable format
    const formattedAirdrops = result.map(airdrop => {
      // Extract conditions array properly
      let conditions = [];
      try {
        conditions = airdrop[11].map(cond => ({
          conditionType: Number(cond[0]),
          conditionTokenAddress: cond[1],
          conditionMinBalance: Number(cond[2])
        }));
      } catch (e) {
        console.error('Error parsing conditions:', e);
      }

      // Extract available NFT IDs
      let availableNftIds = [];
      try {
        availableNftIds = airdrop[16]?.map(id => Number(id)) || [];
      } catch (e) {
        console.error('Error parsing NFT IDs:', e);
      }

      return {
        id: Number(airdrop[0]),
        tokenType: Number(airdrop[1]),
        tokenAddress: airdrop[2],
        tokenId: airdrop[3],
        title: airdrop[4],
        expirationTime: Number(airdrop[5]),
        totalTokens: Number(airdrop[6]),
        claimedTokens: Number(airdrop[7]),
        isActive: airdrop[8],
        isPaused: airdrop[9],
        claimableAmount: Number(airdrop[10]),
        firstClaimPercentage: Number(airdrop[12]),
        secondClaimPercentage: Number(airdrop[13]),
        otherClaimPercentage: Number(airdrop[14]),
        isWhitelisted: airdrop[15],
        conditions: conditions,
        availableNftIds: availableNftIds
      };
    });

    setMyAirdrops(formattedAirdrops);
  } catch (err) {
    console.error('Error fetching my airdrops:', err);
    setError(`Failed to fetch your airdrops: ${err.message}`);
  } finally {
    setLoadingMyAirdrops(false);
  }
};

  // Fetch eligible airdrops for the current user
  const fetchEligibleAirdrops = async () => {
  if (!isConnected || !accountId) return;

  try {
    setLoadingEligibleAirdrops(true);
    setError('');
    
    const contract = getContractInstance();
   // const accountSolidityAddress = `0x${AccountId.fromString(accountId.toString()).toSolidityAddress()}`;
 const accountSolidityAddress  = await getEvmAddressFromAccountId(accountId.toString());

    console.log(accountSolidityAddress)
    
    const result = await contract.getEligibleAirdrops(accountSolidityAddress);
    console.log(result)
    
    const formattedAirdrops = result.map(airdrop => {
      let conditions = [];
      try {
        conditions = airdrop[11].map(cond => ({
          conditionType: Number(cond[0]),
          conditionTokenAddress: cond[1],
          conditionMinBalance: Number(cond[2])
        }));
      } catch (e) {
        console.error('Error parsing conditions:', e);
      }

      let availableNftIds = [];
      try {
        availableNftIds = airdrop[16]?.map(id => Number(id)) || [];
      } catch (e) {
        console.error('Error parsing NFT IDs:', e);
      }

      return {
        id: Number(airdrop[0]),
        tokenType: Number(airdrop[1]),
        tokenAddress: airdrop[2],
        tokenId: airdrop[3],
        title: airdrop[4],
        expirationTime: Number(airdrop[5]),
        totalTokens: Number(airdrop[6]),
        claimedTokens: Number(airdrop[7]),
        isActive: airdrop[8],
        isPaused: airdrop[9],
        claimableAmount: Number(airdrop[10]),
        firstClaimPercentage: Number(airdrop[12]),
        secondClaimPercentage: Number(airdrop[13]),
        otherClaimPercentage: Number(airdrop[14]),
        isWhitelisted: airdrop[15],
        conditions: conditions,
        availableNftIds: availableNftIds
      };
    });

    setEligibleAirdrops(formattedAirdrops);
  } catch (err) {
    console.error('Error fetching eligible airdrops:', err);
    setError(`Failed to fetch eligible airdrops: ${err.message}`);
  } finally {
    setLoadingEligibleAirdrops(false);
  }
};

  // Pause an airdrop
  const handlePauseAirdrop = async (airdropId) => {
    try {
      setLoading(true);
      setError('');
      setTransactionStatus('Pausing airdrop...');

      await writeContract({
        contractId: CONTRACT_ID,
        abi: CONTRACT_ABI,
        functionName: 'pauseAirdrop',
        args: [airdropId],
        metaArgs: {
          gas: 1000000,
          maxPriorityFeePerGas: 1000000000,
        },
      });

      setTransactionStatus('Airdrop paused successfully!');
      fetchMyAirdrops();
    } catch (err) {
      console.error('Error pausing airdrop:', err);
      setError(`Failed to pause airdrop: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Resume an airdrop
  const handleResumeAirdrop = async (airdropId) => {
    try {
      setLoading(true);
      setError('');
      setTransactionStatus('Resuming airdrop...');

      await writeContract({
        contractId: CONTRACT_ID,
        abi: CONTRACT_ABI,
        functionName: 'resumeAirdrop',
        args: [airdropId],
        metaArgs: {
          gas: 1000000,
          maxPriorityFeePerGas: 1000000000,
        },
      });

      setTransactionStatus('Airdrop resumed successfully!');
      fetchMyAirdrops();
    } catch (err) {
      console.error('Error resuming airdrop:', err);
      setError(`Failed to resume airdrop: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Deactivate an airdrop
  const handleDeactivateAirdrop = async (airdropId) => {
    try {
      setLoading(true);
      setError('');
      setTransactionStatus('Deactivating airdrop...');

      await writeContract({
        contractId: CONTRACT_ID,
        abi: CONTRACT_ABI,
        functionName: 'deactivateAirdrop',
        args: [airdropId],
        metaArgs: {
          gas: 1000000,
          maxPriorityFeePerGas: 1000000000,
        },
      });

      setTransactionStatus('Airdrop deactivated successfully!');
      fetchMyAirdrops();
    } catch (err) {
      console.error('Error deactivating airdrop:', err);
      setError(`Failed to deactivate airdrop: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Claim tokens from an airdrop
  const handleClaimTokens = async (airdropId) => {
    try {
      setLoading(true);
      setError('');
      setTransactionStatus('Claiming tokens...');

      await writeContract({
        contractId: CONTRACT_ID,
        abi: CONTRACT_ABI,
        functionName: 'claimTokens',
        args: [airdropId],
        metaArgs: {
          gas: 1000000,
          maxPriorityFeePerGas: 1000000000,
        },
      });

      setTransactionStatus('Tokens claimed successfully!');
      fetchEligibleAirdrops();
    } catch (err) {
      console.error('Error claiming tokens:', err);
      setError(`Failed to claim tokens: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add users to whitelist
  const handleAddToWhitelist = async () => {
    if (!selectedAirdrop || !whitelistAddresses) return;

    try {
      setLoading(true);
      setError('');
      setTransactionStatus('Adding to whitelist...');

    //  const addresses = whitelistAddresses.split(',').map(addr => addr.trim());
     // const formattedAddresses = addresses.map(addr => `0x${AccountId.fromString(addr).toSolidityAddress()}`);

      const addresses = whitelistAddresses.split(',').map(addr => addr.trim());
    const formattedAddresses = await Promise.all(
      addresses.map(async addr => await getEvmAddressFromAccountId(addr))
    );

      await writeContract({
        contractId: CONTRACT_ID,
        abi: CONTRACT_ABI,
        functionName: 'addToWhitelist',
        args: [selectedAirdrop.id, formattedAddresses],
        metaArgs: {
          gas: 1000000,
          maxPriorityFeePerGas: 1000000000,
        },
      });

      setTransactionStatus('Successfully added to whitelist!');
      setWhitelistAddresses('');
      fetchMyAirdrops();
    } catch (err) {
      console.error('Error adding to whitelist:', err);
      setError(`Failed to add to whitelist: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Remove users from whitelist
  const handleRemoveFromWhitelist = async () => {
  if (!selectedAirdrop || !removeWhitelistAddresses) return;

  try {
    setLoading(true);
    setError('');
    setTransactionStatus('Removing from whitelist...');

    // Split the input into individual account IDs
    const addresses = removeWhitelistAddresses.split(',').map(addr => addr.trim());
    
    // Convert each account ID to EVM address using Mirror Node API
    const formattedAddresses = await Promise.all(
      addresses.map(async addr => await getEvmAddressFromAccountId(addr))
    );

    await writeContract({
      contractId: CONTRACT_ID,
      abi: CONTRACT_ABI,
      functionName: 'removeFromWhitelist',
      args: [selectedAirdrop.id, formattedAddresses],
      metaArgs: {
        gas: 1000000,
        maxPriorityFeePerGas: 1000000000,
      },
    });

    setTransactionStatus('Successfully removed from whitelist!');
    setRemoveWhitelistAddresses('');
    fetchMyAirdrops();
  } catch (err) {
    console.error('Error removing from whitelist:', err);
    setError(`Failed to remove from whitelist: ${err.message}`);
  } finally {
    setLoading(false);
  }
};

  // Condition management functions
  const addCondition = () => {
    setConditions([...conditions, { 
      tokenAddress: "", 
      minBalance: "", 
      conditionType: "ERC20_BALANCE" 
    }]);
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

  // Fetch token info from mirror node
  async function fetchTokenInfo(tokenId) {
    try {
      const response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/tokens/${tokenId}`);
      if (!response.ok) throw new Error(`Failed to fetch token info: ${response.status}`);
      const data = await response.json();
      return {
        decimals: data.decimals || 8,
        symbol: data.symbol,
        name: data.name
      };
    } catch (error) {
      console.error('Error fetching token info:', error);
      return { decimals: 8, symbol: '', name: '' };
    }
  }

  // Fetch data when wallet connects or tab changes
  useEffect(() => {
    if (isConnected) {
      if (activeTab === 'my-airdrops') {
        fetchMyAirdrops();
      } else if (activeTab === 'claim') {
        fetchEligibleAirdrops();
      }
    }
  }, [isConnected, activeTab]);

  return (
    <div className="airdrop-system-container">
      <div className="airdrop-system-card">
        {/* Wallet Connection Section */}
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

        {/* Navigation Tabs */}
        <div className="tabs mb-6">
          <button
            onClick={() => setActiveTab('create')}
            className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
          >
            Create Airdrop
          </button>
          <button
            onClick={() => setActiveTab('my-airdrops')}
            className={`tab-button ${activeTab === 'my-airdrops' ? 'active' : ''}`}
          >
            My Airdrops
          </button>
          <button
            onClick={() => setActiveTab('claim')}
            className={`tab-button ${activeTab === 'claim' ? 'active' : ''}`}
          >
            Claim Airdrops
          </button>
        </div>

        {/* Status Messages */}
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

        {/* Create Airdrop Tab */}
        {activeTab === 'create' && (
          <div className="create-airdrop-tab">
            <h2 className="text-2xl font-bold text-center text-gray-100 mb-6">Create Airdrop</h2>

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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 px-4 mb-4 flex items-center justify-center"
                disabled={!isConnected}
              >
                <PlusCircle className="mr-2" size={18} />
                Add Condition
              </button>

              {conditions.map((condition, index) => (
                <div key={index} className="condition-item bg-gray-800 p-4 rounded-lg border border-gray-700 mb-4">
                  <div className="form-group mb-3">
                    <label className="text-sm font-medium text-gray-300">Condition Type</label>
                    <select
                      value={condition.conditionType || 'ERC20_BALANCE'}
                      onChange={(e) => updateCondition(index, 'conditionType', e.target.value)}
                      className="input-field"
                      disabled={!isConnected}
                    >
                      <option value="ERC20_BALANCE">Hold ERC20 Tokens</option>
                      <option value="NFT_COLLECTION">Own NFT Collection</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="text-sm font-medium text-gray-300">
                      {condition.conditionType === 'NFT_COLLECTION' ? 
                        'NFT Collection Address (Hedera ID)' : 
                        'Token Address (Hedera ID)'}
                    </label>
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
                    <label className="text-sm font-medium text-gray-300">
                      {condition.conditionType === 'NFT_COLLECTION' ? 
                        'Minimum NFTs Required' : 
                        'Minimum Balance Required'}
                    </label>
                    <input
                      type="number"
                      value={condition.minBalance}
                      onChange={(e) => updateCondition(index, 'minBalance', e.target.value)}
                      placeholder={condition.conditionType === 'NFT_COLLECTION' ? '1' : '100'}
                      className="input-field"
                      disabled={!isConnected}
                    />
                  </div>
                  
                  <button
                    onClick={() => removeCondition(index)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 px-4 mt-2 flex items-center justify-center"
                    disabled={!isConnected}
                  >
                    <Trash2 className="mr-2" size={18} />
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
                (airdropType === 'ERC721' && !nftSerials) ||
                (showPercentageRules && airdropType === 'ERC20' && 
                  (Number(firstClaimPercentage) + Number(secondClaimPercentage) + Number(otherClaimPercentage) > 100))
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
        )}

        {/* My Airdrops Tab */}
        {activeTab === 'my-airdrops' && (
          <div className="my-airdrops-tab">
            <h2 className="text-2xl font-bold text-center text-gray-100 mb-6">My Airdrops</h2>

            {loadingMyAirdrops ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
              </div>
            ) : myAirdrops.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {isConnected ? "You haven't created any airdrops yet." : "Connect your wallet to view your airdrops."}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myAirdrops.map((airdrop) => (
                    <div 
                      key={airdrop.id} 
                      className={`airdrop-card p-4 rounded-lg border ${airdrop.isActive ? 
                        (airdrop.isPaused ? 'border-yellow-500' : 'border-green-500') : 
                        'border-red-500'} cursor-pointer ${selectedAirdrop?.id === airdrop.id ? 'bg-gray-800' : 'bg-gray-900'}`}
                      onClick={() => setSelectedAirdrop(airdrop)}
                    >
                      <h3 className="text-lg font-semibold text-white">{airdrop.title}</h3>
                      <p className="text-sm text-gray-400">Type: {airdrop.tokenType === 0 ? 'ERC20' : 'ERC721'}</p>
                      <p className="text-sm text-gray-400">Token: {airdrop.tokenAddress}</p>
                      <p className="text-sm text-gray-400">
                        Status: {airdrop.isActive ? (
                          airdrop.isPaused ? (
                            <span className="text-yellow-400">Paused</span>
                          ) : (
                            <span className="text-green-400">Active</span>
                          )
                        ) : (
                          <span className="text-red-400">Inactive</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-400">
                        Expires: {new Date(airdrop.expirationTime * 1000).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-400">
                        Claims: {airdrop.claimedTokens} / {airdrop.totalTokens}
                      </p>
                    </div>
                  ))}
                </div>

                {selectedAirdrop && (
                  <div className="selected-airdrop-details bg-gray-800 p-6 rounded-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">{selectedAirdrop.title}</h3>
                        <p className="text-sm text-gray-300">
                          Status: {selectedAirdrop.isActive ? (
                            selectedAirdrop.isPaused ? (
                              <span className="text-yellow-400">Paused</span>
                            ) : (
                              <span className="text-green-400">Active</span>
                            )
                          ) : (
                            <span className="text-red-400">Inactive</span>
                          )}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        {selectedAirdrop.isActive && (
                          <>
                            {selectedAirdrop.isPaused ? (
                              <button
                                onClick={() => handleResumeAirdrop(selectedAirdrop.id)}
                                className="bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1 text-sm"
                                disabled={loading}
                              >
                                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Resume'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePauseAirdrop(selectedAirdrop.id)}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white rounded px-3 py-1 text-sm"
                                disabled={loading}
                              >
                                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Pause'}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeactivateAirdrop(selectedAirdrop.id)}
                              className="bg-red-600 hover:bg-red-700 text-white rounded px-3 py-1 text-sm"
                              disabled={loading}
                            >
                              Deactivate
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-300"><span className="font-medium">Type:</span> {selectedAirdrop.tokenType === 0 ? 'ERC20' : 'ERC721'}</p>
                        <p className="text-sm text-gray-300"><span className="font-medium">Token Address:</span> {selectedAirdrop.tokenAddress}</p>
                        <p className="text-sm text-gray-300"><span className="font-medium">Token ID:</span> {selectedAirdrop.tokenId || 'N/A'}</p>
                        <p className="text-sm text-gray-300"><span className="font-medium">Created:</span> {new Date(selectedAirdrop.expirationTime * 1000).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-300"><span className="font-medium">Total Tokens:</span> {selectedAirdrop.totalTokens}</p>
                        <p className="text-sm text-gray-300"><span className="font-medium">Claimed Tokens:</span> {selectedAirdrop.claimedTokens}</p>
                        {selectedAirdrop.tokenType === 0 && (
                          <>
                            <p className="text-sm text-gray-300"><span className="font-medium">First Claim:</span> {selectedAirdrop.firstClaimPercentage}%</p>
                            <p className="text-sm text-gray-300"><span className="font-medium">Second Claim:</span> {selectedAirdrop.secondClaimPercentage}%</p>
                            <p className="text-sm text-gray-300"><span className="font-medium">Other Claims:</span> {selectedAirdrop.otherClaimPercentage}%</p>
                          </>
                        )}
                      </div>
                    </div>

                    {selectedAirdrop.conditions.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-semibold text-white mb-2">Conditions</h4>
                        <div className="space-y-2">
                          {selectedAirdrop.conditions.map((condition, index) => (
                            <div key={index} className="bg-gray-700 p-3 rounded">
                              <p className="text-sm text-gray-300">
                                Type: {condition.conditionType === 1 ? 'NFT Collection' : 'ERC20 Balance'}
                              </p>
                              <p className="text-sm text-gray-300">Token: {condition.conditionTokenAddress}</p>
                              <p className="text-sm text-gray-300">
                                Min Required: {condition.conditionMinBalance}
                                {condition.conditionType === 1 ? ' NFTs' : ' Tokens'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="whitelist-section">
                      <h4 className="text-md font-semibold text-white mb-4">Whitelist Management</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                          <label className="text-sm font-medium text-gray-300 block mb-2">Add to Whitelist (comma separated Hedera IDs)</label>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={whitelistAddresses}
                              onChange={(e) => setWhitelistAddresses(e.target.value)}
                              placeholder="0.0.1234, 0.0.5678"
                              className="input-field flex-grow"
                              disabled={!isConnected}
                            />
                            <button
                              onClick={handleAddToWhitelist}
                              disabled={!whitelistAddresses || loading}
                              className="bg-green-600 hover:bg-green-700 text-white rounded px-4 py-2"
                            >
                              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Check size={20} />}
                            </button>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-gray-300 block mb-2">Remove from Whitelist (comma separated Hedera IDs)</label>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={removeWhitelistAddresses}
                              onChange={(e) => setRemoveWhitelistAddresses(e.target.value)}
                              placeholder="0.0.1234, 0.0.5678"
                              className="input-field flex-grow"
                              disabled={!isConnected}
                            />
                            <button
                              onClick={handleRemoveFromWhitelist}
                              disabled={!removeWhitelistAddresses || loading}
                              className="bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2"
                            >
                              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <X size={20} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Claim Airdrops Tab */}
        {activeTab === 'claim' && (
          <div className="claim-airdrops-tab">
            <h2 className="text-2xl font-bold text-center text-gray-100 mb-6">Claim Airdrops</h2>

            {loadingEligibleAirdrops ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
              </div>
            ) : eligibleAirdrops.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {isConnected ? "No eligible airdrops available." : "Connect your wallet to view eligible airdrops."}
              </div>
            ) : (
              <div className="space-y-4">
                {eligibleAirdrops.map((airdrop) => (
                  <div key={airdrop.id} className="airdrop-card bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{airdrop.title}</h3>
                        <p className="text-sm text-gray-400">Type: {airdrop.tokenType === 0 ? 'ERC20' : 'ERC721'}</p>
                        <p className="text-sm text-gray-400">Token: {airdrop.tokenAddress}</p>
                        <p className="text-sm text-gray-400">
                          Expires: {new Date(airdrop.expirationTime * 1000).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-400">
                          Status: {airdrop.isActive ? (
                            airdrop.isPaused ? (
                              <span className="text-yellow-400">Paused</span>
                            ) : (
                              <span className="text-green-400">Active</span>
                            )
                          ) : (
                            <span className="text-red-400">Inactive</span>
                          )}
                        </p>
                        {airdrop.tokenType === 0 ? (
                          <p className="text-sm text-gray-400">
                            Claimable: {ethers.formatUnits(airdrop.claimableAmount, DECIMALS)} tokens
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400">
                            Available NFTs: {airdrop.availableNftIds.length}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleClaimTokens(airdrop.id)}
                        disabled={loading || !airdrop.isActive || airdrop.isPaused}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2"
                      >
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Claim'}
                      </button>
                    </div>

                    {airdrop.conditions.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-300 mb-1">Conditions:</h4>
                        <ul className="space-y-1">
                          {airdrop.conditions.map((condition, index) => (
                            <li key={index} className="text-xs text-gray-400">
                              {condition.conditionType === 1 ? 'Own at least' : 'Hold at least'} 
                              {' '}{condition.conditionMinBalance} 
                              {condition.conditionType === 1 ? ' NFTs from collection' : ' tokens of'} 
                              {' '}{condition.conditionTokenAddress}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {airdrop.isWhitelisted && (
                      <div className="mt-2 text-xs text-green-400">
                        You are whitelisted for this airdrop
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .airdrop-system-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }
        .airdrop-system-card {
          background-color: #2a2a3a;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .wallet-section {
          margin-bottom: 1.5rem;
        }
        .tabs {
          display: flex;
          border-bottom: 1px solid #3a3a4a;
          margin-bottom: 1.5rem;
        }
        .tab-button {
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          color: #c0c0d0;
          font-weight: 600;
          cursor: pointer;
          border-bottom: 2px solid transparent;
        }
        .tab-button.active {
          color: #ffffff;
          border-bottom-color: #4a90e2;
        }
        .alert-error {
          background-color: #ffebee;
          color: #c62828;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          border: 1px solid #ef9a9a;
        }
        .alert-status {
          background-color: #e8f5e9;
          color: #2e7d32;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          border: 1px solid #a5d6a7;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .input-field {
          width: 100%;
          padding: 0.75rem;
          background-color: #3a3a4a;
          border: 1px solid #5a5a6a;
          border-radius: 0.5rem;
          color: #ffffff;
          margin-top: 0.25rem;
        }
        .input-field:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .conditions-section {
          margin-top: 1.5rem;
        }
        .condition-item {
          margin-bottom: 1rem;
          background-color: #3a3a4a;
        }
        .percentage-rules {
          background-color: #3a3a4a;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
        }
        .airdrop-card {
          transition: all 0.2s ease;
          background-color: #3a3a4a;
        }
        .airdrop-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .selected-airdrop-details {
          margin-top: 1.5rem;
          background-color: #3a3a4a;
        }
        .whitelist-section {
          margin-top: 1.5rem;
        }
        .text-gray-100 {
          color: #ffffff;
        }
        .text-gray-300 {
          color: #e0e0e0;
        }
        .text-gray-400 {
          color: #b0b0b0;
        }
        .text-white {
          color: #ffffff;
        }
        .text-blue-500 {
          color: #4a90e2;
        }
        .text-green-400 {
          color: #66bb6a;
        }
        .text-red-400 {
          color: #ef5350;
        }
        .text-yellow-400 {
          color: #facc15;
        }
        .text-green-500 {
          color: #4caf50;
        }
        .text-red-500 {
          color: #f44336;
        }
        .bg-blue-600 {
          background-color: #4a90e2;
        }
        .hover\:bg-blue-700:hover {
          background-color: #3a80d2;
        }
        .bg-red-600 {
          background-color: #ef5350;
        }
        .hover\:bg-red-700:hover {
          background-color: #e53935;
        }
        .bg-green-600 {
          background-color: #66bb6a;
        }
        .hover\:bg-green-700:hover {
          background-color: #57a75a;
        }
        .bg-yellow-600 {
          background-color: #ca8a04;
        }
        .hover\:bg-yellow-700:hover {
          background-color: #a16207;
        }
      `}</style>
    </div>
  );
}