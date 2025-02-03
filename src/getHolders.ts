import fs from 'fs';
import path from 'path';
import axios from 'axios';

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

interface ApiResponse {
    items: Holder[];
}

const BASE_API_URL = 'https://astar-zkevm.explorer.startale.com/api/v2';
const INPUT_PATH = path.join(__dirname, 'data/zk_input_test.json');

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

// Optional: Add debug logging
async function fetchHolders(contractAddress: string): Promise<Holder[]> {
    try {
        const response = await axios.get<ApiResponse>(
            `${BASE_API_URL}/tokens/${contractAddress}/holders`,
            { headers: { accept: 'application/json' } }
        );
        console.log('First holder example:', JSON.stringify(response.data.items[0], null, 2));
        return response.data.items;
    } catch (error) {
        console.error(`Error fetching holders for ${contractAddress}:`, error);
        return [];
    }
}

async function main() {
    const inputJson: Record<string, ProjectConfig> = JSON.parse(
        fs.readFileSync(INPUT_PATH, 'utf-8')
    );

    for (const [projectName, config] of Object.entries(inputJson)) {
        console.log(`Processing ${projectName}...`);
        const holders = await fetchHolders(config.address);
        await writeHoldersToCsv(projectName, holders);
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

main().catch(console.error);