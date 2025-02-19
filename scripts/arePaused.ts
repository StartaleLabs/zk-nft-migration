import { createPublicClient, http } from 'viem';
import { readConfig } from './readConfig';
import * as fs from 'fs';
import * as path from 'path';

// ABI for paused function
const ABI = [
  {
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

async function main() {
  const { chain } = readConfig();
  const chainName = process.env.CHAIN_NAME || "";
  
  // Initialize client
  const client = createPublicClient({
    chain,
    transport: http(),
  });

  // Read all contracts
  const contractsPath = path.join(__dirname, `./${chainName}Contracts.json`);
  const contracts = JSON.parse(fs.readFileSync(contractsPath, 'utf-8'));

  console.log(`\nChecking pause status for all contracts on ${chainName}:`);
  console.log('----------------------------------------');

  // Check each contract
  for (const [projectName, contractInfo] of Object.entries(contracts)) {
    try {
      const isPaused = await client.readContract({
        address: (contractInfo as any).address,
        abi: ABI,
        functionName: 'paused',
      });

      const status = isPaused ? '🔴 PAUSED' : '🟢 active';
      console.log(`${projectName.padEnd(20)}: ${status}`);
      
    } catch (error) {
      console.log(`${projectName.padEnd(20)}: ❌ error reading status`);
    }
  }
}

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});