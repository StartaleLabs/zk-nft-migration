// npx hardhat run scripts/mint-Yoki.ts
import { createPublicClient, createWalletClient, http, PublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { readConfig } from './readConfig';
import FreeMintArtifact from '../artifacts/contracts/FreeMint.sol/FreeMint.json';
import { estimateBulkMintGas1155, printGasEstimateShort, Yoki1155ABI } from './utils';

const FreeMintABI = FreeMintArtifact.abi;

// Read configuration
const { projectName, chain, contractAddress, privateKey } = readConfig();

// Constants
const BATCH_SIZE = 500;
const START_TOKEN_ID = 1;
const WAIT_BEFORE_NEXT_BATCH = 2000;

function printBatchInfo(
    batchNumber: number,
    recipients: `0x${string}`[],
    tokenIds: bigint[],
    totalRecords: number
) {
    console.log(`\n=== Batch Number: ${batchNumber}, start ${recipients[0].toString()},${tokenIds[0].toString()} ===`);
    console.log(`Progress: ${BATCH_SIZE * batchNumber}(${totalRecords}) === ${Math.round((BATCH_SIZE * batchNumber) / totalRecords * 100)}%`);
}

async function verifyTotalSupply(
    publicClient: PublicClient,
    contractAddress: `0x${string}`,
    expectedSupply: bigint
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

    const totalTokensToMint = records.reduce((sum: bigint, record: any) => {
        return sum + BigInt(record.balance);
    }, 0n);

    console.log(`\nStarting from token ID: ${START_TOKEN_ID}`);
    console.log(`Records to process: ${records.length} out of ${allRecords.length}`);
    console.log(`Total tokens to mint: ${totalTokensToMint}`);
    console.log(`Batch size: ${BATCH_SIZE}\n`);

    let totalMinted = 0n;

    // Process in batches
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const recipients = batch.map((record: any) => record.address as `0x${string}`);
        const tokenIds = batch.map((record: any) => BigInt(record.tokenId));
        const balances = batch.map((record: any) => BigInt(record.balance));

        // Calculate tokens in this batch
        const batchTotal: bigint = balances.reduce((sum: bigint, balance: bigint) => sum + balance, 0n);
        totalMinted += batchTotal;

        printBatchInfo(i / BATCH_SIZE + 1, recipients, tokenIds, allRecords.length);
        console.log(`Tokens in batch: ${batchTotal}, Total minted so far: ${totalMinted}/${totalTokensToMint}`);

        try {
            const gasEstimate = await estimateBulkMintGas1155(
                publicClient,
                contractAddress,
                account,
                recipients,
                tokenIds,
                balances
            );

            printGasEstimateShort(gasEstimate);

            const hash = await walletClient.writeContract({
                address: contractAddress,
                abi: Yoki1155ABI,
                functionName: 'bulkMint',
                args: [recipients, tokenIds, balances],
            });

            console.log(`Transaction hash: ${hash}`);

            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            console.log('✅ Batch minted successfully\n');
        } catch (error) {
            console.error('❌ Error minting batch:', error);
            process.exit(1);
        }

        if (i + BATCH_SIZE < records.length) {
            console.log('Waiting before next batch...');
            await new Promise(resolve => setTimeout(resolve, WAIT_BEFORE_NEXT_BATCH));
        }
    }

    console.log('\n✨ All batches processed successfully');

    // Verify final total supply
    await verifyTotalSupply(publicClient, contractAddress, totalMinted);
}

main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
});