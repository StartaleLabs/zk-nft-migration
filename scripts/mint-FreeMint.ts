// npx hardhat run scripts/mint-FreeMint.ts
import { createPublicClient, createWalletClient, http, PublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import FreeMintArtifact from '../artifacts/contracts/FreeMint.sol/FreeMint.json';
import { readConfig } from './readConfig';
import { estimateBulkMintGas, printGasEstimate } from './utils';

const FreeMintABI = FreeMintArtifact.abi;

// Read configuration
const { projectName, chain, contractAddress } = readConfig();

// Constants
const BATCH_SIZE = 200;
const START_TOKEN_ID = 12201;

function printBatchInfo(
    batchNumber: number,
    batchSize: number,
    recipients: `0x${string}`[],
    tokenIds: bigint[]
) {
    console.log('\n=== Batch Information ===');
    console.log(`Batch Number: ${batchNumber}`);
    console.log(`Batch Size: ${batchSize}, tokens: ${tokenIds[0].toString()}-${tokenIds[tokenIds.length - 1].toString()}`);
    console.log(`First Address: ${recipients[0]}-${recipients[recipients.length - 1]}`);
}

async function verifyTotalSupply(
    publicClient: PublicClient,
    contractAddress: `0x${string}`,
    expectedSupply: number
) {
    const totalSupply = await publicClient.readContract({
        address: contractAddress,
        abi: FreeMintABI,
        functionName: 'totalSupply',
    });

    console.log('\n=== Final Verification ===');
    console.log(`Expected total supply: ${expectedSupply}`);
    console.log(`Actual total supply: ${totalSupply}`);

    if (totalSupply === BigInt(expectedSupply)) {
        console.log('✅ Total supply matches expected value');
    } else {
        console.log('❌ Total supply mismatch!');
        throw new Error(`Total supply mismatch: expected ${expectedSupply}, got ${totalSupply}`);
    }
}

async function main() {

    // Setup Viem clients
    const rawKey = process.env.TESTNET_PRIVATE_KEY;
    const privateKey = `0x${rawKey}` as `0x${string}`;
    const account = privateKeyToAccount(privateKey);

    const publicClient = createPublicClient({
        chain: chain,
        transport: http()
    });
    
    const walletClient = createWalletClient({
        account,
        chain: chain,
        transport: http()
    });
    
    console.log(`Minting with ${account.address}, Balance: ${await publicClient.getBalance({ address: account.address })}\n`);
    
    // Read and parse CSV file
    const csvPath = path.join(__dirname, `../zk_snapshot_scripts/src/instances/${projectName}_instances.csv`);
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const allRecords = parse(fileContent, {
        columns: true,
        skip_empty_lines: true
    });

    // Filter records starting from specified token ID
    const records = allRecords.filter((record: any) =>
        parseInt(record.tokenId) >= START_TOKEN_ID
    );

    console.log(`\nStarting from token ID: ${START_TOKEN_ID}`);
    console.log(`Records to process: ${records.length} out of ${allRecords.length}`);

    // Process in batches
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const recipients = batch.map((record: any) => record.address as `0x${string}`);
        const tokenIds = batch.map((record: any) => BigInt(record.tokenId));

        printBatchInfo(i / BATCH_SIZE + 1, batch.length, recipients, tokenIds);

        try {
            const gasEstimate = await estimateBulkMintGas(
                publicClient,
                contractAddress,
                account,
                recipients,
                tokenIds
            );

            printGasEstimate(gasEstimate);

            const hash = await walletClient.writeContract({
                address: contractAddress,
                abi: FreeMintABI,
                functionName: 'bulkMint',
                args: [recipients, tokenIds],
            });

            console.log(`\nTransaction hash: ${hash}`);

            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            console.log('✅ Batch minted successfully\n');
        } catch (error) {
            console.error('❌ Error minting batch:', error);
            process.exit(1);
        }

        if (i + BATCH_SIZE < records.length) {
            console.log('Waiting 2 seconds before next batch...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    console.log('\n✨ All batches processed successfully');

    // Verify final total supply
    await verifyTotalSupply(publicClient, contractAddress, records.length);
}

main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
});