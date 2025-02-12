import { createPublicClient, http, getContract, Address } from 'viem';
import { astarZkEVM } from 'viem/chains';
import type { ProjectConfig } from './types/config';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

interface ExplorerResponse {
    status: string;
    message: string;
    result: Array<{
      ContractName: string;
      Implementation?: string;
      Proxy?: string;
    }>;
  }
  
  const ASTAR_ZKEVM_EXPLORER = 'https://astar-zkevm.explorer.startale.com/api';
  const API_KEY = process.env.EXPLORER_API_KEY || '';
  
  async function getContractName(address: string): Promise<string | null> {
    try {
      const { data } = await axios.get<ExplorerResponse>(
        `${ASTAR_ZKEVM_EXPLORER}?module=contract&action=getsourcecode&address=${address}&apikey=${API_KEY}`
      );
      
      if (data.status === '1' && data.result[0].ContractName) {
        return data.result[0].ContractName;
      }
      return null;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`Error fetching contract name: ${error.message}`);
      } else {
        console.error(`Unexpected error: ${error}`);
      }
      return null;
    }
  }

async function checkContractNames() {
  console.log('Checking contract names and updating output.json...\n');

  const inputPath = path.join(__dirname, 'data/zk_input_1155.json');
  const outputPath = path.join(__dirname, 'data/output.json');
  
  const inputConfig: Record<string, ProjectConfig> = JSON.parse(
    fs.readFileSync(inputPath, 'utf-8')
  );

  let outputConfig: Record<string, ProjectConfig> = {};
  if (fs.existsSync(outputPath)) {
    outputConfig = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  }

  for (const [project, data] of Object.entries(inputConfig)) {
    console.log(`Checking ${project}...`);
    const contractName = await getContractName(data.address);
    console.log(`Contract Name: ${contractName || 'Not found'}`);
    console.log('-'.repeat(50));

    outputConfig[project] = {
      ...inputConfig[project],
      ...outputConfig[project],
      contractName: contractName
    };
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  fs.writeFileSync(outputPath, JSON.stringify(outputConfig, null, 2));
  console.log(`Updated output.json with contract names`);
}

checkContractNames().catch(console.error);