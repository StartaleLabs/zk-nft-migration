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

async function updateMetadataEntries() {
  console.log('Updating metadataEntries in output.json...\n');

  const outputPath = path.join(__dirname, 'data/output.json');

  let outputConfig: Record<string, any> = {};
  if (fs.existsSync(outputPath)) {
    outputConfig = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  }

  const results = await Promise.allSettled(
    Object.entries(outputConfig).map(async ([project, data]) => {
      try {
        const contract = getContract({
          address: data.address as Address,
          abi: erc721Abi,
          client
        });

        let totalSupply = data.totalSupply;
        if (data.startsWithToken0) {
          totalSupply -= 1;
        }

        const uri = await contract.read.tokenURI([BigInt(totalSupply)]);
        const metadataEntry = uri.split('/').pop()?.replace('.json', '');

        return { project, metadataEntry };
      } catch (error) {
        console.error(`Error processing project ${project}:`, error);
        return { project, metadataEntry: null };
      }
    })
  );

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const { project, metadataEntry } = result.value;
      if (metadataEntry) {
        outputConfig[project].metadataEntries = metadataEntry;
      }
    }
  });

  fs.writeFileSync(outputPath, JSON.stringify(outputConfig, null, 2));
  console.log(`Updated output.json with metadataEntries information`);
}

updateMetadataEntries().catch(console.error);