import { createPublicClient, http, getContract, Address } from 'viem';
import { astarZkEVM } from 'viem/chains';
import type { ProjectConfig } from './types/config';
import fs from 'fs';
import path from 'path';

const erc721Abi = [{
  inputs: [],
  name: "baseURI",
  outputs: [{ name: "", type: "string" }],
  stateMutability: "view",
  type: "function",
}] as const;

const client = createPublicClient({
  chain: astarZkEVM,
  transport: http()
});

async function checkBaseUri() {
  console.log('Checking baseURI for all projects and updating output.json...\n');

  const inputPath = path.join(__dirname, 'data/zk_input_1155.json');
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

        const baseUri = await contract.read.baseURI();
        console.log(`${project}: ${baseUri}`);
        return { project, baseUri };
      } catch (error) {
        console.error(`Error reading baseURI for ${project}:`, error);
        return { project, baseUri: null };
      }
    })
  );

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const { project, baseUri } = result.value;
      outputConfig[project] = {
        ...inputConfig[project],
        ...outputConfig[project],
        baseURI: baseUri
      };
    }
  });

  fs.writeFileSync(outputPath, JSON.stringify(outputConfig, null, 2));
  console.log(`Updated output.json with baseURI information`);
}

checkBaseUri().catch(console.error);