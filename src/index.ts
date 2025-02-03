import { createPublicClient, http, getContract, Address } from 'viem';
import { astarZkEVM } from 'viem/chains';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ABI } from './abi721a'

// Load environment variables from .env file
dotenv.config();

// Define the input file path
const inputFilePath = path.join(__dirname, 'data/zk_input.json');

// Define the output file path
const outputFilePath = path.join(__dirname, 'data/output.json');

// Read the input JSON from the file
const inputJson: Record<string, ProjectConfig> = JSON.parse(fs.readFileSync(inputFilePath, 'utf-8'));

// interface IDs
const ERC721_INTERFACE_ID = '0x80ac58cd';
const ERC1155_INTERFACE_ID = '0xd9b67a26';

const erc721Abi = [
    {
        inputs: [],
        name: "totalSupply",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "owner",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "name",
        outputs: [{ name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "symbol",
        outputs: [{ name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "interfaceId", type: "bytes4" }],
        name: "supportsInterface",
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    }
];

// Initialize the client using the RPC URL from the environment variable
const client = createPublicClient({
    chain: astarZkEVM,
    transport: http()
});

// Define the interface for contract details
interface ContractDetails {
    totalSupply: string;
    name: string;
    symbol: string;
    contractType: 'ERC721' | 'ERC1155' | 'UNKNOWN';
}

interface ProjectConfig {
    address: Address;
    totalSupplyFunction: string;
}

async function readTotalSupply(contract: any, totalSupplyFunction: string): Promise<string> {
    try {
        // Workaround for contract not having totalSupply function
        if (contract.address === '0xF83E63aa96B1fE8d3CbdF419b22bFb3CCcF99eBC') { // JR Kyushu Free
            return '6967';
        }
        if (contract.address === '0xC213594DDfDEc9ad65aCA5078A2557E68A4AF9f4') { // Neemo
            return '0';
        }

        // @ts-ignore - dynamic function call
        const totalSupply = await contract.read.totalSupply() as unknown as bigint;
        return totalSupply.toString();
    } catch (error) {
        console.warn(`   !!!! Warning: totalSupply call failed`);
        return '0';
    }
}

async function readOwner(contract: any): Promise<string> {
    try {
        const owner = await contract.read.owner() as unknown as string;
        return owner;
    } catch (error) {
        console.warn(`   !!! Warning: owner call failed`);
        return '';
    }
}

async function readName(contract: any): Promise<string> {
    try {
        const name = await contract.read.name() as unknown as string;
        return name;
    } catch (error) {
        console.warn(`  !!! Warning: name call failed`);
        return '';
    }
}

async function readSymbol(contract: any): Promise<string> {
    try {
        const symbol = await contract.read.symbol() as unknown as string;
        return symbol;
    } catch (error) {
        console.warn(`  !!! Warning: symbol call failed`);
        return '';
    }
}

async function getContractType(contract: any): Promise<'ERC721' | 'ERC1155' | 'UNKNOWN'> {
    try {
        const isERC721 = await contract.read.supportsInterface([ERC721_INTERFACE_ID]);
        if (isERC721) return 'ERC721';

        const isERC1155 = await contract.read.supportsInterface([ERC1155_INTERFACE_ID]);
        if (isERC1155) return 'ERC1155';

        return 'UNKNOWN';
    } catch (error) {
        console.warn(`  !!! Warning: interface check failed`);
        return 'UNKNOWN';
    }
}

async function getContractDetails(address: `0x${string}`, totalSupplyFunction: string): Promise<ContractDetails> {
    const contract = getContract({
        address,
        abi: erc721Abi,
        client
    });

    const [totalSupply, name, symbol, contractType] = await Promise.all([
        readTotalSupply(contract, totalSupplyFunction),
        readName(contract),
        readSymbol(contract),
        getContractType(contract)
    ]);
    
    return { totalSupply, name, symbol, contractType };
}

// Main function to process the input JSON and generate the output JSON
async function main() {
    const outputJson: Record<string, ContractDetails> = {};

    for (const [key, config] of Object.entries(inputJson)) {
        // console.log(`Getting contract details for ${key} at address ${config.address}`);
        const details = await getContractDetails(config.address as `0x${string}`, config.totalSupplyFunction);
        const totalSupply = String(details.totalSupply)
        console.log(`${config.address}: totalSupply=${totalSupply}, ${key}=${details.name}, ${details.symbol}, type=${details.contractType}`);
        outputJson[key] = {
            totalSupply,
            name: details.name,
            symbol: details.symbol,
            contractType: details.contractType
        };
    }

    // Write the output JSON to a file
    fs.writeFileSync(
        outputFilePath,
        JSON.stringify(outputJson, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
            , 2)
    ); console.log("Output written to output.json");
}

// Run the main function
main().catch(console.error);
