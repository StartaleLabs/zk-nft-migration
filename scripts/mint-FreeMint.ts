import { createPublicClient, createWalletClient, http, PublicClient } from 'viem';
import { privateKeyToAccount, PrivateKeyAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import FreeMintArtifact from '../artifacts/contracts/FreeMint.sol/FreeMint.json';
import { readConfig } from './readConfig';

const FreeMintABI = FreeMintArtifact.abi;

// Read configuration
const { projectName, chain, contractAddress } = readConfig();

// Constants
const BATCH_SIZE = 500;

interface GasEstimate {
    gasEstimate: bigint;
    gasPrice: bigint;
    gasCostInWei: bigint;
    gasCostInEth: number;
}

async function estimateBulkMintGas(
    publicClient: PublicClient,
    contractAddress: `0x${string}`,
    account: PrivateKeyAccount,
    recipients: `0x${string}`[],
    tokenIds: bigint[]
): Promise<GasEstimate> {
    const gasEstimate = await publicClient.estimateContractGas({
        address: contractAddress,
        abi: FreeMintABI,
        functionName: 'bulkMint',
        args: [recipients, tokenIds],
        account: account.address,
    });

    const gasPrice = await publicClient.getGasPrice();
    const gasCostInWei = gasEstimate * gasPrice;
    const gasCostInEth = Number(gasCostInWei) / 1e18;

    return {
        gasEstimate,
        gasPrice,
        gasCostInWei,
        gasCostInEth
    };
}

function printBatchInfo(
    batchNumber: number,
    batchSize: number,
    recipients: `0x${string}`[],
    tokenIds: bigint[]
) {
    console.log('\n=== Batch Information ===');
    console.log(`Batch Number: ${batchNumber}`);
    console.log(`Batch Size: ${batchSize}`);
    console.log(`First Address: ${recipients[0]}`);
    console.log(`First TokenId: ${tokenIds[0].toString()}`);
    console.log(`Last Address: ${recipients[recipients.length - 1]}`);
    console.log(`Last TokenId: ${tokenIds[tokenIds.length - 1].toString()}`);
}

function printGasEstimate(gasEstimate: GasEstimate) {
    console.log('\n=== Gas Estimation ===');
    console.log(`Gas Units: ${gasEstimate.gasEstimate.toString()}`);
    console.log(`Gas Price: ${gasEstimate.gasPrice.toString()} wei`);
    console.log(`Total Cost: ${gasEstimate.gasCostInEth.toFixed(6)} ETH`);
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

    console.log(`Using address: ${account.address}`);

    const publicClient = createPublicClient({
        chain: chain,
        transport: http()
    });

    const walletClient = createWalletClient({
        account,
        chain: chain,
        transport: http()
    });

    // Read and parse CSV file
    const csvPath = path.join(__dirname, `../zk_snapshot_scripts/src/instances/${projectName}_instances.csv`);
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true
    });

    console.log(`\nTotal records to process: ${records.length}`);

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