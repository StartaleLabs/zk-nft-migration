import { createPublicClient, http, getContract } from 'viem';
import { mainnet } from 'viem/chains';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ABI } from './abi721a'

// Load environment variables from .env file
dotenv.config();

// Define the input file path
const inputFilePath = path.join(__dirname, 'data/projects.json');

// Define the output file path
const outputFilePath = path.join(__dirname, 'data/output.json');

// Read the input JSON from the file
const inputJson = JSON.parse(fs.readFileSync(inputFilePath, 'utf-8'));

const erc721Abi = [
    "function totalSupply() view returns (uint256)",
    "function owner() view returns (address)",
    "function DEFAULT_ADMIN_ROLE view returns (address)"
];

// Initialize the client using the RPC URL from the environment variable
const client = createPublicClient({
    chain: mainnet,
    transport: http(process.env.RPC || '')
});

// Define the interface for contract details
interface ContractDetails {
    totalSupply: string;
    owner: string;
}

// Function to get contract details
async function getContractDetails(address: string): Promise<ContractDetails> {
    try {
        const contract = getContract({
            address: address as `0x${string}`,
            abi: ABI,
            client
        });
        const totalSupply = await contract.read.totalSupply() as unknown as bigint;
        const owner = await contract.read.DEFAULT_ADMIN_ROLE() as unknown as string;
        return { totalSupply: totalSupply.toString(), owner };
    } catch (error) {
        console.error(`Failed to get contract details for address ${address}:`, error);
        return { totalSupply: '0', owner: '' };
    }
}

// Main function to process the input JSON and generate the output JSON
async function main() {
    const outputJson: Record<string, ContractDetails> = {};

    for (const [key, address] of Object.entries(inputJson)) {
        console.log(`Getting contract details for ${key} at address ${address}`);
        const details = await getContractDetails(address as string);
        outputJson[key] = {
            totalSupply: details.totalSupply,
            owner: details.owner
        };
    }

    // Write the output JSON to a file
    fs.writeFileSync(outputFilePath, JSON.stringify(outputJson, null, 2));
    console.log("Output written to output.json");
}

// Run the main function
main().catch(console.error);
