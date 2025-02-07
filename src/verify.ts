// src/verify-instances.ts

import { createPublicClient, http, getContract, Address } from 'viem';
import { astarZkEVM } from 'viem/chains';
import fs from 'fs';
import path from 'path';
import { wait } from './utils';

// Basic ERC721 ABI for ownerOf function
const erc721Abi = [
    {
        inputs: [{ name: "tokenId", type: "uint256" }],
        name: "ownerOf",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    }
];

// Initialize the client
const client = createPublicClient({
    chain: astarZkEVM,
    transport: http()
});

interface ProjectConfig {
    address: Address;
}

async function verifyInstances(projectName: string, contractAddress: Address) {
    console.log(`Verifying ${projectName}...`);
    
    // Read instances CSV file
    const csvPath = path.join(__dirname, `instances/${projectName}_instances.csv`);
    if (!fs.existsSync(csvPath)) {
        console.error(`No instances file found for ${projectName}`);
        return;
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').slice(1); // Skip header
    
    // Get 10% random sample
    const sampleSize = Math.max(Math.floor(lines.length * 0.2), 1);
    const samples = lines
        .sort(() => 0.5 - Math.random())
        .slice(0, sampleSize)
        .filter(line => line.trim());

    const contract = getContract({
        address: contractAddress,
        abi: erc721Abi,
        client
    });

    let verified = 0;
    let failed = 0;

    for (const line of samples) {
        const [csvAddress, tokenId] = line.split(',');
        try {
            const onchainOwner = await contract.read.ownerOf([BigInt(tokenId)]) as string;
            
            if (onchainOwner.toLowerCase() === csvAddress.toLowerCase()) {
                verified++;
            } else {
                failed++;
                console.error(`Mismatch for token ${tokenId}:`);
                console.error(`  CSV owner: ${csvAddress}`);
                console.error(`  Chain owner: ${onchainOwner}`);
            }
        } catch (error) {
            failed++;
            console.error(`Error verifying token ${tokenId}:`, error);
        }
    }

    console.log(`Results for ${projectName} with total ${lines.length-1}:`);
    console.log(`  Total samples: ${samples.length}`);
    console.log(`  Verified: ${verified}`);
    console.log(`  Failed: ${failed}`);
    console.log('-------------------');
}

async function main() {
    // Read input JSON
    const inputPath = path.join(__dirname, 'data/zk_input_721.json');
    const inputJson: Record<string, ProjectConfig> = JSON.parse(
        fs.readFileSync(inputPath, 'utf-8')
    );

    for (const [projectName, config] of Object.entries(inputJson)) {
        await verifyInstances(projectName, config.address);
        // Wait between projects to avoid rate limiting
        await wait(1000);
    }
}

main().catch(console.error);