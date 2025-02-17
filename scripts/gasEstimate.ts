import { PublicClient } from 'viem';
import { PrivateKeyAccount } from 'viem/accounts';
import FreeMintArtifact from '../artifacts/contracts/FreeMint.sol/FreeMint.json';

const FreeMintABI = FreeMintArtifact.abi;

export interface GasEstimate {
    gasEstimate: bigint;
    gasPrice: bigint;
    gasCostInWei: bigint;
    gasCostInEth: number;
}

export async function estimateBulkMintGas(
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

export function printGasEstimate(gasEstimate: GasEstimate) {
    console.log('\n=== Gas Estimation ===');
    console.log(`Gas Units: ${gasEstimate.gasEstimate.toString()}`);
    console.log(`Gas Price: ${gasEstimate.gasPrice.toString()} wei`);
    console.log(`Total Cost: ${gasEstimate.gasCostInEth.toFixed(6)} ETH`);
}