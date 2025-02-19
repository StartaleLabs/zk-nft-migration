# Instructions for projects

## Ownership transfer
To claim contract ownership, you must verify control of the account that will serve as the contract owner. Please complete the following authentication steps:
1. Ensure your account has sufficient ETH on Minato. If needed, transfer ETH from Sepolia using any [faucet](https://docs.soneium.org/docs/builders/tools/faucets).
2. From your designated owner account, send a small amount of ETH to the Minato verification address: `0x911d82b108804A18022d0A2621B2Fc608DEF6FCA` 
3. Provide the Minato transaction hash to Tatsu to complete the ownership transfer.


## Marketplace registration
If you want to register your project to NFT marketplace, you will likely need more images for collection profile and banner image.

You will also need ownership over the contract.

Some markeplaces will use contract call `contractURI()` to display collection information. You can find how to set this in OpenSea documentation for [contract level metadata](https://docs.opensea.io/docs/contract-level-metadata). To set this, you will need to call `setContractURI(string memory _uri)` function in the contract and you need to use contract owner address for this.

Here is a list of marketplaces that you can register your project to:
- [OpenSea](https://opensea.io/)
- [Sonova](https://sonova.one/soneium/collections)
- [Posse](https://posse.market/home)
- [fractalvisions.io](https://fractalvisions.io/)

## Continue minting
If your collection is not minted out, you can continue minting but first you will need to call unpause() function in the contract. This function can be called by the owner of the contract. 

If your contract is payable, you can also change the price of minting by calling setPrice(uint256 _price) function in the contract.

## Other configurable contract parameters
* mintLimit - limits number of tokens that can be minted per wallet
* maxSupply - limits total number of tokens that can be minted
* baseURI - base URI for token metadata
* contractURI - URI for contract metadata
* price - price for minting (if contract is payable)
* paused - pause minting