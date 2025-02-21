import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { getAddress, zeroAddress, parseEther } from "viem";

// Global test configuration
const TOKEN_NAME = "CasioWatches";
const TOKEN_SYMBOL = "CASIO";
const BASE_URI = "ipfs://example/";
const BASE_EXTENSION = ".json";
const MAX_SUPPLY = 1000n;
const MINT_LIMIT = 8n;
const PRICE = parseEther("0.1"); // 0.1 ETH
const START_TOKEN_ID = 0n;

describe("CasioWatches", function () {
  async function deployTokenFixture() {

    // Get wallet clients for testing
    const [owner, nonOwner, recipient1, recipient2] = await hre.viem.getWalletClients();

    const CasioWatches = await hre.viem.deployContract("CasioWatches", [
      TOKEN_NAME,
      TOKEN_SYMBOL,
      BASE_URI,
      BASE_EXTENSION,
      MAX_SUPPLY,
      MINT_LIMIT,
      START_TOKEN_ID,
      PRICE
    ]);

    return { CasioWatches, owner, nonOwner, recipient1, recipient2, PRICE };
  }

  describe("Mint function with payment", function () {
    it("should fail when payment amount is incorrect", async function () {
      const { CasioWatches, recipient1, PRICE } = await loadFixture(deployTokenFixture);

      // Try to mint with incorrect payment
      await expect(CasioWatches.write.mint(
        [recipient1.account.address, 2n],
        { value: PRICE } // Only paying for 1 token
      )).to.be.rejectedWith("Incorrect payment amount");
    });

    it("should succeed with correct payment amount", async function () {
      const { CasioWatches, recipient1, PRICE } = await loadFixture(deployTokenFixture);

      // Mint with correct payment
      await expect(CasioWatches.write.mint(
        [recipient1.account.address, 2n],
        { value: PRICE * 2n }
      )).to.be.fulfilled;

      // Verify balance
      const balance = await CasioWatches.read.balanceOf([recipient1.account.address]);
      expect(balance).to.equal(2n);
    });

    it("should accumulate payments in contract", async function () {
      const { CasioWatches, recipient1, PRICE } = await loadFixture(deployTokenFixture);
      const publicClient = await hre.viem.getPublicClient();

      // Get initial contract balance
      const initialBalance = await publicClient.getBalance({
        address: CasioWatches.address
      });

      // Mint tokens
      await CasioWatches.write.mint(
        [recipient1.account.address, 2n],
        { value: PRICE * 2n }
      );

      // Verify contract balance increased
      const finalBalance = await publicClient.getBalance({
        address: CasioWatches.address
      });
      expect(finalBalance - initialBalance).to.equal(PRICE * 2n);
    });
  });

  describe("BulkMint function (owner only, no payment)", function () {
    it("should allow owner to bulk mint without payment", async function () {
      const { CasioWatches, owner, recipient1, recipient2 } = await loadFixture(deployTokenFixture);

      await expect(CasioWatches.write.bulkMint([
        [recipient1.account.address, recipient2.account.address],
        [1n, 2n]
      ])).to.be.fulfilled;

      // Verify balances
      expect(await CasioWatches.read.balanceOf([recipient1.account.address])).to.equal(1n);
      expect(await CasioWatches.read.balanceOf([recipient2.account.address])).to.equal(1n);
    });

    it("should fail when non-owner tries to bulk mint", async function () {
      const { CasioWatches, nonOwner, recipient1, recipient2 } = await loadFixture(deployTokenFixture);

      const PaidMintAsNonOwner = await hre.viem.getContractAt(
        "CasioWatches",
        CasioWatches.address,
        { client: { wallet: nonOwner } }
      );

      await expect(PaidMintAsNonOwner.write.bulkMint([
        [recipient1.account.address, recipient2.account.address],
        [1n, 2n]
      ])).to.be.rejectedWith("OwnableUnauthorizedAccount");
    });
  });

  describe("Withdraw function", function () {
    it("should allow owner to withdraw accumulated payments", async function () {
      const { CasioWatches, owner, recipient1, PRICE } = await loadFixture(deployTokenFixture);
      const publicClient = await hre.viem.getPublicClient();

      // Mint some tokens to accumulate payments
      await CasioWatches.write.mint(
        [recipient1.account.address, 2n],
        { value: PRICE * 2n }
      );

      // Get owner's balance before withdrawal
      const ownerBalanceBefore = await publicClient.getBalance({
        address: owner.account.address
      });

      // Withdraw funds
      await CasioWatches.write.withdraw();

      // Verify contract balance is 0
      expect(await publicClient.getBalance({
        address: CasioWatches.address
      })).to.equal(0n);

      // Verify owner received the funds (approximately, considering gas costs)
      const ownerBalanceAfter = await publicClient.getBalance({
        address: owner.account.address
      });
      expect(ownerBalanceAfter > ownerBalanceBefore).to.be.true;
    });
  });

  describe("mint over max limit", function () {
    it("should fail if minted over maxSupply", async function () {
      const { recipient1, recipient2 } = await loadFixture(deployTokenFixture);

      const CasioWatches = await hre.viem.deployContract("CasioWatches", [
        TOKEN_NAME,
        TOKEN_SYMBOL,
        BASE_URI,
        BASE_EXTENSION,
        MINT_LIMIT, // Set maxSupply to MINT_LIMIT
        MINT_LIMIT,
        START_TOKEN_ID,
        PRICE
      ]);
      // Mint all tokens
      await CasioWatches.write.mint(
        [recipient1.account.address, MINT_LIMIT],
        { value: PRICE * MINT_LIMIT }
      );

      // Try to mint one more
      await expect(CasioWatches.write.mint(
        [recipient2.account.address, 1n],
        { value: PRICE }
      )).to.be.rejectedWith("Max supply reached");
    });
  }); 

  describe("Price management", function () {
    it("should allow owner to change price", async function () {
      const { CasioWatches, owner } = await loadFixture(deployTokenFixture);
      const newPrice = parseEther("0.2"); // 0.2 ETH

      // Change price
      await CasioWatches.write.setPrice([newPrice]);

      // Verify new price
      const currentPrice = await CasioWatches.read.price();
      expect(currentPrice).to.equal(newPrice);
    });

    it("should fail when non-owner tries to change price", async function () {
      const { CasioWatches, nonOwner } = await loadFixture(deployTokenFixture);
      const newPrice = parseEther("0.2");

      // Get contract instance for non-owner
      const PaidMintAsNonOwner = await hre.viem.getContractAt(
        "CasioWatches",
        CasioWatches.address,
        { client: { wallet: nonOwner } }
      );

      // Attempt to change price as non-owner
      await expect(PaidMintAsNonOwner.write.setPrice([newPrice]))
        .to.be.rejectedWith("OwnableUnauthorizedAccount");
    });

    it("should apply new price to mints", async function () {
      const { CasioWatches, recipient1 } = await loadFixture(deployTokenFixture);
      const newPrice = parseEther("0.2");

      // Change price
      await CasioWatches.write.setPrice([newPrice]);

      // Try to mint with old price
      await expect(CasioWatches.write.mint(
        [recipient1.account.address, 1n],
        { value: PRICE }
      )).to.be.rejectedWith("Incorrect payment amount");

      // Mint with new price
      await expect(CasioWatches.write.mint(
        [recipient1.account.address, 1n],
        { value: newPrice }
      )).to.be.fulfilled;
    });
  });

  describe("TokenURI function", function () {
    it("should return baseURI without tokenId if no trailing slash", async function () {
      const { owner } = await loadFixture(deployTokenFixture);
      const baseUriNoSlash = "ipfs://example";
      const PaidMintNoSlash = await hre.viem.deployContract("CasioWatches", [
        TOKEN_NAME,
        TOKEN_SYMBOL,
        baseUriNoSlash,
        BASE_EXTENSION,
        MAX_SUPPLY,
        MINT_LIMIT,
        START_TOKEN_ID,
        PRICE
      ]);

      // Mint a token
      await PaidMintNoSlash.write.mint([owner.account.address, 1n], { value: PRICE });

      // Check URI
      const uri = await PaidMintNoSlash.read.tokenURI([0n]);
      expect(uri).to.equal(baseUriNoSlash);
    });

    it("should return tokenId modulo 8", async function () {
      const { recipient1 } = await loadFixture(deployTokenFixture);

      // set higher limit in order to mint more tokens in this test
      const mintLimit = 17n;
      const CasioBiggerLimit = await hre.viem.deployContract("CasioWatches", [
        TOKEN_NAME,
        TOKEN_SYMBOL,
        BASE_URI,
        BASE_EXTENSION,
        MAX_SUPPLY,
        mintLimit,
        START_TOKEN_ID,
        PRICE
      ]);

      // Mint 17 tokens to cover all test cases
      await CasioBiggerLimit.write.mint([recipient1.account.address, mintLimit], { value: PRICE * 17n });

      // Test various token IDs
      const testCases = [
        { tokenId: 0n, expected: `${BASE_URI}0${BASE_EXTENSION}` },
        { tokenId: 1n, expected: `${BASE_URI}1${BASE_EXTENSION}` },
        { tokenId: 8n, expected: `${BASE_URI}0${BASE_EXTENSION}` },
        { tokenId: 9n, expected: `${BASE_URI}1${BASE_EXTENSION}` },
        { tokenId: 15n, expected: `${BASE_URI}7${BASE_EXTENSION}` },
        { tokenId: 16n, expected: `${BASE_URI}0${BASE_EXTENSION}` }
      ];

      // Check each token's URI
      for (const { tokenId, expected } of testCases) {
        const uri = await CasioBiggerLimit.read.tokenURI([tokenId]);
        expect(uri).to.equal(expected);
      }
    });

    it("should fail for invalid token ID", async function () {
      const { CasioWatches } = await loadFixture(deployTokenFixture);
    
      await expect(CasioWatches.read.tokenURI([999n]))
        .to.be.rejectedWith("ERC721NonexistentToken");
    });

    it("should handle empty baseURI correctly", async function () {
      const { owner } = await loadFixture(deployTokenFixture);

      const CasioEmpty = await hre.viem.deployContract("CasioWatches", [
        TOKEN_NAME,
        TOKEN_SYMBOL,
        "",  // empty baseURI
        BASE_EXTENSION,
        MAX_SUPPLY,
        MINT_LIMIT,
        START_TOKEN_ID,
        PRICE
      ]);

      // Mint a token
      await CasioEmpty.write.mint([owner.account.address, 1n], { value: PRICE });

      // When baseURI is empty, the function should return empty string
      const uri = await CasioEmpty.read.tokenURI([0n]);
      expect(uri).to.equal("");
    });
  });
});