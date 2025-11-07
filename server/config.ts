// Server-side configuration
// Admin wallet address - NEVER expose to client
export const ADMIN_WALLET_ADDRESS = "ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq9qfz8aff6h03swsaj5pkglpjuhvkp2gmswummjn";

export function isAdmin(walletAddress: string | null | undefined): boolean {
  if (!walletAddress) return false;
  return walletAddress.toLowerCase() === ADMIN_WALLET_ADDRESS.toLowerCase();
}
