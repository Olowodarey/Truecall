const { tupleCV, uintCV } = require('@stacks/transactions');
const t = tupleCV({ "stx-balance": uintCV(100) });
console.log("tuple.data:", !!t.data);
console.log("tuple.value:", !!t.value);
