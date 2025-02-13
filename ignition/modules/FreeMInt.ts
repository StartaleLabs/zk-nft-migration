import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import fs from 'fs';
import path from 'path';

const FreeMintModule = buildModule("FreeMintModule", (m) => {
  // Set project name to read it's parameters from output.json
  const projectName = "Walkmon";

  // Read and parse the JSON file
  const outputPath = path.join(__dirname, '../../zk_snapshot_scripts/src/data/output.json');
  const outputData = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

  // Get project data
  const projectData = outputData[projectName];
  if (!projectData) {
    throw new Error(`Project ${projectName} not found in output.json`);
  }

  // add tests for this class of projects
  if (projectData.maxSupply == undefined || projectData.maxSupply == 0 || projectData.maxSupply == null) {
    throw new Error(`Project ${projectName} maxSupply=${projectData.maxSupply} is invalid`);
  }
  if (projectData.mintLimit == undefined || projectData.mintLimit == null) {
    throw new Error(`Project ${projectName} mintLimit=${projectData.mintLimit} is invalid`);
  }
  if (!projectData.baseURI == undefined || projectData.baseURI == null) {
    throw new Error(`Project ${projectName} baseURI=${projectData.baseURI} is invalid`);
  }
  if (projectData.isMintPayable) {
    throw new Error(`Project ${projectName} is payable and cannot be deployed with this contract`);
  }
  if (projectData.totalSupply != projectData.metadataEntries) {
    throw new Error(`Project ${projectName} has different metadata handling`);
  }

  // Convert values to proper types and handle defaults
  const name = projectData.name;
  const symbol = projectData.symbol;
  const baseURI = projectData.baseURI || "";
  const baseExtension = ".json";
  const maxSupply = projectData.maxSupply;
  const mintLimit = projectData.mintLimit;
  const startWithTokenId = projectData.startsWithToken0 ? 0n : 1n;

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
  console.log("=====================\n");

  const freeMint = m.contract("FreeMint", [
    name,
    symbol,
    baseURI,
    baseExtension,
    maxSupply,
    mintLimit,
    startWithTokenId
  ]);

  return { freeMint };
});

export default FreeMintModule;