import { ccc } from "@ckb-ccc/core";
import { ADMIN_WALLET_TESTNET, ADMIN_WALLET_MAINNET } from "@shared/canvas-utils";

/**
 * Add platform fee output to a CKB transaction
 * @param tx - The CCC transaction object
 * @param signer - The wallet signer
 * @param feeAmountCKB - Fee amount in CKB (will be converted to shannons)
 * @param operationType - Type of operation (for logging)
 */
export async function addPlatformFeeToTransaction(
  tx: any,
  signer: any,
  feeAmountCKB: number,
  operationType: string
): Promise<void> {
  const client = signer.client;
  
  // Determine network and treasury address
  const isTestnet = client.addressPrefix === "ckt";
  const treasuryAddress = isTestnet ? ADMIN_WALLET_TESTNET : ADMIN_WALLET_MAINNET;
  const treasuryLock = (await ccc.Address.fromString(treasuryAddress, client)).script;
  
  // Convert CKB to shannons
  const feeAmount = ccc.fixedPointFrom(feeAmountCKB.toString());
  
  // Use addOutput() to properly create CCC Cell object (prevents "clone is not a function" error)
  tx.addOutput(
    {
      lock: treasuryLock,
      capacity: feeAmount,
    },
    "0x" // Empty data for fee output
  );
  
  console.log(`[${operationType}] Added ${feeAmountCKB} CKB platform fee to treasury: ${treasuryAddress}`);
}
