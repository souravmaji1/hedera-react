const {
  Client,
  PrivateKey,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  AccountId,
  Hbar,
} = require("@hashgraph/sdk");
require("dotenv").config();

async function main() {
  // Configure the Hedera client for testnet
  const userCAccountId = AccountId.fromString("0.0.3637827");
  const userCPrivateKey = PrivateKey.fromStringECDSA(
    "0xe136b304214217da70b004eadb459a604cab0b946e8ed05597cd728d5332e858"
  );
  const client = Client.forTestnet();
  client.setOperator(userCAccountId, userCPrivateKey);

  // Step 1: Create the NFT
  const nftCreate = await new TokenCreateTransaction()
    .setTokenName("Diploma")
    .setTokenSymbol("GRAD")
    .setTokenType(TokenType.NonFungibleUnique)
    .setDecimals(0)
    .setInitialSupply(0)
    .setTreasuryAccountId(userCAccountId) // Use userCAccountId
    .setSupplyType(TokenSupplyType.Finite)
    .setMaxSupply(250)
    .setSupplyKey(userCPrivateKey) // Use userCPrivateKey
    .freezeWith(client);

  // Sign and submit the transaction
  const nftCreateTxSign = await nftCreate.sign(userCPrivateKey); // Use userCPrivateKey
  const nftCreateSubmit = await nftCreateTxSign.execute(client);
  const nftCreateRx = await nftCreateSubmit.getReceipt(client);
  const tokenId = nftCreateRx.tokenId;

  console.log(`Created NFT with Token ID: ${tokenId}`);

  // Step 2: Mint a batch of NFTs
  const maxTransactionFee = new Hbar(20);
 const CID = [
  Buffer.from(
    "ipfs://bafyreiao6ajgsfji6qsgbqwdtjdu5gmul7tv2v3pd6kjgcw5o65b2ogst4/metadata.json"
  ),
  Buffer.from(
    "ipfs://bafyreic463uarchq4mlufp7pvfkfut7zeqsqmn3b2x3jjxwcjqx6b5pk7q/metadata.json"
  ),
  Buffer.from(
    "ipfs://bafyreihhja55q6h2rijscl3gra7a3ntiroyglz45z5wlyxdzs6kjh2dinu/metadata.json"
  ),
  Buffer.from(
    "ipfs://bafyreidb23oehkttjbff3gdi4vz7mjijcxjyxadwg32pngod4huozcwphu/metadata.json"
  ),
  Buffer.from(
    "ipfs://bafyreie7ftl6erd5etz5gscfwfiwjmht3b52cevdrf7hjwxx5ddns7zneu/metadata.json"
  )
];

  const mintTx = new TokenMintTransaction()
    .setTokenId(tokenId)
    .setMetadata(CID)
    .setMaxTransactionFee(maxTransactionFee)
    .freezeWith(client);

  // Sign and submit the mint transaction
  const mintTxSign = await mintTx.sign(userCPrivateKey); // Use userCPrivateKey
  const mintTxSubmit = await mintTxSign.execute(client);
  const mintRx = await mintTxSubmit.getReceipt(client);

  console.log(`Created NFT ${tokenId} with serial numbers: ${mintRx.serials}`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});