import { createPublicClient, http, defineChain } from "viem";

const soneium = defineChain({
  id: 1868,
  name: "Soneium",
  network: "soneium",
  rpcUrls: {
    default: { http: ["https://rpc.soneium.org"] },
    public: { http: ["https://rpc.soneium.org"] },
  },
});

const ABI = [
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

const contracts = {
  Yoki: {
    address: "0x5f2a5818DF3216Aa6ac44632541db8F3EC4e9954",
    os: "https://opensea.io/collection/yokiorigins",
  },
  CityPopTokyo: {
    address: "0x5a445B95c9eDc0009F97b3ffCD5E6AF5c4b2a1E4",
    os: "https://opensea.io/collection/city-pop-tokyo-card",
  },
  JRKyushuFree: {
    address: "0x3BeC3DEEB05fcee24157f8a90df32A7D1a9895E6",
    os: "https://opensea.io/collection/jrjiu-zhou-nft",
  },
  CandyGirl: {
    address: "0xC6697fb54f2CB19f307DfeA3bf7dAC4F24DAa392",
    os: "https://opensea.io/collection/candy-girl-1-year-anniversary-x-astar-zkevm-nft",
  },
  JapanCreatorCollection: {
    address: "0x8a6387C00f5069e71124907F2a0F5bCBca611105",
    os: "https://opensea.io/collection/japan-creators-collection",
  },
  Walkmon: {
    address: "0x869a541D89d98e8e78C08DA4cC68AA7412C0710D",
    os: "https://opensea.io/collection/walkmon-og-1",
  },
  DenShinSanKa: {
    address: "0xeb6F8BB5E370106aa5f6E7aF6d163340F6186925",
    os: "https://opensea.io/collection/dendekaden-denshinsanka",
  },
  SNPIT: {
    address: "0x2B1aCa0C2a0cB34A309aD109F5F22956B080146C",
    os: "https://opensea.io/collection/snpit-special-commemorative-nft-badge",
  },
  DoF: {
    address: "0x9Cc2956b1E4ae3f99E874935080Deee330fD41ca",
    os: "https://opensea.io/collection/dof-og-pass",
  },
  OrigamiKokyo: {
    address: "0xE5931B44B973cbd2439f68ADC2EbF207bE7b73c6",
    os: "https://opensea.io/collection/origami-nft-by-kokyo-nft",
  },
  DenDekaDen: {
    address: "0x736c2d6e63587B16C357ddcCebdb4926D35D03cC",
    os: "https://opensea.io/collection/dendekaden-garden-yoport",
  },
  DeksaPandawa: {
    address: "0x74Aec0a265e4463306bE2073444B58a084829Fb3",
    os: "https://opensea.io/collection/pandawa-1",
  },
  HIS: {
    address: "0x99ef89F52d4566d0b6d8Fb61750Ef15175b9f2d0",
    os: "https://opensea.io/collection/godang-di-vtubertu-jian-korabonft",
  },
  JRKyushuPaid: {
    address: "0xda81413f6834041b344118887fb153B9e1b3AFbf",
    os: "https://opensea.io/collection/jrjiu-zhou-nft-1",
  },
  On1force: {
    address: "0x67001BEB3359D5fAEf44eC2480f6BB5D86f97D6C",
    os: "https://opensea.io/collection/0n1-force-0n1-doll-and-f0n1-doll-collectible",
  },
  Onigiriman: {
    address: "0x6406b4BB1338393AAe6A0C6c5c732718BA074CDE",
    os: "https://opensea.io/collection/untitled-collection-22306961",
  },
  Sashimi: {
    address: "0x922fE31A1A3fEe6C2d24525E4D1be08c41224fB7",
    os: "https://opensea.io/collection/sashimic-japan",
  },
  SkyLabs: {
    address: "0x15EF159e69F1539A943D8f167C7cCc72dE305C3e",
    os: "https://opensea.io/collection/skylabs-nft",
  },
  UZNo: {
    address: "0x8F82eAffabDAa7DeADEDb3BE97EE2d006320e67A",
    os: "https://opensea.io/collection/uzno-leonarudo-collection",
  },
  Casio: {
    address: "0x9C7D4758a8a74fdE6516c16C91F8EF2C60081caB",
    os: "https://opensea.io/collection/casio-watches-nft",
  },
  Kamui: {
    address: "0x7c14C590D4cc6BDf3Fd9CCB16576C8f111b65c6E",
    os: "https://opensea.io/collection/kamui-4",
  },
  AON: {
    address: "0xc202EB2073cC3A52c985f516D82EA725A6474202",
    os: "https://opensea.io/collection/ookaminoaon",
  },
  Mazda: {
    address: "0x26c30bD83dd15b884F895b2e1E4795430Aa5c5d8",
    os: "https://opensea.io/collection/meta-mazda",
  },
  Neemo: {
    address: "0x49EE4460128a2C79dbb858b8481cFe16B166F732",
    os: "https://opensea.io/collection/neemoloyaltybadge",
  },
  Airian: {
    address: "0x0C6faC647530a0858999c9E891eD68c00aAB7ba6",
    os: "https://opensea.io/collection/airian-avatar",
  },
};

async function readTotalSupplies() {
  const client = createPublicClient({
    chain: soneium,
    transport: http(),
  });

  const extendedContracts = {};

  for (const [name, info] of Object.entries(contracts)) {
    try {
      const totalSupply = await client.readContract({
        address: info.address,
        abi: ABI,
        functionName: "totalSupply",
      });

      extendedContracts[name] = {
        ...info,
        initialSupply: Number(totalSupply),
      };

      console.log(`${name}: ${Number(totalSupply)}`);
    } catch (error) {
      console.error(`Error reading totalSupply for ${name}:`, error);
      extendedContracts[name] = {
        ...info,
        initialSupply: null,
      };
    }
  }

  console.log("\nExtended contracts object:");
  console.log(JSON.stringify(extendedContracts, null, 2));
}

readTotalSupplies().catch(console.error);
