import { ccc } from "@ckb-ccc/connector-react";

/**
 * ACP (Anyone-Can-Pay) Lock Script Configuration for Testnet
 * 
 * The ACP lock allows anyone to add capacity to a cell without the owner's signature,
 * as long as the capacity is preserved or increased.
 * 
 * Perfect for collaborative scenarios like a Spore cluster where:
 * - Admin creates the cluster with ACP lock
 * - Users can reference/include the cluster in their transactions
 * - Users don't need admin's signature
 * - Cluster capacity must be preserved exactly
 */

// Testnet ACP Lock Script Deployment Info
export const ACP_CODE_HASH = "0x3419a1c09eb2567f6552ee7a8ecffd64155cffe0f1796e6e61ec088d740c1356";
export const ACP_HASH_TYPE = "type" as const;
export const ACP_TX_HASH = "0xec26b0f85ed839ece5f11c4c4e837ec359f5adc4420410f6453b1f6b60fb96a6";
export const ACP_TX_INDEX = 0;

/**
 * Create an ACP lock script for a given address
 * 
 * @param signer - CCC signer (to extract public key hash from)
 * @param minCkb - Optional minimum CKB amount (1 byte, 0-255). 0 = no minimum.
 * @returns ACP lock script
 */
export async function createAcpLock(
  signer: any,
  minCkb: number = 0
): Promise<ccc.Script> {
  // Get the signer's address
  const address = await signer.getAddresses();
  const addressStr = address[0];
  
  // Parse the address to get the script
  const parsedAddress = await ccc.Address.fromString(addressStr, signer.client);
  const script = parsedAddress.script;
  
  // Extract public key hash (first 20 bytes) from the signer's lock script args
  // Some lock scripts may have additional data beyond the pubkey hash, so we extract only the first 20 bytes
  const fullArgs = script.args;
  
  // Extract first 20 bytes (40 hex chars) after "0x"
  const pubkeyHash = "0x" + fullArgs.slice(2, 42); // Skip "0x", take next 40 chars (20 bytes)
  
  if (pubkeyHash.length !== 42) { // "0x" + 40 hex chars = 20 bytes
    throw new Error(`Failed to extract public key hash. Original args length: ${fullArgs.length}, expected at least 42`);
  }
  
  // ACP lock args format:
  // - Basic (20 bytes): <pubkey_hash>
  // - With CKB min (21 bytes): <pubkey_hash> + <min_ckb (1 byte)>
  let acpArgs = pubkeyHash;
  
  if (minCkb > 0) {
    if (minCkb > 255) {
      throw new Error(`minCkb must be 0-255, got ${minCkb}`);
    }
    // Append minimum CKB byte (1 byte = 2 hex chars)
    const minCkbHex = minCkb.toString(16).padStart(2, '0');
    acpArgs = pubkeyHash + minCkbHex;
  }
  
  console.log("🔓 Creating ACP lock:");
  console.log(`  Owner pubkey hash: ${pubkeyHash}`);
  console.log(`  Minimum CKB: ${minCkb} (${minCkb === 0 ? 'no minimum' : `${minCkb} CKB`})`);
  console.log(`  ACP args: ${acpArgs}`);
  
  // Create ACP lock script
  const acpLock = ccc.Script.from({
    codeHash: ACP_CODE_HASH,
    hashType: ACP_HASH_TYPE,
    args: acpArgs,
  });
  
  return acpLock;
}

/**
 * Get the ACP lock cellDep for transactions
 * This must be added to any transaction that includes ACP-locked cells
 */
export function getAcpCellDep(): ccc.CellDep {
  return ccc.CellDep.from({
    outPoint: {
      txHash: ACP_TX_HASH,
      index: ACP_TX_INDEX,
    },
    depType: "depGroup"
  });
}

/**
 * Check if a lock script is an ACP lock
 */
export function isAcpLock(lock: ccc.ScriptLike): boolean {
  const script = ccc.Script.from(lock);
  return script.codeHash === ACP_CODE_HASH && script.hashType === ACP_HASH_TYPE;
}
