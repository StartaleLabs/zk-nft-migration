// src/verify-instances.ts

import { createPublicClient, http, getContract, type Address } from 'viem';
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
    
    const csvPath = path.join(__dirname, `instances/${projectName}_instances.csv`);
    if (!fs.existsSync(csvPath)) {
        console.error(`No instances file found for ${projectName}`);
        return;
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n')
        .slice(1)  // Skip header
        .filter(line => line.trim());

    const contract = getContract({
        address: contractAddress,
        abi: erc721Abi,
        client
    });

    let verified = 0;
    let failed = 0;
    let processed = 0;
    const total = lines.length;

    for (const line of lines) {
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

        processed++;
        if (processed % 500 === 0) {
            console.log(`[${projectName}] Progress: ${processed}/${total} (${verified} verified, ${failed} failed)`);
        }
    }

    console.log(`Results for ${projectName}:`);
    console.log(`  Total processed: ${processed}`);
    console.log(`  Verified: ${verified}`);
    console.log(`  Failed: ${failed}`);
    console.log('-------------------');
}

async function main() {
    const startTime = new Date();
    console.log(`\nStarting verification process at: ${startTime.toISOString()}`);
    
    const inputPath = path.join(__dirname, 'data/zk_input_721.json');
    const inputJson: Record<string, ProjectConfig> = JSON.parse(
        fs.readFileSync(inputPath, 'utf-8')
    );

    for (const [projectName, config] of Object.entries(inputJson)) {
        await verifyInstances(projectName, config.address);
        await wait(1000);
    }

    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);

    console.log(`\nVerification process completed at: ${endTime.toISOString()}`);
    console.log(`Total duration: ${minutes}m ${seconds}s`);
}

main().catch(console.error);