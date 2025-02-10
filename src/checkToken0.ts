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
  console.log('Checking tokenId 0 existence and updating output.json...\n');

  const inputPath = path.join(__dirname, 'data/zk_input_721.json');
  const outputPath = path.join(__dirname, 'data/output.json');
  
  const inputConfig: Record<string, ProjectConfig> = JSON.parse(
    fs.readFileSync(inputPath, 'utf-8')
  );

  let outputConfig: Record<string, ProjectConfig> = {};
  if (fs.existsSync(outputPath)) {
    outputConfig = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  }

  const results = await Promise.allSettled(
    Object.entries(inputConfig).map(async ([project, data]) => {
      try {
        const contract = getContract({
          address: data.address as Address,
          abi: erc721Abi,
          client
        });

        const owner = await contract.read.ownerOf([BigInt(0)]);
        return { project, exists: true };
      } catch (error) {
        return { project, exists: false };
      }
    })
  );

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const { project, exists } = result.value;
      outputConfig[project] = {
        ...inputConfig[project],
        ...outputConfig[project],
        startsWithToken0: exists
      };
    }
  });

  fs.writeFileSync(outputPath, JSON.stringify(outputConfig, null, 2));
  console.log(`Updated output.json with token0 existence information`);
}

checkTokenZero().catch(console.error);