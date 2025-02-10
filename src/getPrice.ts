import { createPublicClient, http, getContract, Address, PublicClient, getAbiItem } from 'viem';
import { astarZkEVM } from 'viem/chains';
import type { ProjectConfig } from './types/config';
import fs from 'fs';
import path from 'path';

const erc721Abi = [{
  inputs: [],
  name: "price",
  outputs: [{ name: "", type: "uint256" }],
  stateMutability: "view",
  type: "function",
}] as const;

const client = createPublicClient({
  chain: astarZkEVM,
  transport: http()
});

async function hasPriceFunction(address: Address, client: PublicClient): Promise<boolean> {
    try {
      const priceItem = getAbiItem({
        abi: erc721Abi,
        name: 'price'
    });
      
      // If we can get the ABI item, the function exists
      return !!priceItem;
    } catch (error) {
      console.error(`Error checking price function for ${address}:`, error);
      return false;
    }
  }

async function checkPrice() {
  console.log('Checking price for all projects and updating output.json...\n');

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
      console.log(`Checking ${project}...`);
      try {
        const hasPrice = await hasPriceFunction(data.address as Address, client);
        if (!hasPrice) {
          console.log(`${project}: No price function found`);
          return { project, price: null };
        }

        const contract = getContract({
          address: data.address as Address,
          abi: erc721Abi,
          client
        });

        const price = await contract.read.price();
        console.log(`${project}: ${price} wei`);
        return { project, price: price.toString() };
      } catch (error) {
        console.error(`Error reading price for ${project}:`, error);
        return { project, price: null };
      }
    })
  );

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const { project, price } = result.value;
      outputConfig[project] = {
        ...inputConfig[project],
        ...outputConfig[project],
        price
      };
    }
  });

  fs.writeFileSync(outputPath, JSON.stringify(outputConfig, null, 2));
  console.log(`Updated output.json with price information`);
}

checkPrice().catch(console.error);