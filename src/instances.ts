import axios from 'axios';
import fs from 'fs';
import path from 'path';


interface TokenInstance {
    id: string;
    is_unique: boolean;
    owner: {
        hash: string;
    };
}

interface ApiResponse {
    items: TokenInstance[];
    next_page_params: {
        index: string;
        items_count: string;
    } | null;
}

interface ProjectConfig {
    address: string;
    tokenURIchangeNeeded: string;
}

interface TokenCounters {
    token_holders_count: string;
    transfers_count: string;
}
const BASE_API_URL = 'https://astar-zkevm.explorer.startale.com/api/v2';


async function fetchAllInstances(contractAddress: string): Promise<Map<string, string>> {
    const ownership = new Map<string, string>();
    let nextPageParams = null;
    
    while (true) {
        try {
            const response: { data: ApiResponse } = await axios.get<ApiResponse>(
                `${BASE_API_URL}/tokens/${contractAddress}/instances`,
                {
                    params: nextPageParams || {}
                }
            );
            
            for (const instance of response.data.items) {
                ownership.set(instance.id, instance.owner.hash);
            }
            
            console.log(`Fetched ${response.data.items.length} instances, total: ${ownership.size}`);
            
            if (!response.data.next_page_params) break;
            nextPageParams = response.data.next_page_params;
            await new Promise(resolve => setTimeout(resolve, 200));
            
        } catch (error) {
            console.error('Error fetching instances:', error);
            break;
        }
    }
    
    return ownership;
}

async function writeOwnershipToCsv(projectName: string, ownership: Map<string, string>) {
    const outputPath = path.join(__dirname, `data/${projectName}_instances.csv`);
    const csvContent = ['address,tokenId\n'];
    
    for (const [tokenId, address] of ownership) {
        csvContent.push(`${address},${tokenId}\n`);
    }
    
    fs.writeFileSync(outputPath, csvContent.join(''));
    console.log(`Written ${ownership.size} entries to ${outputPath}`);
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

async function main() {
    const inputPath = path.join(__dirname, 'data/zk_input_test.json');
    const inputJson: Record<string, ProjectConfig> = JSON.parse(
        fs.readFileSync(inputPath, 'utf-8')
    );

    for (const [projectName, config] of Object.entries(inputJson)) {
        console.log(`Processing ${projectName}...`);
        
        const counters = await getTokenCounters(config.address);
        if (!counters) {
            console.error(`Failed to get counters for ${projectName}`);
            continue;
        }

        console.log(`Token has ${counters.token_holders_count} holders`);
        
        try {
            const ownership = await fetchAllInstances(config.address);
            const totalSupply = await axios.get(`${BASE_API_URL}/tokens/${config.address}`);
            
            // Verify we got all instances
            if (ownership.size !== parseInt(totalSupply.data.total_supply)) {
                throw new Error(`Mismatch: got ${ownership.size} instances, expected ${totalSupply.data.total_supply}`);
            }
            
            await writeOwnershipToCsv(projectName, ownership);
        } catch (error) {
            console.error(`Error processing ${projectName}:`, error);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

// Entry point
main().catch(console.error);