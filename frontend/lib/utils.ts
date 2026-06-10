import { ADMIN_ADDRESSES } from "@/lib/constants";

export function isAdminAddress(address: string | undefined): boolean {
  if (!address || ADMIN_ADDRESSES.length === 0) return false;
  const lower = address.toLowerCase();
  return ADMIN_ADDRESSES.some((a) => a.toLowerCase() === lower);
}
