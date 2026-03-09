const fetch = require("node-fetch");
const { hexToCV, cvToValue } = require("@stacks/transactions");

async function run() {
  const govAddr = "ST3TWY4THYR9PMMD72N7SA8SE1FJPSF219RNZQY5F";

  const url = `https://api.testnet.hiro.so/v2/data_var/${govAddr}/staking/governance-contract`;

  try {
    const resp = await fetch(url);
    const data = await resp.json();
    console.log("Governance Contract Var:", cvToValue(hexToCV(data.data)));
  } catch (e) {
    console.error(e);
  }
}
run();
