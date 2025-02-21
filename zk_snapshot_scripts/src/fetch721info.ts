// npx ts-node src/fetch721info.ts
import { createPublicClient, http, getContract, Address } from 'viem';
import { astarZkEVM } from 'viem/chains';

// const CONTRACT_ADDRESS = "0xa1CEFc12987288FB6327377408EaEC63d145a68e" as Address; // AON
// const CONTRACT_ADDRESS = "0x2C30a56279Be0A3d1bDe1f1C0375764362726B72" as Address; // Airian
// const CONTRACT_ADDRESS = "0x33362F864232b16E699bA3c5cC75b93B4f55fa5E" as Address; // Neemo
const CONTRACT_ADDRESS = "0xF11f82DB173FBBa7a7B060Fd02F3Db74891dD069" as Address; // Town Snap
// const CONTRACT_ADDRESS = "0x35EdfFB12F93253f1c567a7e207F06E1B0de9D8e" as Address; // casio
const CHAIN = astarZkEVM;

const erc721Abi = [{
  inputs: [],
  name: "baseURI",
  outputs: [{ name: "", type: "string" }],
  stateMutability: "view",
  type: "function",
}, {
  inputs: [{ name: "tokenId", type: "uint256" }],
  name: "tokenURI",
  outputs: [{ name: "", type: "string" }],
  stateMutability: "view",
  type: "function",
},
{
  inputs: [],
  name: "name",
  outputs: [{ name: "", type: "string" }],
  stateMutability: "view",
  type: "function",
}, {
  inputs: [],
  name: "symbol",
  outputs: [{ name: "", type: "string" }],
  stateMutability: "view",
  type: "function",
},
{
  inputs: [],
  name: "totalSupply",
  outputs: [{ name: "", type: "uint256" }],
  stateMutability: "view",
  type: "function",
},
{
  inputs: [],
  name: "maxSupply",
  outputs: [{ name: "", type: "uint256" }],
  stateMutability: "view",
  type: "function",
},
{
  inputs: [{ name: "tokenId", type: "uint256" }],
  name: "uri",
  outputs: [{ name: "", type: "string" }],
  stateMutability: "view",
  type: "function",
}] as const;

const client = createPublicClient({
  chain: CHAIN,
  transport: http()
});

async function checkName() {
  console.log('\nChecking name...\n');

  try {
    const contract = getContract({
      address: CONTRACT_ADDRESS,
      abi: erc721Abi,
      client
    });

    const name = await contract.read.name();
    console.log(`name: ${name}`);
    return name;
  } catch (error) {
    console.error('Error reading name:', error);
    return null;
  }
}

async function checkSymbol() {
  console.log('\nChecking symbol...\n');

  try {
    const contract = getContract({
      address: CONTRACT_ADDRESS,
      abi: erc721Abi,
      client
    });

    const symbol = await contract.read.symbol();
    console.log(`symbol: ${symbol}`);
    return symbol;
  } catch (error) {
    console.error('Error reading symbol:', error);
    return null;
  }
}

async function checkBaseUri() {
  console.log('Checking baseURI...\n');

  try {
    const contract = getContract({
      address: CONTRACT_ADDRESS,
      abi: erc721Abi,
      client
    });

    const baseUri = await contract.read.baseURI();
    console.log(`baseURI: ${baseUri}`);
    return baseUri;
  } catch (error) {
    console.error('Error reading baseURI:', error);
    return null;
  }
}

async function checkTokenUri() {
  console.log('\nChecking tokenURI(0)...\n');

  try {
    const contract = getContract({
      address: CONTRACT_ADDRESS,
      abi: erc721Abi,
      client
    });

    const tokenUri = await contract.read.tokenURI([0n]);
    console.log(`tokenURI(0): ${tokenUri}`);
    return tokenUri;
  } catch (error) {
    console.error('Error reading tokenURI:', error);
    return null;
  }
}

async function main() {
  const startTime = new Date();
  console.log(`Fetching contract info: ${startTime.toISOString()}\n`);

  const contract = getContract({
    address: CONTRACT_ADDRESS,
    abi: erc721Abi,
    client
  });

  // Check all contract info

  const results = await Promise.allSettled([
    contract.read.name(),
    contract.read.symbol(),
    contract.read.baseURI(),
    contract.read.tokenURI([0n]),
    contract.read.tokenURI([1n]),
    contract.read.tokenURI([42n]),
    contract.read.tokenURI([99n]),
    contract.read.totalSupply(),
    contract.read.maxSupply(),
    contract.read.uri([1n]) 
  ]);

  // Print results with status indicators
  console.log('\Contract config:');
  console.log('==================');
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Name: ${results[0].status === 'fulfilled' ? '✅ ' + results[0].value : '❌ failed'}`);
  console.log(`Symbol: ${results[1].status === 'fulfilled' ? '✅ ' + results[1].value : '❌ failed'}`);
  console.log(`baseURI: ${results[2].status === 'fulfilled' ? '✅ ' + results[2].value : '❌ failed'}`);
  console.log('[ERC721] Token URIs:');
  console.log(`  ID 0: ${results[3].status === 'fulfilled' ? '✅ ' + results[3].value : '❌ failed'}`);
  console.log(`  ID 1: ${results[4].status === 'fulfilled' ? '✅ ' + results[4].value : '❌ failed'}`);
  console.log(`  ID 42: ${results[5].status === 'fulfilled' ? '✅ ' + results[5].value : '❌ failed'}`);
  console.log(`  ID 99: ${results[6].status === 'fulfilled' ? '✅ ' + results[6].value : '❌ failed'}`);
  console.log(`Total Supply: ${results[7].status === 'fulfilled' ? '✅ ' + results[7].value : '❌ failed'}`);
  console.log(`Max Supply: ${results[8].status === 'fulfilled' ? '✅ ' + results[8].value : '❌ failed'}`);
  console.log(`[ERC1155] URI(1): ${results[9].status === 'fulfilled' ? '✅ ' + results[9].value : '❌ failed'}`);

  const endTime = new Date();
  const duration = (endTime.getTime() - startTime.getTime()) / 1000;
  console.log(`\nDuration: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`);
}

main().catch(console.error);