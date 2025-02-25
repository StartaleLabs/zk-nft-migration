import { createPublicClient, http } from 'viem';
import { readConfig } from './readConfig';
import * as fs from 'fs';
import * as path from 'path';

const DEPLOYER_ADDRESS = '0xEE70e6d461F0888Fd9DB60cb5B2e933adF5f4c7C';
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

// Extended ABI with owner function
const ABI = [
  {
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' }
    ],
    name: 'hasRole',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  }
] as const;

async function main() {
  const { chain } = readConfig();
  const chainName = process.env.CHAIN_NAME || "";

  const client = createPublicClient({
    chain,
    transport: http(),
  });

  const contractsPath = path.join(__dirname, `./${chainName}Contracts.json`);
  const contracts = JSON.parse(fs.readFileSync(contractsPath, 'utf-8'));

  console.log(`\nChecking contracts status on ${chainName}:\n`);

  const results: Array<{
    Project: string;
    'Pause Status': string;
    'Ownership Transferred': string;
  }> = [];

  // Check each contract
  for (const [projectName, contractInfo] of Object.entries(contracts)) {
    try {
      const isPaused = await client.readContract({
        address: (contractInfo as any).address,
        abi: ABI,
        functionName: 'paused',
      });

      if (projectName === 'Yoki') {
        results.push({
          Project: projectName,
          'Ownership Transferred': '🟢 Internal',
          'Pause Status': isPaused ? '🔴 PAUSED' : '🟢 active'
        });
      } else {
        const currentOwner = await client.readContract({
          address: (contractInfo as any).address,
          abi: ABI,
          functionName: 'owner',
        });

        results.push({
          Project: projectName,
          'Ownership Transferred': currentOwner.toLowerCase() !== DEPLOYER_ADDRESS.toLowerCase()
            ? '🟢 transferred'
            : '🔴 not transferred',
          'Pause Status': isPaused ? '🔴 PAUSED' : '🟢 active'
        });
      }
    } catch (error) {
      results.push({
        Project: projectName,
        'Pause Status': '❌ error',
        'Ownership Transferred': '❌ error'
      });
    }
  }


  console.table(results);
}

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});