import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { assert } from 'console';

interface ProjectConfig {
    address: string;
    tokenURIchangeNeeded: string;
}

interface Holder {
    address: {
        hash: string;  // This is the actual address field from API
    };
    value: string;
}

interface PaginationParams {
    address_hash?: string;
    value?: string;
    items_count?: number;
}
interface ApiResponse {
    items: Holder[];
    next_page_params: PaginationParams | null;
}
interface TokenCounters {
    token_holders_count: string;
    transfers_count: string;
}

const BASE_API_URL = 'https://astar-zkevm.explorer.startale.com/api/v2';
const INPUT_PATH = path.join(__dirname, 'data/zk_input.json');

async function writeHoldersToCsv(projectName: string, holders: Holder[]) {
    const outputPath = path.join(__dirname, `data/${projectName}_holders.csv`);
    const csvContent = ['address,balance\n'];
    
    holders.forEach(holder => {
        // Extract hash from address object
        csvContent.push(`${holder.address.hash},${holder.value}\n`);
    });
    
    fs.writeFileSync(outputPath, csvContent.join(''));
    console.log(`Written ${holders.length} holders to ${outputPath}`);
}

async function getTokenCounters(contractAddress: string): Promise<TokenCounters | null> {
    try {
        const response = await axios.get<TokenCounters>(
            `${BASE_API_URL}/tokens/${contractAddress}/counters`,
            { headers: { accept: 'application/json' } }
        );
        return response.data;
    } catch (error) {
        console.error(`Error fetching token counters for ${contractAddress}:`, error);
        return null;
    }
}

async function fetchAllHolders(contractAddress: string): Promise<Holder[]> {
    let allHolders: Holder[] = [];
    let nextPageParams: PaginationParams | null = null;
    
    while (true) {
        try {
            const params: PaginationParams = nextPageParams ? {
                address_hash: nextPageParams.address_hash,
                value: nextPageParams.value,
                items_count: nextPageParams.items_count
            } : {};

            const response = await axios.get<ApiResponse>(
                `${BASE_API_URL}/tokens/${contractAddress}/holders`,
                { 
                    headers: { accept: 'application/json' },
                    params
                }
            );

            const newHolders = response.data.items;
            allHolders = [...allHolders, ...newHolders];
            console.log(`Fetched ${newHolders.length} holders, total: ${allHolders.length}`);
            
            nextPageParams = response.data.next_page_params;
            if (!nextPageParams) {
                console.log('No more pages available');
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.error('Error fetching holders:', error);
            break;
        }
    }
    
    return allHolders;
}


async function main() {
    const inputJson: Record<string, ProjectConfig> = JSON.parse(
        fs.readFileSync(INPUT_PATH, 'utf-8')
    );

    for (const [projectName, config] of Object.entries(inputJson)) {
        console.log(`Processing ${projectName}...`);
        
        const counters = await getTokenCounters(config.address);
        if (!counters) {
            console.error(`Failed to get counters for ${projectName}`);
            continue;
        }

        console.log(`Token has ${counters.token_holders_count} holders`);
        
        if (parseInt(counters.token_holders_count) > 0) {
            const holders = await fetchAllHolders(config.address);
            assert(holders.length === parseInt(counters.token_holders_count));
            await writeHoldersToCsv(projectName, holders);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

main().catch(console.error);