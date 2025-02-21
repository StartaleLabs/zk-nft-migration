import { createPublicClient, http, getContract, type Address } from 'viem';
import fs from 'fs';
import path from 'path';
import { wait } from '../zk_snapshot_scripts/src/utils';
import { readConfig } from './readConfig';

// Read configuration
const { projectName, chain, contractAddress } = readConfig();

// ABI for tokenURI function
const erc721Abi = [
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  }
];

// Initialize the client
const client = createPublicClient({
  chain: chain,
  transport: http()
});

async function extractMetadataId(uri: string): Promise<string> {
  // Remove .json extension if present
  const withoutJson = uri.replace(/\.json$/, '');
  // Get the last part after the last slash
  const parts = withoutJson.split('/');
  return parts[parts.length - 1];
}

async function retryTokenURI(contract: any, tokenId: bigint, maxRetries = 3, delay = 1000): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const uri = await contract.read.tokenURI([tokenId]) as string;
      return uri;
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      console.log(`Retry ${i + 1}/${maxRetries} for token ${tokenId}`);
      await wait(delay);
    }
  }
  throw new Error('Max retries reached');
}

async function verifyMetadata(projectName: string, contractAddress: Address) {
  console.log(`\nVerifying metadata for ${projectName}...`);

  const csvPath = path.join(__dirname, `../zk_snapshot_scripts/src/instances/${projectName}_instances_with_uri.csv`);
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
    const [, tokenId, expectedMetadataId] = line.split(',');
    try {
      const onchainUri = await retryTokenURI(contract, BigInt(tokenId));
      const actualMetadataId = await extractMetadataId(onchainUri);

      if (actualMetadataId === expectedMetadataId) {
        verified++;
      } else {
        failed++;
        console.error(`❌ Mismatch for token ${tokenId}:`);
        console.error(`  Expected metadata ID: ${expectedMetadataId}`);
        console.error(`  Actual metadata ID: ${actualMetadataId}`);
        console.error(`  Full URI: ${onchainUri}`);
      }

      if ((index + 1) % STATUS_INTERVAL === 0 || index === totalTokens - 1) {
        const progress = ((index + 1) / totalTokens * 100).toFixed(2);
        console.log(`Progress: ${index + 1}/${totalTokens} (${progress}%) - Verified: ${verified}, Failed: ${failed}`);
      }

      await wait(100); // Small delay between checks

    } catch (error: any) {
      failed++;
      console.error(`❌ Error verifying token ${tokenId}:`, {
        error: error.message,
        tokenId,
        contractAddress
      });
    }
  }

  console.log(`\nFinal Results for ${projectName}:`);
  console.log(`  Total tokens: ${totalTokens}`);
  console.log(`  Verified: ${verified}`);
  console.log(`  Failed: ${failed}`);
  console.log('----------------------------------------');
}

async function main() {
  const startTime = new Date();
  console.log(`\nStarting metadata verification at: ${startTime.toISOString()}`);

  await verifyMetadata(projectName, contractAddress);

  const endTime = new Date();
  const duration = (endTime.getTime() - startTime.getTime()) / 1000;
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);

  console.log(`\nVerification completed at: ${endTime.toISOString()}`);
  console.log(`Total duration: ${minutes}m ${seconds}s`);
}

main().catch(console.error);