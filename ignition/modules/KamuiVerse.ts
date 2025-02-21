// npx hardhat ignition deploy ./ignition/modules/KamuiVerse.ts --network localhost
// npx hardhat ignition deploy ./ignition/modules/KamuiVerse.ts --network sepolia --verify
// npx hardhat ignition deploy ./ignition/modules/KamuiVerse.ts --network minato --verify
// npx hardhat ignition deploy ./ignition/modules/KamuiVerse.ts --network soneium --verify

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import fs from 'fs';
import path from 'path';

function validateInput(projectName: string, projectData: any) {
  if (projectData.name == undefined || projectData.name == null || projectData.name == "") {
    throw new Error(`Project ${projectName} name=${projectData.name} is invalid`);
  }
  if (projectData.symbol == undefined || projectData.symbol == null || projectData.symbol == "") {
    throw new Error(`Project ${projectName} symbol=${projectData.symbol} is invalid`);
  }
  if (!projectData.baseURI == undefined || projectData.baseURI == null || projectData.baseURI == null) {
    throw new Error(`Project ${projectName} baseURI=${projectData.baseURI} is invalid`);
  }
  if (!projectData.baseUriExtension == undefined || projectData.baseUriExtension == null) {
    throw new Error(`Project ${projectName} baseUriExtension=${projectData.baseUriExtension} is invalid`);
  }
  if (projectData.maxSupply == undefined || projectData.maxSupply == 0 || projectData.maxSupply == null) {
    throw new Error(`Project ${projectName} maxSupply=${projectData.maxSupply} is invalid`);
  }
  if (projectData.mintLimit == undefined || projectData.mintLimit == null) {
    throw new Error(`Project ${projectName} mintLimit=${projectData.mintLimit} is invalid`);
  }
  if (!projectData.isMintPayable) {
    throw new Error(`Project ${projectName} is NOT payable and cannot be deployed with this script`);
  }
  if (Number(projectData.price) == 0 || projectData.price == undefined || projectData.price == null) {
    throw new Error(`Project ${projectName} Price is not set`);
  }
  if (projectData.totalSupply != projectData.metadataEntries) {
    throw new Error(`Project ${projectName} has different metadata handling`);
  }
}
  // Verify inputs for this class of projects
const KamuiVerseModule = buildModule("KamuiVerseModule", (m) => {
  // Set project name to read it's parameters from output.json
  const projectName = process.env.CURRENT_PROJECT;
  if (!projectName) {
    throw new Error(`Current project not set in .env file`);
  }

  // Read and parse the JSON file
  const inputPath = path.join(__dirname, '../../zk_snapshot_scripts/src/data/output.json');
  const inputData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  // Get project data
  const projectData = inputData[projectName];
  if (!projectData) {
    throw new Error(`Project ${projectName} not found in output.json`);
  }

  // Verify inputs for this class of projects
  validateInput(projectName, projectData);

  // Convert values to proper types and handle defaults
  const name = projectData.name;
  const symbol = projectData.symbol;
  const baseURI = projectData.baseURI;
  const baseExtension = projectData.baseUriExtension;
  const maxSupply = projectData.maxSupply;
  const mintLimit = projectData.mintLimit;
  const startWithTokenId = projectData.startsWithToken0 ? 0n : 1n;
  const price = projectData.price;
  const priceWei = BigInt(price * 10**18);

  // Print deployment parameters
  console.log("\nDeployment Parameters:");
  console.log("=====================");
  console.log(`Project: ${projectName}`);
  console.log(`Name: ${name}`);
  console.log(`Symbol: ${symbol}`);
  console.log(`Base URI: ${baseURI}`);
  console.log(`Base Extension: ${baseExtension}`);
  console.log(`Max Supply: ${maxSupply}`);
  console.log(`Mint Limit: ${mintLimit}`);
  console.log(`Start Token ID: ${startWithTokenId}`);
  console.log(`Price: ${priceWei} (${price})`);
  console.log("=====================\n");

  const KamuiVerse = m.contract("KamuiVerse", [
    name,
    symbol,
    baseURI,
    baseExtension,
    maxSupply,
    mintLimit,
    startWithTokenId,
    priceWei
  ]);

  return { KamuiVerse };
});

export default KamuiVerseModule;