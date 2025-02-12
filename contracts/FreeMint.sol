// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Pausable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title FreeMint NFT Contract
/// @notice Contract for minting NFTs with free mint capability
contract FreeMint is ERC721, ERC721URIStorage, ERC721Pausable, Ownable {
    using Strings for uint256;

    uint256 private _nextTokenId;

    string public baseContractURI;

    string public baseURI;

    string public baseExtension;

    uint256 public maxSupply;

    uint256 public mintLimit;

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _baseURI,
        string memory _baseExtension,
        uint256 _maxSupply,
        uint256 _mintLimit,
        uint256 _startWithTokenId
    ) ERC721(_name, _symbol) Ownable(msg.sender) {
        setBaseURI(_baseURI);
        baseExtension = _baseExtension;
        maxSupply = _maxSupply;
        mintLimit = _mintLimit;
        require (_startWithTokenId <= 1, "Invalid startWithTokenId");
        _nextTokenId = _startWithTokenId;
    }

    function mint(address to, uint256 amount) public whenNotPaused {
        require(amount > 0, "Invalid amount");
        require(_nextTokenId + amount < maxSupply, "Max supply reached");
        // Allow unlimited minting if mintLimit is 0
        if (mintLimit != 0) {
            require(balanceOf(to) + amount <= mintLimit, "Exceeds mint limit");
        }
        for (uint256 i = 0; i < amount; i++) {
            _safeMint(to, _nextTokenId++);
        }
    }

    //@notice bulk mint function for owner
    function bulkMint(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) public onlyOwner whenNotPaused {
        require(
            recipients.length == amounts.length,
            "Recipients and amounts length mismatch"
        );

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] > 0, "Invalid amount");
            totalAmount += amounts[i];
        }

        require(
            _nextTokenId + totalAmount <= maxSupply,
            "Max supply reached"
        );

        for (uint256 i = 0; i < recipients.length; i++) {
            // Allow unlimited minting if mintLimit is 0
            if (mintLimit != 0) {
                require(
                    balanceOf(recipients[i]) + amounts[i] <= mintLimit,
                    "Exceeds mint limit"
                );
            }
            for (uint256 j = 0; j < amounts[i]; j++) {
                _safeMint(recipients[i], _nextTokenId++);
            }
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
    function setContractURI(
        string memory _newBaseContractURI
    ) public onlyOwner {
        baseContractURI = _newBaseContractURI;
    }

    //@notice to tokenUri
    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
    }

    //@notice to tokenUri
    function setBaseExtension(
        string memory _newBaseExtension
    ) public onlyOwner {
        baseExtension = _newBaseExtension;
    }

    //@notice maxSupply
    function setMaxSupply(uint256 _newMaxSupply) public onlyOwner {
        maxSupply = _newMaxSupply;
    }

    //@notice mintLimit
    function setMintLimit(uint256 _newMintLimit) public onlyOwner {
        mintLimit = _newMintLimit;
    }

    //@notice totalSupply
    function totalSupply() public view returns (uint256) {
        return _nextTokenId;
    }

    // ---------- Getter Functions ---------- //


    //@notice tokenURI override
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        _requireOwned(tokenId);
        require(tokenId < _nextTokenId, "Token ID is invalid");

        // Check if the last character in baseURI is a slash.
        // if there is no slash, use baseURI without token ID
        if (bytes(baseURI)[bytes(baseURI).length - 1] != bytes("/")[0]) {
            return baseURI;
        }

        return
            bytes(baseURI).length > 0
                ? string(
                    abi.encodePacked(
                        baseURI,
                        (tokenId % 5 == 0 ? 5 : tokenId % 5).toString(),
                        baseExtension
                    )
                )
                : "";
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
        payable(owner()).transfer(address(this).balance);
    }
}
