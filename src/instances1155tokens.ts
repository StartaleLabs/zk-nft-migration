import axios from 'axios';
import { wait } from './utils';

interface TokenInstance1155 {
    id: string;
}

interface ApiResponse {
    items: TokenInstance1155[];
    next_page_params: {
        items_count?: number;
    } | null;
}
interface HoldersResponse {
    items: any[];
    next_page_params: {
        address_hash?: string;
        items_count?: number;
        token_id?: string;
        value?: number;
    } | null;
}

const BASE_API_URL = 'https://astar-zkevm.explorer.startale.com/api/v2';
const CONTRACT = '0x2e6ff2a374844ed25E4523da53292a89B93e8905';

async function fetchAndLogInstances(contractAddress: string) {
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
                let totalHolders = 0;
                let holdersPageParams = null;

                while (true) {
                    const holdersResponse: { data: HoldersResponse } = await axios.get<HoldersResponse>(
                        `${BASE_API_URL}/tokens/${contractAddress}/instances/${instance.id}/holders`,
                        {
                            params: holdersPageParams || {}
                        }
                    );

                    totalHolders += holdersResponse.data.items.length;

                    if (!holdersResponse.data.next_page_params) break;
                    holdersPageParams = holdersResponse.data.next_page_params;
                    await wait(200);
                }

                console.log(`Token ${instance.id}, Holders: ${totalHolders}`);
                await wait(200);
            }

            if (!response.data.next_page_params) break;
            nextPageParams = response.data.next_page_params;

        } catch (error) {
            console.error('Error:', error);
            break;
        }
    }
}


fetchAndLogInstances(CONTRACT).catch(console.error);