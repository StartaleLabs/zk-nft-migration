import fs from 'fs';
import path from 'path';
import axios from 'axios';

const BASE_API_URL = 'https://astar-zkevm.explorer.startale.com/api/v2';
const OUTPUT_PATH = path.join(__dirname, 'data/output.json');

async function checkMintPayable(contractAddress: string, projectName: string): Promise<boolean> {
  try {
    const response = await axios.get(
      `${BASE_API_URL}/smart-contracts/${contractAddress}/methods-write?is_custom_abi=false`,
      { headers: { accept: 'application/json' } }
    );

    const methods = response.data;
    return methods.some((method: any) => method.name === 'mint' && method.stateMutability === 'payable');
  } catch (error) {
    console.error(`Error fetching methods for ${projectName} (${contractAddress}):`);
    return false;
  }
}

async function updateIsMintPayable() {
  console.log('Updating isMintPayable in output.json...\n');

  let outputConfig: Record<string, any> = {};
  if (fs.existsSync(OUTPUT_PATH)) {
    outputConfig = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
  }

  const results = await Promise.allSettled(
    Object.entries(outputConfig).map(async ([project, data]) => {
      const isMintPayable = await checkMintPayable(data.address, project);
      return { project, isMintPayable };
    })
  );

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const { project, isMintPayable } = result.value;
      outputConfig[project].isMintPayable = isMintPayable;
    }
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(outputConfig, null, 2));
  console.log(`Updated output.json with isMintPayable information`);
}

updateIsMintPayable().catch(console.error);