import { PublicClient } from 'viem';
import { PrivateKeyAccount } from 'viem/accounts';
import FreeMintArtifact from '../artifacts/contracts/FreeMint.sol/FreeMint.json';

const FreeMintABI = FreeMintArtifact.abi;
export const Yoki1155ABI = [
    {
        "inputs": [
            {
                "internalType": "address[]",
                "name": "recipients",
                "type": "address[]"
            },
            {
                "internalType": "uint256[]",
                "name": "tokenIds",
                "type": "uint256[]"
            },
            {
                "internalType": "uint256[]",
                "name": "amounts",
                "type": "uint256[]"
            }
        ],
        "name": "bulkMint",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]
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

export async function estimateBulkMintGas1155(
    publicClient: PublicClient,
    contractAddress: `0x${string}`,
    account: PrivateKeyAccount,
    recipients: `0x${string}`[],
    tokenIds: bigint[],
    balances: bigint[]
): Promise<GasEstimate> {
    const gasEstimate = await publicClient.estimateContractGas({
        address: contractAddress,
        abi: FreeMintABI,
        functionName: 'bulkMint',
        args: [recipients, tokenIds, balances],
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

export function printGasEstimateShort(gasEstimate: GasEstimate) {
    console.log(`Gas Estimation: Units: ${gasEstimate.gasEstimate.toString()}, Price: ${gasEstimate.gasPrice.toString()} wei, Total Cost: ${gasEstimate.gasCostInEth.toFixed(6)} ETH`);
}

export function printGasEstimate(gasEstimate: GasEstimate) {
    console.log('\n=== Gas Estimation ===');
    console.log(`Gas Units: ${gasEstimate.gasEstimate.toString()}`);
    console.log(`Gas Price: ${gasEstimate.gasPrice.toString()} wei`);
    console.log(`Total Cost: ${gasEstimate.gasCostInEth.toFixed(6)} ETH`);
}