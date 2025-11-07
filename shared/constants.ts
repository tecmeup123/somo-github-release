// Note: Admin wallet address is stored server-side only for security
// Client-side admin check is for UX only and should not be trusted
export function isAdminClient(walletAddress: string | null | undefined): boolean {
  // This is a UX helper only - actual authorization happens on server
  // Returns true if wallet is connected (server will validate)
  return !!walletAddress;
}
