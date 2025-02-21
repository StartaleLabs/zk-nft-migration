import { createPublicClient, http, Address } from 'viem';
import { astarZkEVM } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';

const ABI = [
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  }
] as const;

function extractNumberFromUri(uri: string): string {
  // Remove .json extension if present
  const withoutJson = uri.replace(/\.json$/, '');
  // Get the last part after the last slash
  const parts = withoutJson.split('/');
  // Return the last part (number)
  return parts[parts.length - 1];
}

async function main() {
  // Initialize client
  const client = createPublicClient({
    chain: astarZkEVM,
    transport: http(),
  });

  const contractAddress = "0xcCb3F56AA3e998ee6A662EA822DCd3238C002933" as Address;

  // Read CSV file
  const csvPath = path.join(__dirname, '../zk_snapshot_scripts/src/instances/Kamui_instances.csv');
  const outputPath = path.join(__dirname, '../zk_snapshot_scripts/src/instances/Kamui_instances_with_uri.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('Input CSV file not found');
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  const header = lines[0];
  const dataLines = lines.slice(1).filter(line => line.trim());

  // Prepare new CSV with additional column
  let newCsvContent = header + ',tokenNumber\n';
  let processed = 0;
  const total = dataLines.length;

  console.log('\nProcessing Kamui instances...');
  console.log('----------------------------------------');

  for (const line of dataLines) {
    try {
      const [address, tokenId, balance] = line.split(',');
      
      const uri = await client.readContract({
        address: contractAddress,
        abi: ABI,
        functionName: 'tokenURI',
        args: [BigInt(tokenId)]
      });

      // Extract number from URI
      const number = extractNumberFromUri(uri);

      // Validate that we got a number
      if (!/^\d+$/.test(number)) {
        throw new Error(`Invalid number format in URI: ${uri}`);
      }

      newCsvContent += `${line},${number}\n`;
      processed++;

      if (processed % 100 === 0) {
        console.log(`Progress: ${processed}/${total}`);
      }

    } catch (error) {
      console.error(`Error processing line: ${line}`, error);
      newCsvContent += `${line},error\n`;
    }
  }

  // Write to new file with updated name to reflect content
  fs.writeFileSync(outputPath, newCsvContent);
  
  console.log('\nDone!');
  console.log(`Processed ${processed} entries`);
  console.log(`Output written to: ${outputPath}`);
}

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});