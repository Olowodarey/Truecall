import { ADMIN_ADDRESS } from "@/lib/constants";

export function isAdminAddress(address: string | undefined): boolean {
  if (!address || !ADMIN_ADDRESS) return false;
  return address.toLowerCase() === ADMIN_ADDRESS.toLowerCase();
}
