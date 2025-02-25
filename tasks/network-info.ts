import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { createPublicClient, http, formatUnits, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { soneium, mainnet } from 'viem/chains';

task("network-info", "Prints network configuration including gas settings")
    .setAction(async (_, hre: HardhatRuntimeEnvironment) => {
        let chainName;

        console.log("\n=== Network Information ===");
        console.log(`Network name: ${hre.network.name}`);
        console.log(`RPC URL: ${hre.network.config.url}`);

        if (hre.network.name === 'soneium') {
            chainName = soneium;
        } else if (hre.network.name === 'mainnet') {
            chainName = mainnet;
        } else {
            throw new Error(`Unsupported network: ${hre.network.name}`);
        }

        const client = createPublicClient({
            chain: chainName,
            transport: http(hre.network.config.url)
        });

        console.log("\n=== Gas Hardhat Settings ===");
        console.log(`Gas limit (config): ${hre.network.config.gas || 'auto'}`);
        console.log(`Gas price (config): ${hre.network.config.gasPrice || 'auto'}`);

        try {
            const [gasPrice, block] = await Promise.all([
                client.getGasPrice(),
                client.getBlock()
            ]);

            console.log("\n=== Current Network Gas Data ===");
            console.log(`Current gas price: ${formatUnits(BigInt(gasPrice), 'gwei')} gwei`);
            console.log(`Base fee per gas: ${block.baseFeePerGas ? formatUnits(BigInt(block.baseFeePerGas), 'gwei') : 'N/A'} gwei`);
        } catch (error) {
            console.log("Could not fetch current gas data:", error);
        }

        try {
            const accounts = hre.network.config.accounts;
            const privateKey = Array.isArray(accounts) ? accounts[0] : undefined;
            if (typeof privateKey === 'string') {
                // Convert private key to account to get the address
                const account = privateKeyToAccount(privateKey as `0x${string}`);
                const balance = await client.getBalance({ address: account.address });

                console.log(`\n=== Signer Information on  ${client.chain.name} ===`);
                console.log(`Signer address: ${account.address}`);
                console.log(`Balance: ${formatEther(balance)} ETH`);
            }
        } catch (error) {
            console.log("Could not fetch signer information:", error);
        }
    });