const fetch = require("node-fetch");
const {
  hexToCV,
  cvToValue,
  principalCV,
  serializeCV,
} = require("@stacks/transactions");

async function run() {
  const govAddr = "ST3TWY4THYR9PMMD72N7SA8SE1FJPSF219RNZQY5F";

  const url = `https://api.testnet.hiro.so/v2/contracts/call-read/${govAddr}/staking/get-stake-info`;

  const pCV = principalCV(govAddr);
  const argHex = serializeCV(pCV).toString("hex");

  const body = {
    sender: govAddr,
    arguments: [argHex],
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    if (data.okay && data.result) {
      console.log("Stake Info:", cvToValue(hexToCV(data.result)));
    } else {
      console.log("Error querying stake:", data);
    }
  } catch (e) {
    console.error(e);
  }
}
run();
