import { createPublicClient, http, getContract, Address } from 'viem';
import { astarZkEVM } from 'viem/chains';
import fs from 'fs';
import path from 'path';
import { wait } from './utils';

const erc1155Abi = [
    {
        inputs: [
            { name: "account", type: "address" },
            { name: "id", type: "uint256" }
        ],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    }
];

const client = createPublicClient({
    chain: astarZkEVM,
    transport: http()
});

interface ProjectConfig {
    address: Address;
}

async function verifyInstances(projectName: string, contractAddress: Address) {
    const csvPath = path.join(__dirname, `instances/${projectName}_instances.csv`);
    if (!fs.existsSync(csvPath)) {
        console.error(`No instances file found for ${projectName}`);
        return;
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').slice(1);
    
    const sampleSize = Math.max(Math.floor(lines.length * 0.01), 1);
    const samples = lines
        .sort(() => 0.5 - Math.random())
        .slice(0, sampleSize)
        .filter(line => line.trim());

    const contract = getContract({
        address: contractAddress,
        abi: erc1155Abi,
        client
    });

    let verified = 0;
    let failed = 0;

    for (const line of samples) {
        const [address, tokenId, csvAmount] = line.split(',');
        try {
            const onchainAmount = await contract.read.balanceOf([
                address as Address,
                BigInt(tokenId)
            ]) as bigint;
            
            if (onchainAmount.toString() === csvAmount) {
                verified++;
            } else {
                failed++;
                console.error(`Mismatch for token ${tokenId} and address ${address}:`);
                console.error(`  CSV amount: ${csvAmount}`);
                console.error(`  Chain amount: ${onchainAmount.toString()}`);
            }
        } catch (error) {
            failed++;
            console.error(`Error verifying token ${tokenId} for ${address}:`, error);
        }
    }

    console.log(`Results for ${projectName} with total ${lines.length-1}:`);
    console.log(`  Total samples: ${samples.length}`);
    console.log(`  Verified: ${verified}`);
    console.log(`  Failed: ${failed}`);
    console.log('-------------------');
}

async function main() {
    const startTime = new Date();
    console.log(`\nStarting verification process at: ${startTime.toISOString()}`);
    
    const inputPath = path.join(__dirname, 'data/zk_input_1155.json');
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