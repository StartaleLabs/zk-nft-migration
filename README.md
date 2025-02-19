# Set of Solidity smart contracts to be used for NFT migration

[![Smart Contract Tests](https://github.com/StartaleLabs/zk-nft-migration/actions/workflows/test.yml/badge.svg)](https://github.com/StartaleLabs/zk-nft-migration/actions/workflows/test.yml)


NFT contract with free mint capability and configurable token ID starting point.

## Features

- Free minting
- Configurable start token ID (0 or 1)
- Bulk minting capability
- Pausable
- Owner-only functions
- Customizable URI structure

## Testing

```bash
# Install dependencies
npm install

# Run tests
npx hardhat test
