import { createPublicClient, http } from 'viem';
import { soneiumMinato, sepolia } from 'viem/chains';

async function checkNonce(address: `0x${string}`) {
    const networks = [
        {
            name: 'Minato',
            client: createPublicClient({
                chain: soneiumMinato,
                transport: http('http://rpc.minato.soneium.org')
            })
        },
        {
            name: 'Soneium',
            client: createPublicClient({
                chain: sepolia,
                transport: http('http://rpc.soneium.org')
            })
        },
        {
            name: 'Sepolia',
            client: createPublicClient({
                chain: sepolia,
                transport: http('https://ethereum-sepolia-rpc.publicnode.com')
            })
        }
    ];

    for (const network of networks) {
        try {
            console.log(`\n=== ${network.name} Network ===`);
            const [pendingNonce, confirmedNonce] = await Promise.all([
                network.client.getTransactionCount({
                    address,
                    blockTag: 'pending'
                }),
                network.client.getTransactionCount({
                    address,
                    blockTag: 'latest'
                })
            ]);

            console.log(`Pending nonce: ${pendingNonce}`);
            console.log(`Confirmed nonce: ${confirmedNonce}`);
            console.log(`Pending transactions: ${pendingNonce - confirmedNonce}`);
        } catch (error) {
            console.error(`Error checking ${network.name}:`, error);
        }
    }
}

// Check the address
const address = '0x911d82b108804a18022d0a2621b2fc608def6fca' as `0x${string}`;
checkNonce(address).catch(console.error);