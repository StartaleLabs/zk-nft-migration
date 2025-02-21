import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { parseEther } from "viem";

describe("KamuiVerse TokenURI Tests", function () {
  // Test configuration
  const TOKEN_NAME = "KamuiVerse";
  const TOKEN_SYMBOL = "KAMUI";
  const BASE_URI = "ipfs://example/";
  const BASE_EXTENSION = ".json";
  const MAX_SUPPLY = 1000n;
  const MINT_LIMIT = 5n;
  const START_TOKEN_ID = 0n;
  const PRICE = parseEther("0.1");

  async function deployTokenFixture() {
    const [owner, recipient1, recipient2] = await hre.viem.getWalletClients();

    const Kamui = await hre.viem.deployContract("KamuiVerse", [
      TOKEN_NAME,
      TOKEN_SYMBOL,
      BASE_URI,
      BASE_EXTENSION,
      MAX_SUPPLY,
      MINT_LIMIT,
      START_TOKEN_ID,
      PRICE
    ]);

    return { Kamui, owner, recipient1, recipient2 };
  }

  describe("TokenURI with bulkMint", function () {
    it("should set correct tokenURI for bulk minted tokens", async function () {
      const { Kamui, owner, recipient1, recipient2 } = await loadFixture(deployTokenFixture);

      const mintData = {
        recipients: [recipient1.account.address, recipient2.account.address, recipient1.account.address],
        tokenIds: [0n, 1n, 2n],
        metadataIds: [5n, 7n, 2n]
      };

      // Bulk mint tokens
      await Kamui.write.bulkMint([
        mintData.recipients,
        mintData.tokenIds,
        mintData.metadataIds
      ]);

      // Verify each token's URI
      for (let i = 0; i < mintData.tokenIds.length; i++) {
        const uri = await Kamui.read.tokenURI([mintData.tokenIds[i]]);
        const expectedUri = `${BASE_URI}${mintData.metadataIds[i]}${BASE_EXTENSION}`;
        expect(uri).to.equal(expectedUri);
      }
    });

    it("should return correct URI for tokens with same metadata ID", async function () {
      const { Kamui, recipient1 } = await loadFixture(deployTokenFixture);

      // Mint multiple tokens with the same metadata ID
      const mintData = {
        recipients: [recipient1.account.address, recipient1.account.address],
        tokenIds: [0n, 1n],
        metadataIds: [3n, 3n] // Same metadata ID
      };

      await Kamui.write.bulkMint([
        mintData.recipients,
        mintData.tokenIds,
        mintData.metadataIds
      ]);

      // Both tokens should have the same URI
      const uri1 = await Kamui.read.tokenURI([0n]);
      const uri2 = await Kamui.read.tokenURI([1n]);
      expect(uri1).to.equal(uri2);
      expect(uri1).to.equal(`${BASE_URI}3${BASE_EXTENSION}`);
    });

    it("should fail for non-existent token", async function () {
      const { Kamui } = await loadFixture(deployTokenFixture);

      await expect(Kamui.read.tokenURI([999n]))
        .to.be.rejectedWith("ERC721NonexistentToken");
    });

    it("should handle empty baseURI", async function () {
      const { Kamui, owner, recipient1 } = await loadFixture(deployTokenFixture);

      // Set empty base URI
      await Kamui.write.setBaseURI([""]);

      // Mint a token
      await Kamui.write.bulkMint([
        [recipient1.account.address],
        [0n],
        [5n]
      ]);

      // Should return empty string
      const uri = await Kamui.read.tokenURI([0n]);
      expect(uri).to.equal("");
    });

    it("should update URI when baseURI changes", async function () {
      const { Kamui, recipient1 } = await loadFixture(deployTokenFixture);

      // Mint a token
      await Kamui.write.bulkMint([
        [recipient1.account.address],
        [0n],
        [5n]
      ]);

      const originalUri = await Kamui.read.tokenURI([0n]);
      
      // Change baseURI
      const newBaseUri = "https://api.example.com/tokens/";
      await Kamui.write.setBaseURI([newBaseUri]);

      const newUri = await Kamui.read.tokenURI([0n]);
      expect(newUri).to.equal(`${newBaseUri}5${BASE_EXTENSION}`);
      expect(newUri).to.not.equal(originalUri);
    });
  });
});