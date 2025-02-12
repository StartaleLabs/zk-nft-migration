import { createPublicClient, http, getContract, Address } from 'viem';
import { astarZkEVM } from 'viem/chains';
import type { ProjectConfig } from './types/config';
import fs from 'fs';
import path from 'path';

const erc721Abi = [{
  inputs: [{ name: "tokenId", type: "uint256" }],
  name: "tokenURI",
  outputs: [{ name: "", type: "string" }],
  stateMutability: "view",
  type: "function",
}, {
  inputs: [],
  name: "totalSupply",
  outputs: [{ name: "", type: "uint256" }],
  stateMutability: "view",
  type: "function",
}] as const;

const client = createPublicClient({
  chain: astarZkEVM,
  transport: http()
});

async function checkLastTokenUri() {
  console.log('Checking tokenURI of second to last token...\n');

  const outputPath = path.join(__dirname, 'data/output.json');
  const outputConfig: Record<string, ProjectConfig> = JSON.parse(
    fs.readFileSync(outputPath, 'utf-8')
  );

  const results = await Promise.allSettled(
    Object.entries(outputConfig).map(async ([project, data]) => {
      try {
        const contract = getContract({
          address: data.address as Address,
          abi: erc721Abi,
          client
        });

        const totalSupply = await contract.read.totalSupply();
        if (totalSupply < 2n) {
          console.log(`${project}: Not enough tokens (total: ${totalSupply})`);
          return { project, uri: null };
        }

        const secondToLastToken = totalSupply - 2n;
        const uri = await contract.read.tokenURI([secondToLastToken]);
        console.log(`${project}: Token #${secondToLastToken} URI: ${uri}`);
        return { project, uri };
      } catch (error) {
        console.error(`Error checking ${project}:`, error);
        return { project, uri: null };
      }
    })
  );

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const { project, uri } = result.value;
      outputConfig[project] = {
        ...outputConfig[project],
        metadataEntries: uri
      };
    }
  });

  fs.writeFileSync(outputPath, JSON.stringify(outputConfig, null, 2));
  console.log(`\nUpdated output.json with second to last token URIs`);
}

checkLastTokenUri().catch(console.error);