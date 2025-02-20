import { createPublicClient, http, Address } from 'viem';
import { astarZkEVM } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';

// ABI for counter function
const ABI = [
  {
    inputs: [{ name: "x", type: "uint256" }],
    name: "counter",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

async function main() {
  const client = createPublicClient({
    chain: astarZkEVM,
    transport: http(),
  });

  const contractAddress = "0x35e9f0E783140dad67e2A3502362805c7E65Ed69" as Address;
  let sum = 0n;

  // Read and parse CSV file
  const csvPath = path.join(__dirname, '../zk_snapshot_scripts/src/instances/his_instances.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').slice(1); // Skip header

  console.log("\nReading counter values and comparing with CSV...");
  console.log("==============================================");

  // Read values from 0 to 50
  for (let i = 0; i <= 50; i++) {
    try {
      // Get contract value
      const value = await client.readContract({
        address: contractAddress,
        abi: ABI,
        functionName: "counter",
        args: [BigInt(i)],
      });

      // Count CSV entries for this tokenId
      const csvEntries = lines
        .filter(line => line.trim())
        .filter(line => {
          const [, tokenId, balance] = line.split(',');
          return tokenId === i.toString();
        })
        .reduce((acc, line) => {
          const [, , balance] = line.split(',');
          return acc + parseInt(balance);
        }, 0);

      sum += value;

      // Compare and print results
      if (BigInt(csvEntries) === value) {
        console.log(`counter(${i}) = ${value}, CSV count: ${csvEntries} ✅`);
      } else {
        console.log(`counter(${i}) = ${value}, CSV count: ${csvEntries} ❌ MISMATCH!`);
      }

    } catch (error) {
      console.error(`Error reading counter(${i}):`, error);
    }
  }

  console.log("\nResults:");
  console.log("========");
  console.log(`Total sum from contract: ${sum}`);
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});