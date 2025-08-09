// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract AirdropSystem is Ownable(msg.sender) {
    using SafeERC20 for IERC20;

    enum TokenType { ERC20, ERC721 }

    struct Condition {
        address conditionTokenAddress;
        uint256 conditionMinBalance;
    }

    struct AirdropBasic {
        TokenType tokenType;
        address tokenAddress;
        string tokenId;
        string title;
        uint256 expirationTime;
        uint256 totalTokens;
        uint256 claimedTokens;
        bool isActive;
        address creator;
        uint256 firstClaimPercentage;
        uint256 secondClaimPercentage;
        uint256 otherClaimPercentage;
        uint256 claimCount;
        uint256[] nftIds;
    }

    struct AirdropDetails {
        uint256 id;
        TokenType tokenType;
        address tokenAddress;
        string tokenId;
        string title;
        uint256 expirationTime;
        uint256 totalTokens;
        uint256 claimedTokens;
        bool isActive;
        uint256 claimableAmount;
        Condition[] conditions;
        uint256 firstClaimPercentage;
        uint256 secondClaimPercentage;
        uint256 otherClaimPercentage;
        bool isWhitelisted;
        uint256[] availableNftIds;
    }

    struct Airdrop {
        AirdropBasic basic;
        Condition[] conditions;
        mapping(address => bool) hasClaimed;
        mapping(address => bool) whitelist;
        mapping(uint256 => bool) claimedNfts;
    }

    mapping(uint256 => Airdrop) private airdrops;
    uint256 public airdropCount;

    event AirdropCreated(
        uint256 indexed airdropId,
        TokenType tokenType,
        address indexed tokenAddress,
        string tokenId,
        uint256 expirationTime,
        uint256 totalTokens,
        string title,
        address indexed creator
    );

    event TokensClaimed(uint256 indexed airdropId, address indexed claimant, uint256 amount);
    event NftClaimed(uint256 indexed airdropId, address indexed claimant, uint256 nftId);

    // constructor - Ownable() automatically sets msg.sender as owner
    constructor() {}

    /**
     * @notice Create an ERC20 airdrop. The caller must have approved this contract for _totalTokens.
     */
    function createERC20Airdrop(
        address _tokenAddress,
        string memory _tokenId,
        uint256 _expirationTime,
        uint256 _totalTokens,
        Condition[] memory _conditions,
        uint256 _firstClaimPercentage,
        uint256 _secondClaimPercentage,
        uint256 _otherClaimPercentage,
        string memory _title
    ) external {
        require(_expirationTime > block.timestamp, "Expiration must be in future");
        require(_totalTokens > 0, "Total tokens > 0 required");
        require(bytes(_title).length > 0, "Title required");

        _validatePercentages(_firstClaimPercentage, _secondClaimPercentage, _otherClaimPercentage);

        // Transfer tokens in (uses SafeERC20 to be robust)
        IERC20(_tokenAddress).safeTransferFrom(msg.sender, address(this), _totalTokens);

        // create storage slot for new airdrop
        airdropCount++;
        Airdrop storage newAirdrop = airdrops[airdropCount];

        // fill basic struct
        newAirdrop.basic = AirdropBasic({
            tokenType: TokenType.ERC20,
            tokenAddress: _tokenAddress,
            tokenId: _tokenId,
            title: _title,
            expirationTime: _expirationTime,
            totalTokens: _totalTokens,
            claimedTokens: 0,
            isActive: true,
            creator: msg.sender,
            firstClaimPercentage: _firstClaimPercentage,
            secondClaimPercentage: _secondClaimPercentage,
            otherClaimPercentage: _otherClaimPercentage,
            claimCount: 0,
           nftIds: new uint256[](0)  // Initialize empty array

        });

        // copy conditions into storage
        for (uint256 i = 0; i < _conditions.length; i++) {
            newAirdrop.conditions.push(_conditions[i]);
        }

        emit AirdropCreated(
            airdropCount,
            TokenType.ERC20,
            _tokenAddress,
            _tokenId,
            _expirationTime,
            _totalTokens,
            _title,
            msg.sender
        );
    }

    /**
     * @notice Create an ERC721 airdrop. Caller must have approved this contract to transfer the provided NFTs.
     */
    function createERC721Airdrop(
        address _tokenAddress,
        uint256[] memory _nftIds,
        string memory _tokenId,
        uint256 _expirationTime,
        Condition[] memory _conditions,
        string memory _title
    ) external {
        require(_expirationTime > block.timestamp, "Expiration must be in future");
        require(_nftIds.length > 0, "At least one NFT ID required");
        require(bytes(_title).length > 0, "Title required");

        IERC721 nft = IERC721(_tokenAddress);

        // transfer each NFT into contract
        for (uint256 i = 0; i < _nftIds.length; i++) {
            nft.transferFrom(msg.sender, address(this), _nftIds[i]);
        }

        airdropCount++;
        Airdrop storage newAirdrop = airdrops[airdropCount];

        // initialize basic with nftIds copied from memory
        uint256[] memory nftIdsCopy = new uint256[](_nftIds.length);
        for (uint256 i = 0; i < _nftIds.length; i++) {
            nftIdsCopy[i] = _nftIds[i];
        }

        newAirdrop.basic = AirdropBasic({
            tokenType: TokenType.ERC721,
            tokenAddress: _tokenAddress,
            tokenId: _tokenId,
            title: _title,
            expirationTime: _expirationTime,
            totalTokens: _nftIds.length,
            claimedTokens: 0,
            isActive: true,
            creator: msg.sender,
            firstClaimPercentage: 0,
            secondClaimPercentage: 0,
            otherClaimPercentage: 0,
            claimCount: 0,
            nftIds: nftIdsCopy
        });

        for (uint256 i = 0; i < _conditions.length; i++) {
            newAirdrop.conditions.push(_conditions[i]);
        }

        emit AirdropCreated(
            airdropCount,
            TokenType.ERC721,
            _tokenAddress,
            _tokenId,
            _expirationTime,
            _nftIds.length,
            _title,
            msg.sender
        );
    }

    /**
     * @dev Validates percentages. Allows zeros for second/other.
     */
    function _validatePercentages(
        uint256 _first,
        uint256 _second,
        uint256 _other
    ) private pure {
        require(_first <= 100 && _second <= 100 && _other <= 100, "Invalid percent >100");
        require(_first + _second + _other <= 100, "Sum of percentages must be <= 100");
        // first can be zero theoretically; but leaving it to the caller to set valid percentages.
    }

    function addToWhitelist(uint256 _airdropId, address[] memory _users) external {
        Airdrop storage airdrop = airdrops[_airdropId];
        require(msg.sender == airdrop.basic.creator, "Only creator can add whitelist");
        for (uint256 i = 0; i < _users.length; i++) {
            airdrop.whitelist[_users[i]] = true;
        }
    }

    function removeFromWhitelist(uint256 _airdropId, address[] memory _users) external {
        Airdrop storage airdrop = airdrops[_airdropId];
        require(msg.sender == airdrop.basic.creator, "Only creator can remove whitelist");
        for (uint256 i = 0; i < _users.length; i++) {
            airdrop.whitelist[_users[i]] = false;
        }
    }

    function claimTokens(uint256 _airdropId) external {
        Airdrop storage airdrop = airdrops[_airdropId];
        require(airdrop.basic.isActive, "Airdrop not active");
        require(block.timestamp <= airdrop.basic.expirationTime, "Airdrop expired");
        require(!airdrop.hasClaimed[msg.sender], "Already claimed");

        if (!airdrop.whitelist[msg.sender]) {
            _checkConditions(airdrop, msg.sender);
        }

        if (airdrop.basic.tokenType == TokenType.ERC20) {
            _claimERC20(airdrop, _airdropId);
        } else {
            _claimERC721(airdrop, _airdropId);
        }
    }

    function _checkConditions(Airdrop storage airdrop, address user) private view {
        for (uint256 i = 0; i < airdrop.conditions.length; i++) {
            Condition memory condition = airdrop.conditions[i];
            if (condition.conditionTokenAddress != address(0)) {
                IERC20 conditionToken = IERC20(condition.conditionTokenAddress);
                require(
                    conditionToken.balanceOf(user) >= condition.conditionMinBalance,
                    "Condition token balance too low"
                );
            }
        }
    }

    function _claimERC20(Airdrop storage airdrop, uint256 airdropId) private {
        uint256 claimableAmount = _calculateClaimableAmount(airdrop);
        require(claimableAmount > 0, "No tokens to claim");
        require(
            airdrop.basic.claimedTokens + claimableAmount <= airdrop.basic.totalTokens,
            "Insufficient tokens remaining"
        );

        airdrop.hasClaimed[msg.sender] = true;
        airdrop.basic.claimedTokens += claimableAmount;
        airdrop.basic.claimCount++;

        IERC20(airdrop.basic.tokenAddress).safeTransfer(msg.sender, claimableAmount);
        emit TokensClaimed(airdropId, msg.sender, claimableAmount);
    }

    function _claimERC721(Airdrop storage airdrop, uint256 airdropId) private {
        uint256 nftIdToClaim;
        bool found = false;
        for (uint256 i = 0; i < airdrop.basic.nftIds.length; i++) {
            uint256 candidate = airdrop.basic.nftIds[i];
            if (!airdrop.claimedNfts[candidate]) {
                nftIdToClaim = candidate;
                found = true;
                break;
            }
        }
        require(found, "No NFTs left to claim");

        airdrop.hasClaimed[msg.sender] = true;
        airdrop.claimedNfts[nftIdToClaim] = true;
        airdrop.basic.claimedTokens++;
        airdrop.basic.claimCount++;

        IERC721(airdrop.basic.tokenAddress).transferFrom(address(this), msg.sender, nftIdToClaim);
        emit NftClaimed(airdropId, msg.sender, nftIdToClaim);
    }

    function _calculateClaimableAmount(Airdrop storage airdrop) private view returns (uint256) {
        uint256 remainingTokens = airdrop.basic.totalTokens - airdrop.basic.claimedTokens;
        uint256 claimPercentage;

        if (airdrop.basic.claimCount == 0) {
            claimPercentage = airdrop.basic.firstClaimPercentage;
        } else if (airdrop.basic.claimCount == 1) {
            claimPercentage = airdrop.basic.secondClaimPercentage;
        } else {
            claimPercentage = airdrop.basic.otherClaimPercentage;
        }

        uint256 claimableAmount = (airdrop.basic.totalTokens * claimPercentage) / 100;
        return claimableAmount > remainingTokens ? remainingTokens : claimableAmount;
    }

    function getEligibleAirdrops(address _user) external view returns (AirdropDetails[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= airdropCount; i++) {
            if (_isEligible(airdrops[i], _user)) {
                count++;
            }
        }

        AirdropDetails[] memory eligibleAirdrops = new AirdropDetails[](count);
        uint256 index = 0;

        for (uint256 i = 1; i <= airdropCount; i++) {
            if (_isEligible(airdrops[i], _user)) {
                eligibleAirdrops[index] = _getAirdropDetails(airdrops[i], i, _user);
                index++;
            }
        }

        return eligibleAirdrops;
    }

    function getAirdropsByCreator(address _creator) external view returns (AirdropDetails[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= airdropCount; i++) {
            if (airdrops[i].basic.creator == _creator) {
                count++;
            }
        }

        AirdropDetails[] memory creatorAirdrops = new AirdropDetails[](count);
        uint256 index = 0;

        for (uint256 i = 1; i <= airdropCount; i++) {
            if (airdrops[i].basic.creator == _creator) {
                creatorAirdrops[index] = _getAirdropDetails(airdrops[i], i, _creator);
                index++;
            }
        }
        return creatorAirdrops;
    }

    function _getAirdropDetails(Airdrop storage airdrop, uint256 id, address user) private view returns (AirdropDetails memory) {
        uint256 claimableAmount = 0;
        uint256[] memory availableNftIds;

        if (airdrop.basic.tokenType == TokenType.ERC20) {
            claimableAmount = _calculateClaimableAmount(airdrop);
        } else {
            availableNftIds = _getAvailableNftIds(airdrop);
        }

        // Copy conditions (storage -> memory)
        Condition[] memory conds = new Condition[](airdrop.conditions.length);
        for (uint256 i = 0; i < airdrop.conditions.length; i++) {
            conds[i] = airdrop.conditions[i];
        }

        return AirdropDetails({
            id: id,
            tokenType: airdrop.basic.tokenType,
            tokenAddress: airdrop.basic.tokenAddress,
            tokenId: airdrop.basic.tokenId,
            title: airdrop.basic.title,
            expirationTime: airdrop.basic.expirationTime,
            totalTokens: airdrop.basic.totalTokens,
            claimedTokens: airdrop.basic.claimedTokens,
            isActive: airdrop.basic.isActive,
            claimableAmount: claimableAmount,
            conditions: conds,
            firstClaimPercentage: airdrop.basic.firstClaimPercentage,
            secondClaimPercentage: airdrop.basic.secondClaimPercentage,
            otherClaimPercentage: airdrop.basic.otherClaimPercentage,
            isWhitelisted: airdrop.whitelist[user],
            availableNftIds: availableNftIds
        });
    }

    function _getAvailableNftIds(Airdrop storage airdrop) private view returns (uint256[] memory) {
        uint256 availableCount = 0;
        for (uint256 i = 0; i < airdrop.basic.nftIds.length; i++) {
            if (!airdrop.claimedNfts[airdrop.basic.nftIds[i]]) {
                availableCount++;
            }
        }

        uint256[] memory availableNftIds = new uint256[](availableCount);
        uint256 nftIndex = 0;
        for (uint256 i = 0; i < airdrop.basic.nftIds.length; i++) {
            uint256 candidate = airdrop.basic.nftIds[i];
            if (!airdrop.claimedNfts[candidate]) {
                availableNftIds[nftIndex] = candidate;
                nftIndex++;
            }
        }
        return availableNftIds;
    }

    function _isEligible(Airdrop storage airdrop, address _user) private view returns (bool) {
        if (
            !airdrop.basic.isActive ||
            block.timestamp > airdrop.basic.expirationTime ||
            airdrop.hasClaimed[_user]
        ) {
            return false;
        }

        if (airdrop.whitelist[_user]) {
            return true;
        }

        for (uint256 i = 0; i < airdrop.conditions.length; i++) {
            Condition memory condition = airdrop.conditions[i];
            if (condition.conditionTokenAddress != address(0)) {
                IERC20 conditionToken = IERC20(condition.conditionTokenAddress);
                if (conditionToken.balanceOf(_user) < condition.conditionMinBalance) {
                    return false;
                }
            }
        }

        if (airdrop.basic.tokenType == TokenType.ERC721) {
            bool hasAvailableNft = false;
            for (uint256 i = 0; i < airdrop.basic.nftIds.length; i++) {
                if (!airdrop.claimedNfts[airdrop.basic.nftIds[i]]) {
                    hasAvailableNft = true;
                    break;
                }
            }
            if (!hasAvailableNft) {
                return false;
            }
        }

        return true;
    }

    function deactivateAirdrop(uint256 _airdropId) external onlyOwner {
        airdrops[_airdropId].basic.isActive = false;
    }

    function withdrawRemainingTokens(uint256 _airdropId) external onlyOwner {
        Airdrop storage airdrop = airdrops[_airdropId];
        require(!airdrop.basic.isActive || block.timestamp > airdrop.basic.expirationTime, "Airdrop still active");

        if (airdrop.basic.tokenType == TokenType.ERC20) {
            uint256 remainingTokens = airdrop.basic.totalTokens - airdrop.basic.claimedTokens;
            require(remainingTokens > 0, "No tokens remaining");
            IERC20(airdrop.basic.tokenAddress).safeTransfer(owner(), remainingTokens);
        } else {
            for (uint256 i = 0; i < airdrop.basic.nftIds.length; i++) {
                uint256 id = airdrop.basic.nftIds[i];
                if (!airdrop.claimedNfts[id]) {
                    IERC721(airdrop.basic.tokenAddress).transferFrom(address(this), owner(), id);
                    airdrop.claimedNfts[id] = true;
                }
            }
        }
    }

    function getAllAirdropIds() external view returns (uint256[] memory) {
        uint256[] memory airdropIds = new uint256[](airdropCount);
        for (uint256 i = 0; i < airdropCount; i++) {
            airdropIds[i] = i + 1;
        }
        return airdropIds;
    }

    function canClaim(uint256 _airdropId, address _user) external view returns (bool) {
        return _isEligible(airdrops[_airdropId], _user);
    }
}
