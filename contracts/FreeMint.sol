// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Pausable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title FreeMint NFT Contract
/// @notice Contract for minting NFTs with free mint capability
contract FreeMint is ERC721, ERC721URIStorage, ERC721Pausable, Ownable {
    using Strings for uint256;

    uint256 public nextTokenId;

    string public baseContractURI;

    string public baseURI;

    string public baseExtension;

    uint256 public maxSupply;

    uint256 public mintLimit;

    uint256 public immutable startWithTokenId;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        string memory baseExtension_,
        uint256 maxSupply_,
        uint256 mintLimit_,
        uint256 startWithTokenId_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        setBaseURI(baseURI_);
        baseExtension = baseExtension_;
        maxSupply = maxSupply_;
        mintLimit = mintLimit_;
        require(startWithTokenId_ <= 1, "Invalid startWithTokenId");
        startWithTokenId = startWithTokenId_;
        nextTokenId = startWithTokenId_;
    }

    function mint(address to, uint256 amount) public whenNotPaused {
        require(amount > 0, "Invalid amount");
        require(
            nextTokenId + amount - startWithTokenId <= maxSupply,
            "Max supply reached"
        );

        // Allow unlimited minting if mintLimit is 0
        if (mintLimit != 0) {
            require(balanceOf(to) + amount <= mintLimit, "Exceeds mint limit");
        }

        // Store start token ID to avoid CostlyOperationsInLoop
        uint256 startId = nextTokenId;
        
        // Update state once before loop
        nextTokenId += amount;

        // Use local variable in loop
        for (uint256 i = 0; i < amount; i++) {
            _safeMint(to, startId + i);
        }
    }

    //@notice bulk mint function for owner
    function bulkMint(
        address[] calldata recipients,
        uint256[] calldata tokenIds
    ) public onlyOwner whenNotPaused {
        require(
            recipients.length > 0 && tokenIds.length > 0,
            "Empty arrays not allowed"
        );
        require(
            recipients.length == tokenIds.length,
            "Recipients and tokenIds length mismatch"
        );
        require(
            nextTokenId + tokenIds.length - startWithTokenId <= maxSupply,
            "Max supply reached"
        );

        // Update state before external interactions
        nextTokenId += tokenIds.length;

        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(tokenIds[i] <= maxSupply, "Token ID exceeds maxSupply");
            
            _safeMint(recipients[i], tokenIds[i]);
        }
    }

    // ---- The following functions are overrides required by Solidity. ---- //

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Pausable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    // ---------- Setter Functions ---------- //

    //@notice to contractUri
    function setContractURI(string memory contractURI) public onlyOwner {
        baseContractURI = contractURI;
    }

    //@notice to tokenUri
    function setBaseURI(string memory newBaseURI) public onlyOwner {
        baseURI = newBaseURI;
    }

    //@notice to tokenUri
    function setBaseExtension(string memory newBaseExtension) public onlyOwner {
        baseExtension = newBaseExtension;
    }

    //@notice maxSupply
    function setMaxSupply(uint256 newMaxSupply) public onlyOwner {
        maxSupply = newMaxSupply;
    }

    //@notice mintLimit
    function setMintLimit(uint256 newMintLimit) public onlyOwner {
        mintLimit = newMintLimit;
    }

    //@notice totalSupply
    function totalSupply() public view returns (uint256) {
        return nextTokenId - startWithTokenId;
    }

    // ---------- Getter Functions ---------- //

    //@notice tokenURI override
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        _requireOwned(tokenId);
        require(tokenId < nextTokenId, "Token ID is invalid");

        // Check if the last character in baseURI is a slash.
        // if there is no slash, use baseURI without token ID
        if (bytes(baseURI)[bytes(baseURI).length - 1] != bytes("/")[0]) {
            return baseURI;
        }

        return bytes(baseURI).length > 0
                ? string.concat(baseURI, tokenId.toString(), baseExtension) : "";
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    //@notice withdraw function
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Transfer failed");
    }

    // Add receive function to accept ETH
    receive() external payable {}

    // Add fallback function as a backup
    fallback() external payable {}
}
