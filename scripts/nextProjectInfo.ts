import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from "dotenv";

async function main() {
  // Load environment variables
  dotenv.config();

  // Get project name from env
  const projectName = process.env.CURRENT_PROJECT;
  if (!projectName) {
    throw new Error(`Current project not set in .env file`);
  }
  const deploymentNetwork = process.env.CHAIN_NAME;
  if (!deploymentNetwork) {
    throw new Error(`Deployment CHAIN_NAME not set in .env file`);
  }

  // Read and parse the JSON file
  const inputPath = path.join(__dirname, '../zk_snapshot_scripts/src/data/output.json');
  const inputData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  // Get project data
  const projectData = inputData[projectName];
  if (!projectData) {
    throw new Error(`Project ${projectName} not found in output.json`);
  }

  // Print project information
  console.log("===================================================");
  console.log(`Project: ${projectName}, Network: ${deploymentNetwork}`);
  console.log("===================================================");
  console.log(`Name: ${projectData.name}`);
  console.log(`Symbol: ${projectData.symbol}`);
  console.log(`Base URI: ${projectData.baseURI}`);
  console.log(`Base Extension: ${projectData.baseUriExtension}`);
  console.log(`Max Supply: ${projectData.maxSupply}`);
  console.log(`Mint Limit: ${projectData.mintLimit}`);
  console.log(`Start Token ID: ${projectData.startsWithToken0 ? 0 : 1}`);
  console.log(`Is Payable: ${projectData.isMintPayable ? 'Yes' : 'No'}`);
  console.log(`Total Supply: ${projectData.totalSupply}`);
  console.log(`Metadata Entries: ${projectData.metadataEntries}`);
}

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});