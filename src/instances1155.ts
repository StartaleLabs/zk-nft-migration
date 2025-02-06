import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { wait } from './utils';
interface TokenInstance1155 {
    id: string;
    token: {
        address: string;
        type: string;
    };
}

interface ApiResponse {
    items: TokenInstance1155[];
    next_page_params: {
        items_count?: number;
    } | null;
}

interface TokenHolder {
    address: {
        hash: string;
    };
    token: {
        address: string;
    };
    token_id: string;
    value: string;
}

interface HoldersResponse {
    items: TokenHolder[];
    next_page_params: {
        address_hash?: string;
        items_count?: number;
        token_id?: string;
        value?: number;
    } | null;
}

interface ProjectConfig {
    address: string;
    tokenURIchangeNeeded: string;
}

const INPUT_PROJECTS_JSON = 'data/zk_input_1155.json';

const BASE_API_URL = 'https://astar-zkevm.explorer.startale.com/api/v2';

async function fetchTokenBalance(contractAddress: string, tokenId: string): Promise<Map<string, string>> {
    const balances = new Map<string, string>();
    let nextPageParams = null;

    while (true) {
        try {
            const response: { data: HoldersResponse } = await axios.get<HoldersResponse>(
                `${BASE_API_URL}/tokens/${contractAddress}/instances/${tokenId}/holders`,
                {
                    params: nextPageParams || {}
                }
            );

            if (!response.data?.items) {
                console.error(`No items in response for token ${tokenId}`);
                break;
            }

            for (const holder of response.data.items) {
                if (holder.value !== "0") {
                    balances.set(holder.address.hash, holder.value);
                }
            }

            if (!response.data.next_page_params) break;
            nextPageParams = response.data.next_page_params;
            await wait(200);

        } catch (error) {
            console.error(`Error fetching balances for token ${tokenId}:`, error);
            break;
        }
    }

    console.log(`Fetched ${balances.size} balances for token ${tokenId}`);
    return balances;
}

async function fetchAllInstances(contractAddress: string): Promise<Map<string, Map<string, string>>> {
    const ownership = new Map<string, Map<string, string>>();
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
                const balances = await fetchTokenBalance(contractAddress, instance.id);
                ownership.set(instance.id, balances);
            }

            break
            // if (!response.data.next_page_params) break;
            // nextPageParams = response.data.next_page_params;
            // await wait(200);

        } catch (error) {
            console.error('Error fetching instances:', error);
            break;
        }
    }

    console.log(`Fetched ${ownership.size} instances`);
    return ownership;
}

async function writeOwnershipToCsv(projectName: string, ownership: Map<string, Map<string, string>>) {
    const outputPath = path.join(__dirname, `instances/${projectName}_instances.csv`);
    const csvContent = ['address,tokenId,balance\n'];

    const entries: { address: string; tokenId: number; balance: string }[] = [];

    ownership.forEach((balances, tokenId) => {
        balances.forEach((balance, address) => {
            entries.push({
                address,
                tokenId: parseInt(tokenId),
                balance
            });
        });
    });

    entries.sort((a, b) => a.tokenId - b.tokenId);

    for (const entry of entries) {
        csvContent.push(`${entry.address},${entry.tokenId},${entry.balance}\n`);
    }

    fs.writeFileSync(outputPath, csvContent.join(''));
    console.log(`Written ${entries.length} entries to ${outputPath}`);
}

async function main() {
    const inputPath = path.join(__dirname, INPUT_PROJECTS_JSON);
    const inputJson: Record<string, ProjectConfig> = JSON.parse(
        fs.readFileSync(inputPath, 'utf-8')
    );

    for (const [projectName, config] of Object.entries(inputJson)) {
        console.log(`Processing ${projectName}...`);

        try {
            const ownership = await fetchAllInstances(config.address);
            await writeOwnershipToCsv(projectName, ownership);
        } catch (error) {
            console.error(`Error processing ${projectName}:`, error);
        }

        await wait(2000); // Wait between projects
    }
}

// Script entry point
main().catch(console.error);