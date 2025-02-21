// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Pausable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface IERC7572 {
    function contractURI() external view returns (string memory);

    event ContractURIUpdated();
}

/// @title KamuiVerse NFT Contract
/// @notice Contract for minting NFTs with payable mint capability
contract KamuiVerse is ERC721, ERC721URIStorage, ERC721Pausable, Ownable, IERC7572 {
    using Strings for uint256;

    uint256 public nextTokenId;

    string public _contractURI;

    string public baseURI;

    string public baseExtension;

    uint256 public maxSupply;

    uint256 public mintLimit;

    uint256 public immutable startWithTokenId;

    uint256 public price;

    mapping(uint256 => uint256) private metadataId;


    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        string memory baseExtension_,
        uint256 maxSupply_,
        uint256 mintLimit_,
        uint256 startWithTokenId_,
        uint256 price_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        setBaseURI(baseURI_);
        baseExtension = baseExtension_;
        maxSupply = maxSupply_;
        mintLimit = mintLimit_;
        require(startWithTokenId_ <= 1, "Invalid startWithTokenId");
        startWithTokenId = startWithTokenId_;
        nextTokenId = startWithTokenId_;
        price = price_;
    }

    function mint(address to, uint256 amount) public payable whenNotPaused {
        require(amount > 0, "Invalid amount");
        require(
            nextTokenId + amount - startWithTokenId <= maxSupply,
            "Max supply reached"
        );

        // Check price if set
        if (price > 0) {
            require(msg.value == price * amount, "Incorrect payment amount");
        } else {
            require(msg.value == 0, "This is a free mint");
        }

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
        uint256[] calldata tokenIds,
        uint256[] calldata metadataIds 
    ) public onlyOwner whenNotPaused {
        require(
            recipients.length > 0 && tokenIds.length > 0,
            "Empty arrays not allowed"
        );
        require(
            recipients.length == tokenIds.length && recipients.length == metadataIds.length,
            "Arrays length mismatch"
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
            
            metadataId[tokenIds[i]] = metadataIds[i];
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

    //@notice Lets a contract admin set the URI for contract-level metadata.
    function setContractURI(string memory newContractURI) public onlyOwner {
        _contractURI = newContractURI;

        emit ContractURIUpdated();
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

    //@notice setPrice
    function setPrice(uint256 _price) public onlyOwner {
        price = _price;
    }

    // ---------- Getter Functions ---------- //

    //@notice tokenURI override
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        _requireOwned(tokenId);
        require(tokenId < nextTokenId, "Token ID is invalid");

        // Get metadata ID for this token
        uint256 tokenMetadataId = metadataId[tokenId];

        return bytes(baseURI).length > 0
                ? string.concat(baseURI, tokenMetadataId.toString(), baseExtension)
                : "";
    }

    //@notice contractURI 
    function contractURI() public view returns (string memory) {
        return _contractURI;
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
