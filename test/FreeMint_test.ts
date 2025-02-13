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
  async function deployTokenFixture0 () {
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
  async function deployTokenFixture1 () {
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

    it("should allow owner to bulk mint tokens", async function () {
      const { FreeMint, owner, recipient1, recipient2 } = await loadFixture(deployTokenFixture1);

      await expect(FreeMint.write.bulkMint([
        [recipient1.account.address, recipient2.account.address],
        [1n, 2n]
      ])).to.be.fulfilled;
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

    it("should start minting from startWithTokenId value", async function () {
      const { FreeMint, owner, recipient1 } = await loadFixture(deployTokenFixture1);

      // Mint first token
      await FreeMint.write.mint([recipient1.account.address, 1n]);

      // Check first token ID
      const tokenOwner = (await FreeMint.read.ownerOf([1n])) as Address;
      expect(getAddress(tokenOwner)).to.equal(getAddress(recipient1.account.address));

      // Verify token ID 0 doesn't exist
      await expect(FreeMint.read.ownerOf([0n]))
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

    it("should succeed when minting one token", async function () {
      const { FreeMint, owner, nonOwner } = await loadFixture(deployTokenFixture1);

      await expect(FreeMint.write.mint([nonOwner.account.address, 1n]))
        .to.be.fulfilled;

      const balance = await FreeMint.read.balanceOf([nonOwner.account.address]);
      expect(balance).to.equal(1n);
    });

    it("should succeed when minting mint limit amount", async function () {
      const { FreeMint, owner, nonOwner } = await loadFixture(deployTokenFixture1);
      const mintLimit = await FreeMint.read.mintLimit();

      await expect(FreeMint.write.mint([nonOwner.account.address, mintLimit]))
        .to.be.fulfilled;

      const balance = await FreeMint.read.balanceOf([nonOwner.account.address]);
      expect(balance).to.equal(mintLimit);
    });

    it("should fail when minting zero tokens", async function () {
      const { FreeMint, owner, nonOwner } = await loadFixture(deployTokenFixture1);

      await expect(FreeMint.write.mint([nonOwner.account.address, 0n]))
        .to.be.rejectedWith("Invalid amount");
    });
  });

  describe("Bulk mint function", function () {
    it("should allow owner to bulk mint tokens", async function () {
      const { FreeMint, owner, nonOwner } = await loadFixture(deployTokenFixture1);
      const recipients = [nonOwner.account.address, owner.account.address];
      const amounts = [2n, 3n];

      await expect(FreeMint.write.bulkMint([recipients, amounts]))
        .to.be.fulfilled;

      const balance1 = await FreeMint.read.balanceOf([recipients[0]]);
      const balance2 = await FreeMint.read.balanceOf([recipients[1]]);
      expect(balance1).to.equal(2n);
      expect(balance2).to.equal(3n);
    });

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

    it("should fail when arrays length mismatch", async function () {
      const { FreeMint, owner, nonOwner } = await loadFixture(deployTokenFixture1);
      const recipients = [nonOwner.account.address];
      const amounts = [2n, 3n];

      await expect(FreeMint.write.bulkMint([recipients, amounts]))
        .to.be.rejectedWith("Recipients and amounts length mismatch");
    });

    it("should fail when arrays are empty", async function () {
      const { FreeMint } = await loadFixture(deployTokenFixture1);

      await expect(FreeMint.write.bulkMint([
        [], // empty recipients array
        []  // empty amounts array
      ])).to.be.rejectedWith("Empty arrays not allowed");
    });

    describe("Input Validation", function () {
      it("should fail when arrays length mismatch", async function () {
        const { FreeMint, recipient1 } = await loadFixture(deployTokenFixture1);

        await expect(FreeMint.write.bulkMint([
          [recipient1.account.address],
          [1n, 2n]
        ])).to.be.rejectedWith("Recipients and amounts length mismatch");
      });

      it("should fail when any amount is zero", async function () {
        const { FreeMint, recipient1, recipient2 } = await loadFixture(deployTokenFixture1);

        await expect(FreeMint.write.bulkMint([
          [recipient1.account.address, recipient2.account.address],
          [1n, 0n]
        ])).to.be.rejectedWith("Invalid amount");
      });

      it("should fail when minting to zero address", async function () {
        const { FreeMint, recipient1 } = await loadFixture(deployTokenFixture1);

        await expect(FreeMint.write.bulkMint([
          [zeroAddress, recipient1.account.address],
          [1n, 1n]
        ])).to.be.rejectedWith("ERC721InvalidReceiver");
      });
    });

    describe("Supply Limits", function () {
      it("should fail when total amount exceeds max supply", async function () {
        const { FreeMint, recipient1, recipient2, MAX_SUPPLY } = await loadFixture(deployTokenFixture1);

        await expect(FreeMint.write.bulkMint([
          [recipient1.account.address, recipient2.account.address],
          [MAX_SUPPLY, 1n]
        ])).to.be.rejectedWith("Max supply reached");
      });

      it("should pass for owner when amount exceeds recipient's mint limit", async function () {
        const { FreeMint, recipient1, MINT_LIMIT } = await loadFixture(deployTokenFixture1);

        await expect(FreeMint.write.bulkMint([
          [recipient1.account.address], [MINT_LIMIT + 1n] // Try to mint more than original limit
        ])).to.be.fulfilled;

        // Verify the balance
        const balance = await FreeMint.read.balanceOf([recipient1.account.address]);
        expect(balance).to.equal(MINT_LIMIT + 1n);
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

    });

    describe("Successful Minting", function () {
      it("should correctly mint multiple tokens to multiple addresses", async function () {
        const { FreeMint, recipient1, recipient2 } = await loadFixture(deployTokenFixture1);

        await FreeMint.write.bulkMint([
          [recipient1.account.address, recipient2.account.address],
          [2n, 3n]
        ]);

        const balance1 = await FreeMint.read.balanceOf([recipient1.account.address]);
        const balance2 = await FreeMint.read.balanceOf([recipient2.account.address]);

        expect(balance1).to.equal(2n);
        expect(balance2).to.equal(3n);
      });

      it("should increment token IDs correctly", async function () {
        const { FreeMint, recipient1 } = await loadFixture(deployTokenFixture1);

        await FreeMint.write.bulkMint([
          [recipient1.account.address],
          [2n]
        ]);

        const owner1 = await FreeMint.read.ownerOf([1n])
        const owner2 = await FreeMint.read.ownerOf([2n])

        // Use getAddress to normalize address case
        expect(getAddress(owner1)).to.equal(getAddress(recipient1.account.address));
        expect(getAddress(owner2)).to.equal(getAddress(recipient1.account.address));
      });

      it("should update total supply correctly", async function () {
        const { FreeMint, recipient1, recipient2 } = await loadFixture(deployTokenFixture1);

        // Get initial supply
        const initialSupply = await FreeMint.read.totalSupply() as bigint;

        await FreeMint.write.bulkMint([
          [recipient1.account.address, recipient2.account.address],
          [2n, 3n]
        ]);

        // Check that supply increased by exactly 5
        const finalSupply = (await FreeMint.read.totalSupply()) as bigint;
        expect(finalSupply - initialSupply).to.equal(5n);
      });
    });

    describe("Pausable Behavior", function () {
      it("should fail when contract is paused", async function () {
        const { FreeMint, recipient1, recipient2 } = await loadFixture(deployTokenFixture1);

        await FreeMint.write.pause();

        await expect(FreeMint.write.bulkMint([
          [recipient1.account.address, recipient2.account.address],
          [1n, 2n]
        ])).to.be.rejectedWith("EnforcedPause");
      });
    });
  });

  describe("TokenURI function", function () {
    it("should fail for non-existent token", async function () {
      const { FreeMint, recipient1 } = await loadFixture(deployTokenFixture1);

      // Mint token ID 1
      await FreeMint.write.mint([recipient1.account.address, 1n]);

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

    it("should fail for unminted token ID", async function () {
      const { FreeMint, recipient1 } = await loadFixture(deployTokenFixture1);

      // Try to get URI for unminted token 1
      await expect(FreeMint.read.tokenURI([1n]))
        .to.be.rejectedWith("ERC721NonexistentToken");
    });
  });
});