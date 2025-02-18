import { createPublicClient, http, getContract, Address } from 'viem';
import { soneium } from 'viem/chains';
import fs from 'fs';
import path from 'path';
import { wait } from '../zk_snapshot_scripts/src/utils';
import { readConfig } from './readConfig';

const erc1155Abi = [
  {
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" }
    ],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  }
];

// Read configuration
const { projectName, chain, contractAddress } = readConfig();

const client = createPublicClient({
  chain: soneium,
  transport: http()
});

async function verifyInstances(projectName: string, contractAddress: Address) {
  const csvPath = path.join(__dirname, `../zk_snapshot_scripts/src/instances/${projectName}_instances.csv`);
  if (!fs.existsSync(csvPath)) {
    console.error(`No instances file found for ${projectName}`);
    return;
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n')
    .slice(1)  // Skip header
    .filter(line => line.trim());

  const contract = getContract({
    address: contractAddress,
    abi: erc1155Abi,
    client
  });

  let verified = 0;
  let failed = 0;
  let processed = 0;
  const total = lines.length;

  for (const line of lines) {
    const [address, tokenId, csvAmount] = line.split(',');
    try {
      const onchainAmount = await contract.read.balanceOf([
        address as Address,
        BigInt(tokenId)
      ]) as bigint;

      if (onchainAmount.toString() === csvAmount) {
        verified++;
      } else {
        failed++;
        console.error(`Mismatch for token ${tokenId} and address ${address}:`);
        console.error(`  CSV amount: ${csvAmount}`);
        console.error(`  Chain amount: ${onchainAmount.toString()}`);
      }
    } catch (error) {
      failed++;
      console.error(`Error verifying token ${tokenId} for ${address}:`, error);
    }

    processed++;
    if (processed % 500 === 0) {
      console.log(`[${projectName}] Progress: ${processed}/${total} (${verified} verified, ${failed} failed)`);
    }
  }

  console.log(`Results for ${projectName} with total ${lines.length - 1}:`);
  // console.log(`  Total samples: ${samples.length}`);
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