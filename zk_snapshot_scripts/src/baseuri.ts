import { createPublicClient, http, Address } from 'viem'
import { astarZkEVM } from 'viem/chains'
import fs from 'fs'
import path from 'path'

interface InputProject {
    address: string;
}

interface OutputProject extends InputProject {
    logoUrl: string;
}

interface InputConfig {
    [key: string]: InputProject;
}

interface OutputConfig {
    [key: string]: OutputProject;
}

const abi = [{
    name: 'baseURI',
    inputs: [],
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function'
}] as const

const client = createPublicClient({
    chain: astarZkEVM,
    transport: http()
})

const inputJson = path.join(__dirname, './data/zk_input.json')
const outputJson = path.join(__dirname, './data/zk_output_with_uri.json')

async function fetchBaseUris() {
    console.log('Starting baseURI fetching process...')
    
    // Read and parse input JSON
    const projects = JSON.parse(fs.readFileSync(inputJson, 'utf-8')) as InputConfig
    const outputProjects: OutputConfig = {}
    
    for (const [name, project] of Object.entries(projects)) {
        try {
            console.log(`Fetching baseURI for ${name}...`)
            const uri = await client.readContract({
                address: project.address as Address,
                abi,
                functionName: 'baseURI'
            })
            
            outputProjects[name] = {
                ...project,
                logoUrl: uri as string
            }
            
            console.log(`Got URI for ${name}: ${uri}`)
        } catch (error) {
            console.error(`Error fetching baseURI for ${name}:`, error)
            outputProjects[name] = {
                ...project,
                logoUrl: '' // Empty string for failed attempts
            }
        }
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Write output JSON
    fs.writeFileSync(
        outputJson, 
        JSON.stringify(outputProjects, null, 2)
    )
    console.log(`Updated JSON written to ${outputJson}`)
}

fetchBaseUris().catch(console.error)