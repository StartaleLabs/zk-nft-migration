// npx hardhat ignition deploy ignition/modules/FreeMint.ts --network minato --verify

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const FreeMintModule = buildModule("FreeMintModule", (m) => {
  // Default parameters for FreeMint contract
  const name = m.getParameter("name", "FreeMint NFT");
  const symbol = m.getParameter("symbol", "FMNFT");
  const baseURI = m.getParameter("baseURI", "ipfs://example/");
  const baseExtension = m.getParameter("baseExtension", ".json");
  const maxSupply = m.getParameter("maxSupply", 1000n);
  const mintLimit = m.getParameter("mintLimit", 5n);
  const startWithTokenId = m.getParameter("startWithTokenId", 1n);
  const artifact = m.contract(
      "FreeMint",
      [
        name,
        symbol,
        baseURI,
        baseExtension,
        maxSupply,
        mintLimit,
        startWithTokenId
      ]);
    return { artifact };
});

export default FreeMintModule;