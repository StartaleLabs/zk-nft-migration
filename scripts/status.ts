import { createPublicClient, http, Address } from 'viem';
import { readConfig } from './readConfig';
import * as fs from 'fs';
import * as path from 'path';

const ABI = [
    {
        inputs: [],
        name: 'paused',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'price',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'mintPrice',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'totalSupply',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    }
] as const;

interface ContractInfo {
    project: string;
    status: string;
    price: string;
    totalSupply: string;
    freeMint: string;
    contractAddress: string;
}

const EXPLORER_URL = 'https://soneium.blockscout.com/address/';

async function getPrice(client: any, address: Address, projectName: string) {
    try {
        if (projectName === "his") {
            return await client.readContract({
                address: address,
                abi: ABI,
                functionName: 'mintPrice',
            });
        } else {
            return await client.readContract({
                address: address,
                abi: ABI,
                functionName: 'price',
            });
        }
    } catch (error) {
        return 0n;
    }
}

async function main() {
    const { chain } = readConfig();
    const chainName = process.env.CHAIN_NAME || "";

    const client = createPublicClient({
        chain,
        transport: http(),
    });

    const contractsPath = path.join(__dirname, `./${chainName}Contracts.json`);
    const contracts = JSON.parse(fs.readFileSync(contractsPath, 'utf-8'));

    console.log(`\nChecking contracts on ${chainName}:`);
    console.log('----------------------------------------');

    const contractsInfo: ContractInfo[] = [];

    for (const [projectName, contractInfo] of Object.entries(contracts)) {
        try {
            const address = (contractInfo as any).address as Address;

            const [isPaused, price, supply] = await Promise.all([
                client.readContract({
                    address,
                    abi: ABI,
                    functionName: 'paused',
                }),
                getPrice(client, address, projectName),
                client.readContract({
                    address,
                    abi: ABI,
                    functionName: 'totalSupply',
                }).catch(() => 0n),
            ]);

            contractsInfo.push({
                project: projectName,
                status: isPaused ? '🔴 PAUSED' : '🟢 active',
                price: price ? (Number(price) / 1e18).toString() + ' ETH' : 'N/A',
                totalSupply: supply.toString(),
                freeMint: Number(price) > 0 ? '🔴' : '🟢',
                contractAddress: `${address}`,
            });

        } catch (error) {
            console.error(`Error reading contract ${projectName}:`, error);
            contractsInfo.push({
                project: projectName,
                status: '❌ error',
                price: 'error',
                totalSupply: 'error',
                freeMint: '❌',
                contractAddress: 'N/A',

            });
        }
    }

    const indexedContractsInfo = contractsInfo.reduce((acc, info, i) => {
        acc[(i + 1).toString()] = info;
        return acc;
    }, {} as Record<string, ContractInfo>);

    // Calculate total supply
    const totalSum = contractsInfo.reduce((sum, info) => {
        const supply = Number(info.totalSupply);
        return isNaN(supply) ? sum : sum + supply;
    }, 0);

    // Add sum row
    indexedContractsInfo['Total'] = {
        project: '==========',
        status: '==========',
        price: '==========',
        totalSupply: '✨ ' + totalSum.toString(),
        freeMint: '==========',
        contractAddress: '=========='
    };

    console.table(indexedContractsInfo);
}

main().catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
});