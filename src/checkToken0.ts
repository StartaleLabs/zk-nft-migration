import { createPublicClient, http, getContract, Address } from 'viem';
import { astarZkEVM } from 'viem/chains';
import type { ProjectConfig } from './types/config';
import fs from 'fs';
import path from 'path';

const erc721Abi = [{
  inputs: [{ name: "tokenId", type: "uint256" }],
  name: "ownerOf",
  outputs: [{ name: "", type: "address" }],
  stateMutability: "view",
  type: "function",
}] as const;

const client = createPublicClient({
  chain: astarZkEVM,
  transport: http()
});

async function checkTokenZero() {
  console.log('Checking tokenId 0 existence for all projects...\n');

  const inputPath = path.join(__dirname, 'data/zk_input_721.json');
  const config: Record<string, ProjectConfig> = JSON.parse(
    fs.readFileSync(inputPath, 'utf-8'));
  const results = await Promise.allSettled(
      Object.entries(config as Record<string, { address: string }>).map(async ([project, data]: [string, { address: string }]) => {
        try {
          const contract = getContract({
            address: data.address as Address,
            abi: erc721Abi,
            client
          });

          const owner = await contract.read.ownerOf([BigInt(0)]);
          return { project, exists: true, owner };
        } catch (error) {
          return { project, exists: false, error: (error as any).message };
        }
      })
    );

  console.log('Results:');
  console.log('Project'.padEnd(25), 'Token 0 Exists'.padEnd(15), 'Owner/Error');
  console.log('-'.repeat(80));

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const { project, exists, owner } = result.value;
      console.log(
        project.padEnd(25),
        exists ? 'Yes'.padEnd(15) : 'No'.padEnd(15),
        exists ? owner : 'N/A'
      );
    }
  });
}

checkTokenZero().catch(console.error);