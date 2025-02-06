import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { wait } from './utils';

interface Transfer {
    total: {
        token_id: string;
    };
    from: {
        hash: string;
    };
    to: {
        hash: string;
    };
    tx_hash: string;
    block_number: string;
}

interface ApiResponse {
    items: Transfer[];
    next_page_params: {
        block_number: string;
        index: string;
        items_count: string;
    } | null;
}

async function fetchAllTransfers(contractAddress: string): Promise<Transfer[]> {
    const transfers: Transfer[] = [];
    let nextPageParams = null;
    
    while (true) {
        const response: { data: ApiResponse } = await axios.get<ApiResponse>(
            `https://astar-zkevm.explorer.startale.com/api/v2/tokens/${contractAddress}/transfers`,
            {
                params: nextPageParams || {}
            }
        );
        
        transfers.push(...response.data.items);
        console.log(`Fetched ${response.data.items.length} transfers, total: ${transfers.length}`);
        
        if (!response.data.next_page_params) break;
        nextPageParams = response.data.next_page_params;
        await wait(200);
    }
    
    return transfers;
}


function processTransfers(transfers: Transfer[]): Map<string, Set<string>> {
    const ownership = new Map<string, Set<string>>();
    
    // Sort transfers chronologically
    transfers.sort((a, b) => parseInt(a.block_number) - parseInt(b.block_number));
    
    for (const transfer of transfers) {
        const tokenId = transfer.total.token_id;
        if (!tokenId) {
            console.warn(`Missing token_id for transfer ${transfer.tx_hash}`);
            continue;
        }
        
        const from = transfer.from.hash;
        const to = transfer.to.hash;
        
        // Checks if sender has any tokens
        // If yes, removes transferred tokenId from sender's set
        // Skip for mints (when token is new)
        if (ownership.has(from)) {
            ownership.get(from)!.delete(tokenId);
        }
        
        // If receiver has no tokens yet, create new Set
        if (!ownership.has(to)) {
            ownership.set(to, new Set());
        }

        // Add transferred tokenId to receiver's set
        // This handles both mints and transfers
        ownership.get(to)!.add(tokenId);
    }
    
    return ownership;
}

async function main() {
    const CONTRACT_ADDRESS = '0x35EdfFB12F93253f1c567a7e207F06E1B0de9D8e'; 
    const transfers = await fetchAllTransfers(CONTRACT_ADDRESS);
    const ownership = processTransfers(transfers);
    
    // Write to CSV
    const csvRows = ['address,tokenId'];
    for (const [address, tokens] of ownership) {
        for (const tokenId of tokens) {
            csvRows.push(`${address},${tokenId}`);
        }
    }
    
    fs.writeFileSync(
        path.join(__dirname, 'data/casio.csv'),
        csvRows.join('\n')
    );
}

main().catch(console.error);