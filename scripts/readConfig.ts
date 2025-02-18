import { Chain } from 'viem';
import { sepolia, soneium, soneiumMinato, hardhat } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from "dotenv";

interface ConfigResult {
  projectName: string;
  chain: Chain;
  contractAddress: `0x${string}`;
}

export function readConfig(): ConfigResult {
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });

  // Read project to populate
  const projectName = process.env.CURRENT_PROJECT;
  if (!projectName) {
    throw new Error(`Current project not set in .env file`);
  }

  // Read network to use
  const chainName = process.env.CHAIN_NAME || '';
  let chain: Chain;
  
  if (!chainName) {
    throw new Error(`Chain not set in .env file`);
  }
  
  if (chainName === 'Sepolia') {
    chain = sepolia;
  } else if (chainName === 'Soneium') {
    chain = soneium;
  } else if (chainName === 'Minato') {
    chain = soneiumMinato;
  } else if (chainName === 'Hardhat') {
    chain = hardhat;
  } else {
    throw new Error(`Chain ${chainName} not supported`);
  }

  // Read contract address from JSON file
  const contractsPath = path.join(__dirname, `./${chainName}Contracts.json`);
  const contracts = JSON.parse(fs.readFileSync(contractsPath, 'utf-8'));
  
  if (!contracts[projectName]) {
    throw new Error(`Project ${projectName} not found in ${chainName}Contracts.json`);
  }
  
  const contractAddress = contracts[projectName].address as `0x${string}`;
  if (!contractAddress) {
    throw new Error(`Contract ${contractAddress} not found in ${chainName}Contracts.json`);
  }

  console.log(`\n=== Processing project: ${projectName}, ${chainName}, ${chain.id} Address: ${contractAddress} ===`);

  return {
    projectName,
    chain,
    contractAddress
  };
}