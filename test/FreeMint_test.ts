import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { getAddress, zeroAddress, Address } from "viem";

// Global test configuration
const TOKEN_NAME = "FreeMint";
const TOKEN_SYMBOL = "MTK";
const BASE_URI = "ipfs://example/";
const BASE_EXTENSION = ".json";
const MAX_SUPPLY = 1000n;
const MINT_LIMIT = 5n;

describe("FreeMint", function () {
  async function deployTokenFixture0() {
    const START_TOKEN_ID = 0n;

    // Get wallet clients for testing
    const [owner, nonOwner, recipient1, recipient2] = await hre.viem.getWalletClients();

    const FreeMint = await hre.viem.deployContract("FreeMint", [
      TOKEN_NAME,
      TOKEN_SYMBOL,
      BASE_URI,
      BASE_EXTENSION,
      MAX_SUPPLY,
      MINT_LIMIT,
      START_TOKEN_ID
    ]);

    return { FreeMint, owner, nonOwner, recipient1, recipient2, MINT_LIMIT, MAX_SUPPLY };
  }
  async function deployTokenFixture1() {
    const START_TOKEN_ID = 1n;

    // Get wallet clients for testing
    const [owner, nonOwner, recipient1, recipient2] = await hre.viem.getWalletClients();

    const FreeMint = await hre.viem.deployContract("FreeMint", [
      TOKEN_NAME,
      TOKEN_SYMBOL,
      BASE_URI,
      BASE_EXTENSION,
      MAX_SUPPLY,
      MINT_LIMIT,
      START_TOKEN_ID
    ]);

    return { FreeMint, owner, nonOwner, recipient1, recipient2, MINT_LIMIT, MAX_SUPPLY };
  }

  describe("Owner-only functions access control", function () {
    it("should allow owner to pause and non-owner should fail", async function () {
      const { FreeMint, owner, nonOwner } = await loadFixture(deployTokenFixture1);

      // Owner should succeed
      await expect(FreeMint.write.pause()).to.be.fulfilled;

      // Get contract instance for non-owner
      const tokenAsNonOwner = await hre.viem.getContractAt(
        "FreeMint",
        FreeMint.address,
        { client: { wallet: nonOwner } }
      );

      // Non-owner should fail
      await expect(tokenAsNonOwner.write.pause())
        .to.be.rejectedWith("OwnableUnauthorizedAccount");

      // Non-owner should fail
      await expect(tokenAsNonOwner.write.unpause())
        .to.be.rejectedWith("OwnableUnauthorizedAccount");
    });

    it("should allow owner to set URIs and non-owner should fail", async function () {
      const { FreeMint, owner, nonOwner } = await loadFixture(deployTokenFixture1);
      const NEW_URI = "new-uri";

      // Get contract instance for non-owner
      const tokenAsNonOwner = await hre.viem.getContractAt(
        "FreeMint",
        FreeMint.address,
        { client: { wallet: nonOwner } }
      );

      // Test setContractURI
      await expect(FreeMint.write.setContractURI([NEW_URI])).to.be.fulfilled;
      await expect(tokenAsNonOwner.write.setContractURI([NEW_URI]))
        .to.be.rejectedWith("OwnableUnauthorizedAccount");

      // Test setBaseURI
      await expect(FreeMint.write.setBaseURI([NEW_URI])).to.be.fulfilled;
      await expect(tokenAsNonOwner.write.setBaseURI([NEW_URI]))
        .to.be.rejectedWith("OwnableUnauthorizedAccount");

      // Test setBaseExtension
      await expect(FreeMint.write.setBaseExtension([".new"])).to.be.fulfilled;
      await expect(tokenAsNonOwner.write.setBaseExtension([".new"]))
        .to.be.rejectedWith("OwnableUnauthorizedAccount");
    });

    it("should allow owner to set limits and non-owner should fail", async function () {
      const { FreeMint, owner, nonOwner } = await loadFixture(deployTokenFixture1);

      // Get contract instance for non-owner
      const tokenAsNonOwner = await hre.viem.getContractAt(
        "FreeMint",
        FreeMint.address,
        { client: { wallet: nonOwner } }
      );

      // Test setMaxSupply
      await expect(FreeMint.write.setMaxSupply([2000n])).to.be.fulfilled;
      await expect(tokenAsNonOwner.write.setMaxSupply([2000n]))
        .to.be.rejectedWith("OwnableUnauthorizedAccount");

      // Test setMintLimit
      await expect(FreeMint.write.setMintLimit([10n])).to.be.fulfilled;
      await expect(tokenAsNonOwner.write.setMintLimit([10n]))
        .to.be.rejectedWith("OwnableUnauthorizedAccount");
    });

    it("should allow owner to withdraw and non-owner should fail", async function () {
      const { FreeMint, owner, nonOwner } = await loadFixture(deployTokenFixture1);

      // Get contract instance for non-owner
      const tokenAsNonOwner = await hre.viem.getContractAt(
        "FreeMint",
        FreeMint.address,
        { client: { wallet: nonOwner } }
      );

      await expect(FreeMint.write.withdraw()).to.be.fulfilled;
      await expect(tokenAsNonOwner.write.withdraw())
        .to.be.rejectedWith("OwnableUnauthorizedAccount");
    });

    it("should fail when non-owner tries to bulk mint", async function () {
      const { FreeMint, nonOwner, recipient1, recipient2 } = await loadFixture(deployTokenFixture1);

      const FreeMintAsNonOwner = await hre.viem.getContractAt(
        "FreeMint",
        FreeMint.address,
        { client: { wallet: nonOwner } }
      );

      await expect(FreeMintAsNonOwner.write.bulkMint([
        [recipient1.account.address, recipient2.account.address],
        [1n, 2n]
      ])).to.be.rejectedWith("OwnableUnauthorizedAccount");
    });
  });

  describe("Mint function", function () {

    it("should allow unlimited minting when mintLimit is 0", async function () {
      const { FreeMint, owner, nonOwner } = await loadFixture(deployTokenFixture1);

      // Set mintLimit to 0
      await FreeMint.write.setMintLimit([0n]);

      // Try to mint more than the original mint limit
      const largeAmount = 20n; // This is well above the default mint limit of 5

      // Should succeed because mintLimit is 0
      await expect(FreeMint.write.mint([nonOwner.account.address, largeAmount]))
        .to.be.fulfilled;

      // Verify the balance
      const balance = await FreeMint.read.balanceOf([nonOwner.account.address]);
      expect(balance).to.equal(largeAmount);
    });

    it("should correctly handle maxSupply when startWithTokenId is 0", async function () {
      const { FreeMint, recipient1, MINT_LIMIT } = await loadFixture(deployTokenFixture0);
      await FreeMint.write.setMaxSupply([MINT_LIMIT]);

      // Should be able to mint exactly maxSupply tokens
      await expect(FreeMint.write.mint([recipient1.account.address, 5n]))
        .to.be.fulfilled;

      // Should fail when trying to mint one more
      await expect(FreeMint.write.mint([recipient1.account.address, 1n]))
        .to.be.rejectedWith("Max supply reached");

      // Verify total supply
      const totalSupply = await FreeMint.read.totalSupply();
      expect(totalSupply).to.equal(5n);
    });

    it("should correctly handle maxSupply when startWithTokenId is 1", async function () {
      const { FreeMint, recipient1, MINT_LIMIT } = await loadFixture(deployTokenFixture1);
      await FreeMint.write.setMaxSupply([MINT_LIMIT]);

      const [owner, recipient] = await hre.viem.getWalletClients();

      // Should only be able to mint maxSupply tokens (IDs 1-5)
      await expect(FreeMint.write.mint([recipient1.account.address, 5n]))
        .to.be.fulfilled;

      // Should fail when trying to mint one more
      await expect(FreeMint.write.mint([recipient1.account.address, 1n]))
        .to.be.rejectedWith("Max supply reached");

      // Check total supply
      const totalSupply = await FreeMint.read.totalSupply();
      expect(totalSupply).to.equal(5n);

      // Verify token IDs
      const firstTokenOwner = await FreeMint.read.ownerOf([1n]);
      const lastTokenOwner = await FreeMint.read.ownerOf([5n]);
      expect(getAddress(firstTokenOwner)).to.equal(getAddress(recipient1.account.address));
      expect(getAddress(lastTokenOwner)).to.equal(getAddress(recipient1.account.address));

      // Verify token ID 0 doesn't exist
      await expect(FreeMint.read.ownerOf([0n]))
        .to.be.rejectedWith("ERC721NonexistentToken");

      // Verify token ID 6 doesn't exist
      await expect(FreeMint.read.ownerOf([6n]))
        .to.be.rejectedWith("ERC721NonexistentToken");
    });

    it("should fail when contract is paused", async function () {
      const { FreeMint, owner, nonOwner } = await loadFixture(deployTokenFixture1);

      await FreeMint.write.pause();
      await expect(FreeMint.write.mint([nonOwner.account.address, 1n]))
        .to.be.rejectedWith("EnforcedPause");
    });

    it("should fail when minting over mint limit", async function () {
      const { FreeMint, owner, nonOwner } = await loadFixture(deployTokenFixture1);
      const mintLimit = (await FreeMint.read.mintLimit()) as bigint;

      await expect(FreeMint.write.mint([nonOwner.account.address, mintLimit + 1n]))
        .to.be.rejectedWith("Exceeds mint limit");
    });

    it("should fail when minting would exceed max supply", async function () {
      const { FreeMint, owner, nonOwner } = await loadFixture(deployTokenFixture1);
      const maxSupply = (await FreeMint.read.maxSupply()) as bigint;

      await expect(FreeMint.write.mint([nonOwner.account.address, maxSupply + 1n]))
        .to.be.rejectedWith("Max supply reached");
    });

    it("should fail when minting to zero address", async function () {
      const { FreeMint, owner } = await loadFixture(deployTokenFixture1);

      await expect(FreeMint.write.mint([zeroAddress, 1n]))
        .to.be.rejectedWith(`ERC721InvalidOwner("${zeroAddress}")`);
    });


    it("should fail when minting zero tokens", async function () {
      const { FreeMint, owner, nonOwner } = await loadFixture(deployTokenFixture1);

      await expect(FreeMint.write.mint([nonOwner.account.address, 0n]))
        .to.be.rejectedWith("Invalid amount");
    });

    it("should succeed when nonowner mints one token", async function () {
      const { FreeMint, owner, nonOwner } = await loadFixture(deployTokenFixture1);

      const tokenAsNonOwner = await hre.viem.getContractAt(
        "FreeMint",
        FreeMint.address,
        { client: { wallet: nonOwner } }
      );

      await expect(tokenAsNonOwner.write.mint([nonOwner.account.address, 1n]))
        .to.be.fulfilled;

      const balance = await FreeMint.read.balanceOf([nonOwner.account.address]);
      expect(balance).to.equal(1n);
    });

    it("should succeed when minting mint limit amount", async function () {
      const { FreeMint, owner, nonOwner, MINT_LIMIT } = await loadFixture(deployTokenFixture1);

      await expect(FreeMint.write.mint([nonOwner.account.address, MINT_LIMIT]))
        .to.be.fulfilled;

      const balance = await FreeMint.read.balanceOf([nonOwner.account.address]);
      expect(balance).to.equal(MINT_LIMIT);
    });

    it("should set correct initial state when deployed with startWithTokenId=1", async function () {
      const { FreeMint } = await loadFixture(deployTokenFixture1);

      // Get first token ID 0 before any minting
      await expect(FreeMint.read.ownerOf([0n]))
        .to.be.rejectedWith("ERC721NonexistentToken");

      // Get first token ID 1 before any minting
      await expect(FreeMint.read.ownerOf([1n]))
        .to.be.rejectedWith("ERC721NonexistentToken");

      // Verify starting point
      const totalSupply = await FreeMint.read.totalSupply();
      expect(totalSupply).to.equal(0n);
    });
  });

  describe("Bulk mint function", function () {
    it("should allow owner to bulk mint tokens", async function () {
      const { FreeMint, owner, recipient1, recipient2 } = await loadFixture(deployTokenFixture1);
      const recipients = [recipient1.account.address, recipient2.account.address];
      const tokenIds = [1n, 2n];

      await expect(FreeMint.write.bulkMint([recipients, tokenIds]))
        .to.be.fulfilled;

      // Verify token ownership
      const owner1 = await FreeMint.read.ownerOf([1n]);
      const owner2 = await FreeMint.read.ownerOf([2n]);

      expect(getAddress(owner1)).to.equal(getAddress(recipient1.account.address));
      expect(getAddress(owner2)).to.equal(getAddress(recipient2.account.address));

      expect(await FreeMint.read.totalSupply()).to.equal(2n);

      // Verify non-minted token doesn't exist
      await expect(FreeMint.read.ownerOf([3n]))
        .to.be.rejectedWith("ERC721NonexistentToken");
    });

    it("should allow owner to bulk mint tokens, start with 0", async function () {
      const { FreeMint, owner, recipient1, recipient2 } = await loadFixture(deployTokenFixture0);
      const recipients = [recipient1.account.address, recipient2.account.address];
      const tokenIds = [0n, 1n];

      await expect(FreeMint.write.bulkMint([recipients, tokenIds]))
        .to.be.fulfilled;

      // Verify token ownership
      const owner1 = await FreeMint.read.ownerOf([0n]);
      const owner2 = await FreeMint.read.ownerOf([1n]);

      expect(getAddress(owner1)).to.equal(getAddress(recipient1.account.address));
      expect(getAddress(owner2)).to.equal(getAddress(recipient2.account.address));

      expect(await FreeMint.read.totalSupply()).to.equal(2n);

      // Verify non-minted token doesn't exist
      await expect(FreeMint.read.ownerOf([2n]))
        .to.be.rejectedWith("ERC721NonexistentToken");
    });

    describe("Input Validation", function () {
      it("should fail when arrays are empty", async function () {
        const { FreeMint } = await loadFixture(deployTokenFixture1);

        await expect(FreeMint.write.bulkMint([
          [], // empty recipients array
          []  // empty tokenIds array
        ])).to.be.rejectedWith("Empty arrays not allowed");
      });

      it("should fail when arrays length mismatch", async function () {
        const { FreeMint, recipient1 } = await loadFixture(deployTokenFixture1);

        await expect(FreeMint.write.bulkMint([
          [recipient1.account.address],
          [1n, 2n]
        ])).to.be.rejectedWith("Recipients and tokenIds length mismatch");
      });

      it("should fail when minting to zero address", async function () {
        const { FreeMint, recipient1 } = await loadFixture(deployTokenFixture1);

        await expect(FreeMint.write.bulkMint([
          [zeroAddress, recipient1.account.address],
          [1n, 2n]
        ])).to.be.rejectedWith("ERC721InvalidReceiver");
      });
    });

    describe("Supply Limits", function () {
      it("should enforce max supply limit in bulkMint", async function () {
        const { FreeMint, recipient1, recipient2 } = await loadFixture(deployTokenFixture1);

        // Set a small maxSupply for testing
        await FreeMint.write.setMaxSupply([3n]);

        // First mint should succeed (2 tokens)
        await expect(FreeMint.write.bulkMint([
          [recipient1.account.address, recipient2.account.address],
          [1n, 2n]
        ])).to.be.fulfilled;

        // Second mint should fail as it would exceed maxSupply
        await expect(FreeMint.write.bulkMint([
          [recipient1.account.address, recipient2.account.address],
          [3n, 4n]
        ])).to.be.rejectedWith("Max supply reached");

        // Verify total supply
        const totalSupply = await FreeMint.read.totalSupply();
        expect(totalSupply).to.equal(2n);

        // Verify only first batch was minted
        const owner1 = await FreeMint.read.ownerOf([1n]);
        const owner2 = await FreeMint.read.ownerOf([2n]);
        expect(getAddress(owner1)).to.equal(getAddress(recipient1.account.address));
        expect(getAddress(owner2)).to.equal(getAddress(recipient2.account.address));

        // Verify tokens from failed mint don't exist
        await expect(FreeMint.read.ownerOf([3n]))
          .to.be.rejectedWith("ERC721NonexistentToken");
        await expect(FreeMint.read.ownerOf([4n]))
          .to.be.rejectedWith("ERC721NonexistentToken");
      });

      it("should fail when next token ID would exceed maxSupply", async function () {
        const { FreeMint, recipient1, MINT_LIMIT } = await loadFixture(deployTokenFixture1);
        await FreeMint.write.setMaxSupply([5n]);

        // First mint takes up some IDs
        await FreeMint.write.bulkMint([
          [recipient1.account.address, recipient1.account.address],
          [1n, 2n]
        ]);

        // This should fail as it would exceed maxSupply
        await expect(FreeMint.write.bulkMint([
          [recipient1.account.address, recipient1.account.address, recipient1.account.address],
          [3n, 4n, 6n]
        ])).to.be.rejectedWith("Token ID exceeds maxSupply");
      });

      it("should successfully mint specific token IDs", async function () {
        const { FreeMint, recipient1 } = await loadFixture(deployTokenFixture1);

        // Mint specific token IDs
        await expect(FreeMint.write.bulkMint([
          [recipient1.account.address, recipient1.account.address],
          [1n, 5n] // Mint tokens #1 and #5
        ])).to.be.fulfilled;

        // Verify the tokens were minted correctly
        const owner1 = await FreeMint.read.ownerOf([1n]);
        const owner5 = await FreeMint.read.ownerOf([5n]);
        expect(getAddress(owner1)).to.equal(getAddress(recipient1.account.address));
        expect(getAddress(owner5)).to.equal(getAddress(recipient1.account.address));

        // Verify tokens in between weren't minted
        await expect(FreeMint.read.ownerOf([2n]))
          .to.be.rejectedWith("ERC721NonexistentToken");
        await expect(FreeMint.read.ownerOf([3n]))
          .to.be.rejectedWith("ERC721NonexistentToken");
        await expect(FreeMint.read.ownerOf([4n]))
          .to.be.rejectedWith("ERC721NonexistentToken");

        await expect(FreeMint.write.bulkMint([
          [recipient1.account.address, recipient1.account.address],
          [2n, 4n] // Mint tokens #2 and #4
        ])).to.be.fulfilled;
        // Verify total supply
        const totalSupply = await FreeMint.read.totalSupply();
        expect(totalSupply).to.equal(4n);
      });

      it("should correctly handle maxSupply when startWithTokenId is 0", async function () {
        const { FreeMint, recipient1, MINT_LIMIT } = await loadFixture(deployTokenFixture0);

        // Verify starting point
        const initialSupply = await FreeMint.read.totalSupply();
        expect(initialSupply).to.equal(0n);

        // Should be able to mint tokens up to maxSupply
        await FreeMint.write.setMaxSupply([3n]);
        await expect(FreeMint.write.bulkMint([
          [recipient1.account.address, recipient1.account.address, recipient1.account.address],
          [0n, 1n, 2n]
        ])).to.be.fulfilled;

        // Should fail when trying to mint token that would exceed maxSupply
        await expect(FreeMint.write.bulkMint([
          [recipient1.account.address],
          [3n]
        ])).to.be.rejectedWith("Max supply reached");

        // Verify total supply
        const totalSupply = await FreeMint.read.totalSupply();
        expect(totalSupply).to.equal(3n);

        // Verify token ownership
        const owner0 = await FreeMint.read.ownerOf([0n]);
        expect(getAddress(owner0)).to.equal(getAddress(recipient1.account.address));
      });
    });

    // describe("Pausable Behavior", function () {
    //   it("should bulk mint when contract is paused", async function () {
    //     const { FreeMint, recipient1, recipient2 } = await loadFixture(deployTokenFixture1);

    //     // First pause the contract
    //     await FreeMint.write.pause();

    //     // Attempt to bulk mint should fail
    //     await expect(FreeMint.write.bulkMint([
    //       [recipient1.account.address, recipient2.account.address],
    //       [1n, 2n]
    //     ])).to.be.fulfilled;

    //     // Verify total supply didn't change
    //     const totalSupply = await FreeMint.read.totalSupply();
    //     expect(totalSupply).to.equal(2n);
    //   });
    // });
  });

  describe("TokenURI function", function () {
    it("should fail for non-existent token", async function () {
      const { FreeMint, recipient1 } = await loadFixture(deployTokenFixture1);

      // Mint token ID 1
      await FreeMint.write.mint([recipient1.account.address, 1n]);
      const uri = await FreeMint.read.tokenURI([1n]);
      expect(uri).to.equal("ipfs://example/1.json");

      // Try to get URI for token 0 (should not exist)
      await expect(FreeMint.read.tokenURI([0n]))
        .to.be.rejectedWith("ERC721NonexistentToken");

      // Try to get URI for token 2 (should not exist)
      await expect(FreeMint.read.tokenURI([2n]))
        .to.be.rejectedWith("ERC721NonexistentToken");
    });

    it("should return correct URI for ten minted tokens", async function () {
      const { FreeMint, recipient1 } = await loadFixture(deployTokenFixture1);
      await FreeMint.write.setMintLimit([10n]);

      // Mint 10 tokens
      await FreeMint.write.mint([recipient1.account.address, 10n]);

      // Get and verify URIs for all tokens
      for (let i = 1; i <= 10; i++) {
        const uri = await FreeMint.read.tokenURI([BigInt(i)]);
        expect(uri).to.equal(`ipfs://example/${i}.json`);
      }
    });

    it("should return correct tokenURI when starting from 0", async function () {
      const { FreeMint, recipient1 } = await loadFixture(deployTokenFixture0);

      // Mint token with ID 0
      await FreeMint.write.mint([recipient1.account.address, 1n]);

      const uri = await FreeMint.read.tokenURI([0n]);
      expect(uri).to.equal("ipfs://example/0.json");
    });
  });
});