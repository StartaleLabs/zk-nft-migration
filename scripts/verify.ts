// npx hardhat run scripts/verify.ts

import { createPublicClient, http, getContract, type Address } from 'viem';
import { sepolia, soneium } from 'viem/chains';
import fs from 'fs';
import path from 'path';
import { wait } from '../zk_snapshot_scripts/src/utils';
import type { ProjectConfig } from '../zk_snapshot_scripts/src/types/config';
import { readConfig } from './readConfig';

// Read configuration
const { projectName, chain, contractAddress } = readConfig();

// Basic ERC721 ABI for ownerOf function
const erc721Abi = [
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  }
];

// Initialize the client
const client = createPublicClient({
  chain: chain,
  transport: http()
});

async function retryOwnerOf(contract: any, tokenId: bigint, maxRetries = 3, delay = 1000): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const owner = await contract.read.ownerOf([tokenId]) as string;
      return owner;
    } catch (error: any) {
      if (i === maxRetries - 1) {
        throw error;
      }
      console.log(`Retry ${i + 1}/${maxRetries} for token ${tokenId}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries reached');
}

async function verifyInstances(projectName: string, contractAddress: Address) {
  console.log(`Verifying ${projectName}...`);

  // Read instances CSV file
  const csvPath = path.join(__dirname, `../zk_snapshot_scripts/src/instances/${projectName}_instances.csv`);
  if (!fs.existsSync(csvPath)) {
    console.error(`No instances file found for ${projectName}`);
    return;
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').slice(1); // Skip header
  const validLines = lines.filter(line => line.trim());

  const contract = getContract({
    address: contractAddress,
    abi: erc721Abi,
    client
  });

  let verified = 0;
  let failed = 0;
  const totalTokens = validLines.length;
  const STATUS_INTERVAL = 100;

  console.log(`Starting verification of ${totalTokens} tokens...`);

  for (const [index, line] of validLines.entries()) {
    const [csvAddress, tokenId] = line.split(',');
    try {
      const onchainOwner = await retryOwnerOf(contract, BigInt(tokenId));

      if (onchainOwner.toLowerCase() === csvAddress.toLowerCase()) {
        verified++;
      } else {
        failed++;
        console.error(`❌ Mismatch for token ${tokenId}:`);
        console.error(`  CSV owner: ${csvAddress}`);
        console.error(`  Chain owner: ${onchainOwner}`);
      }
      // Print status every STATUS_INTERVAL tokens
      if ((index + 1) % STATUS_INTERVAL === 0 || index === totalTokens - 1) {
        const progress = ((index + 1) / totalTokens * 100).toFixed(2);
        console.log(`Progress: ${index + 1}/${totalTokens} (${progress}%) - Verified: ${verified}, Failed: ${failed}`);
      }

      // Add small delay between checks
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      failed++;
      console.error(`❌ Error verifying token ${tokenId}:`, {
        error: error.message,
        tokenId,
        csvAddress,
        contractAddress
      });
    }
  }

  console.log(`\nFinal Results for ${projectName}:`);
  console.log(`  Total tokens: ${totalTokens}`);
  console.log(`  Verified: ${verified}`);
  console.log(`  Failed: ${failed}`);
  console.log('-------------------');
}

async function main() {
  const startTime = new Date();
  console.log(`\nStarting verification process at: ${startTime.toISOString()}`);

  await verifyInstances(projectName, contractAddress);

  const endTime = new Date();
  const duration = (endTime.getTime() - startTime.getTime()) / 1000;
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);

  console.log(`\nVerification process completed at: ${endTime.toISOString()}`);
  console.log(`Total duration: ${minutes}m ${seconds}s`);
}

main().catch(console.error);