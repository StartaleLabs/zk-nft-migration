rm -fr ignition/deployments
npx hardhat clean
npx hardhat compile
npx hardhat run scripts/nextProjectInfo.ts
npx hardhat ignition deploy ./ignition/modules/FreeMint.ts --network soneium --verify
npx hardhat ignition verify chain-1868 --include-unrelated-contracts
== add address to `scripts/<Network>Contracts.json`
npx hardhat run scripts/mint-721.ts
npx hardhat run scripts/verify.ts
npx hardhat run scripts/arePaused.ts