import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { getAddress, zeroAddress, parseEther } from "viem";

// Global test configuration
const TOKEN_NAME = "PaidMint";
const TOKEN_SYMBOL = "PAID";
const BASE_URI = "ipfs://example/";
const BASE_EXTENSION = ".json";
const MAX_SUPPLY = 1000n;
const MINT_LIMIT = 5n;
const PRICE = parseEther("0.1"); // 0.1 ETH

describe("PaidMint", function () {
  async function deployTokenFixture() {
    const START_TOKEN_ID = 1n;

    // Get wallet clients for testing
    const [owner, nonOwner, recipient1, recipient2] = await hre.viem.getWalletClients();

    const PaidMint = await hre.viem.deployContract("PaidMint", [
      TOKEN_NAME,
      TOKEN_SYMBOL,
      BASE_URI,
      BASE_EXTENSION,
      MAX_SUPPLY,
      MINT_LIMIT,
      START_TOKEN_ID,
      PRICE
    ]);

    return { PaidMint, owner, nonOwner, recipient1, recipient2, PRICE };
  }

  describe("Mint function with payment", function () {
    it("should fail when payment amount is incorrect", async function () {
      const { PaidMint, recipient1, PRICE } = await loadFixture(deployTokenFixture);

      // Try to mint with incorrect payment
      await expect(PaidMint.write.mint(
        [recipient1.account.address, 2n],
        { value: PRICE } // Only paying for 1 token
      )).to.be.rejectedWith("Incorrect payment amount");
    });

    it("should succeed with correct payment amount", async function () {
      const { PaidMint, recipient1, PRICE } = await loadFixture(deployTokenFixture);

      // Mint with correct payment
      await expect(PaidMint.write.mint(
        [recipient1.account.address, 2n],
        { value: PRICE * 2n }
      )).to.be.fulfilled;

      // Verify balance
      const balance = await PaidMint.read.balanceOf([recipient1.account.address]);
      expect(balance).to.equal(2n);
    });

    it("should accumulate payments in contract", async function () {
      const { PaidMint, recipient1, PRICE } = await loadFixture(deployTokenFixture);
      const publicClient = await hre.viem.getPublicClient();

      // Get initial contract balance
      const initialBalance = await publicClient.getBalance({
        address: PaidMint.address
      });

      // Mint tokens
      await PaidMint.write.mint(
        [recipient1.account.address, 2n],
        { value: PRICE * 2n }
      );

      // Verify contract balance increased
      const finalBalance = await publicClient.getBalance({
        address: PaidMint.address
      });
      expect(finalBalance - initialBalance).to.equal(PRICE * 2n);
    });
  });

  describe("BulkMint function (owner only, no payment)", function () {
    it("should allow owner to bulk mint without payment", async function () {
      const { PaidMint, owner, recipient1, recipient2 } = await loadFixture(deployTokenFixture);

      await expect(PaidMint.write.bulkMint([
        [recipient1.account.address, recipient2.account.address],
        [1n, 2n]
      ])).to.be.fulfilled;

      // Verify balances
      expect(await PaidMint.read.balanceOf([recipient1.account.address])).to.equal(1n);
      expect(await PaidMint.read.balanceOf([recipient2.account.address])).to.equal(1n);
    });

    it("should fail when non-owner tries to bulk mint", async function () {
      const { PaidMint, nonOwner, recipient1, recipient2 } = await loadFixture(deployTokenFixture);

      const PaidMintAsNonOwner = await hre.viem.getContractAt(
        "PaidMint",
        PaidMint.address,
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
      const { PaidMint, owner, recipient1, PRICE } = await loadFixture(deployTokenFixture);
      const publicClient = await hre.viem.getPublicClient();

      // Mint some tokens to accumulate payments
      await PaidMint.write.mint(
        [recipient1.account.address, 2n],
        { value: PRICE * 2n }
      );

      // Get owner's balance before withdrawal
      const ownerBalanceBefore = await publicClient.getBalance({
        address: owner.account.address
      });

      // Withdraw funds
      await PaidMint.write.withdraw();

      // Verify contract balance is 0
      expect(await publicClient.getBalance({
        address: PaidMint.address
      })).to.equal(0n);

      // Verify owner received the funds (approximately, considering gas costs)
      const ownerBalanceAfter = await publicClient.getBalance({
        address: owner.account.address
      });
      expect(ownerBalanceAfter > ownerBalanceBefore).to.be.true;
    });
  });
});