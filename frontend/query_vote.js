const { hexToCV, cvToValue } = require("@stacks/transactions");

async function run() {
  const govAddr = "ST3TWY4THYR9PMMD72N7SA8SE1FJPSF219RNZQY5F";
  const govName = "governance";
  const url = `https://api.testnet.hiro.so/v2/contracts/call-read/${govAddr}/${govName}/get-proposal`;

  const body = {
    sender: govAddr,
    arguments: ["0100000000000000000000000000000001"] // (uint 1)
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  
  const data = await resp.json();
  if (data.okay && data.result) {
      console.log(cvToValue(hexToCV(data.result)));
  } else {
      console.log(data);
  }
}
run();
