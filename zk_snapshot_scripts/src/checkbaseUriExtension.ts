import { createPublicClient, http, getContract, Address } from 'viem';
import { astarZkEVM } from 'viem/chains';
import fs from 'fs';
import path from 'path';

const erc721Abi = [{
  inputs: [{ name: "tokenId", type: "uint256" }],
  name: "tokenURI",
  outputs: [{ name: "", type: "string" }],
  stateMutability: "view",
  type: "function",
}] as const;

const client = createPublicClient({
  chain: astarZkEVM,
  transport: http()
});

async function updateBaseUriExtension() {
  console.log('Updating baseUriExtension in output.json...\n');

  const outputPath = path.join(__dirname, 'data/output.json');

  let outputConfig: Record<string, any> = {};
  if (fs.existsSync(outputPath)) {
    outputConfig = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  }

  const results = await Promise.allSettled(
    Object.entries(outputConfig)
      .filter(([_, data]) => data.contractType !== 'ERC1155')
      .map(async ([project, data]) => {
        try {
          const contract = getContract({
            address: data.address as Address,
            abi: erc721Abi,
            client
          });

          // Get tokenURI for token ID 1
          const uri = await contract.read.tokenURI([1n]);

          // Extract baseUriExtension
          let baseUriExtension = null;
          if (uri) {
            if (uri.endsWith('.json')) {
              baseUriExtension = '.json';
            } else {
              // For any URI without .json, set extension to empty string
              baseUriExtension = '';
            }
            console.log(`Project ${project} - tokenURI(1): ${uri} --- ${baseUriExtension}`);
          }

          return {
            project,
            baseUriExtension
          };
        } catch (error) {
          console.error(`Error processing project ${project}:`, error);
          return {
            project,
            baseUriExtension: null
          };
        }
      })
  );

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const { project, baseUriExtension } = result.value;
      // Store empty string as "" instead of null
      outputConfig[project].baseUriExtension = baseUriExtension === null ? null : baseUriExtension;
      console.log(`Project ${project} - baseUriExtension: ${baseUriExtension === null ? 'null' : `"${baseUriExtension}"`}`);
    }
  });

  fs.writeFileSync(outputPath, JSON.stringify(outputConfig, (key, value) => {
    return value === null ? null : value;
  }, 2));
  console.log(`\nUpdated output.json with baseUriExtension information`);
}

updateBaseUriExtension().catch(console.error);