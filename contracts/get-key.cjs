const { generateWallet, restoreWalletAccounts } = require("@stacks/wallet-sdk");

async function main() {
  const mnemonic =
    "genre rabbit february pelican emotion oak rare lyrics alley retire dismiss erode";

  // Generate wallet from mnemonic
  const wallet = await generateWallet({
    secretKey: mnemonic,
    password: "password",
  });

  // The deployer is Account 0
  const account = wallet.identities[0];

  console.log("==========================================");
  console.log("Account 0 Address:", account.address);
  console.log("Private Key (hex):", account.privateKey);
  console.log("==========================================");
}

main().catch(console.error);
