// Comma-separated list of admin wallet addresses, e.g.
// NEXT_PUBLIC_ADMIN_ADDRESS=0x2c2A...,0x6848...
export const ADMIN_ADDRESSES = (process.env.NEXT_PUBLIC_ADMIN_ADDRESS || "")
  .split(",")
  .map((a) => a.trim())
  .filter(Boolean);
