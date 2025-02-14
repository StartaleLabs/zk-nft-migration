// groupPerContractType.ts
// there are 5 contract types in output.json
// classify them into groups and save in 5 new files
// 1. FreeMint - ERC721, maxSupply==metadataEntries, price==null, isMintPayable==false
// 2. FreeMIntLimitedMetadata - ERC721, maxSupply!=metadataEntries, price==null, isMintPayable==false
// 3. PaidMint - ERC721, maxSupply==metadataEntries, price!=null, isMintPayable==true
// 4. PaidMintLimitedMetadata - ERC721, maxSupply!=metadataEntries, price!=null, isMintPayable==true
// 5. ERC1155 - ERC1155
// If any project from output.json does not fit criteria, save it to unknown.json
// resulting files should be saved in contractType folder
// json files should have the same structure as output.json
// sort projects alphabetically by project name

import fs from 'fs';
import path from 'path';

interface ProjectData {
  address: string;
  maxSupply: number;
  metadataEntries: number;
  price: string | null;
  isMintPayable: boolean;
  contractType: string;
  [key: string]: any;
}

type GroupedProjects = Record<string, Record<string, ProjectData>>;

async function groupsPerContractType() {
  console.log('Grouping projects per contract type...\n');

  const outputPath = path.join(__dirname, 'data/output.json');
  const contractTypePath = path.join(__dirname, 'data/contractType');

  // Create contractType directory if it doesn't exist
  if (!fs.existsSync(contractTypePath)) {
    fs.mkdirSync(contractTypePath, { recursive: true });
  }

  // Initialize groups
  const groups: GroupedProjects = {
    'FreeMint': {},
    'FreeMintLimitedMetadata': {},
    'PaidMint': {},
    'PaidMintLimitedMetadata': {},
    'ERC1155': {},
    'unknown': {}
  };

  // Read and parse input file
  const outputConfig = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

  // Sort projects alphabetically
  const sortedProjects = Object.entries(outputConfig).sort(([a], [b]) => a.localeCompare(b));

  // Classify projects
  for (const [project, data] of sortedProjects) {
    const projectData = data as ProjectData;
    
    if (projectData.contractType === 'ERC1155') {
      groups.ERC1155[project] = projectData;
      continue;
    }

    if (projectData.contractType !== 'ERC721') {
      groups.unknown[project] = projectData;
      continue;
    }
    const isMetadataEqual = Number(projectData.totalSupply) === Number(projectData.metadataEntries);
    const isFreeMint = projectData.price === null && !projectData.isMintPayable;
    const isPaidMint = projectData.price !== null && projectData.isMintPayable;
    const isShortBaseUri = projectData.baseURI && !projectData.baseURI.endsWith('/');

    console.log(`Project: ${project}, isMetadataEqual: ${isMetadataEqual}, isFreeMint: ${isFreeMint}, isPaidMint: ${isPaidMint}`);
    if (isFreeMint && isMetadataEqual) {
      groups.FreeMint[project] = projectData;
      console.log("added to FreeMint");
    } else if (isFreeMint && isShortBaseUri) {
      groups.FreeMint[project] = projectData;
      console.log("added to FreeMint");
    } else if (isFreeMint && !isMetadataEqual) {
      groups.FreeMintLimitedMetadata[project] = projectData;
      console.log("added to FreeMintLimitedMetadata");
    } else if (isPaidMint && isMetadataEqual) {
      groups.PaidMint[project] = projectData;
      console.log("added to PaidMint");
    } else if (isPaidMint && !isMetadataEqual) {
      groups.PaidMintLimitedMetadata[project] = projectData;
      console.log("added to PaidMintLimitedMetadata");
    } else {
      groups.unknown[project] = projectData;
      console.log("added to unknown");
    }
  }

  // Write files
  for (const [groupName, projects] of Object.entries(groups)) {
    const fileName = `${groupName}.json`;
    const filePath = path.join(contractTypePath, fileName);
    
    if (Object.keys(projects).length > 0) {
      fs.writeFileSync(filePath, JSON.stringify(projects, null, 2));
      console.log(`✅ Created ${fileName} with ${Object.keys(projects).length} projects`);
    }
  }

  console.log('\nGrouping complete!');
}

groupsPerContractType().catch(console.error);