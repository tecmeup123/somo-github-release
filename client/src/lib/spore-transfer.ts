import { ccc } from "@ckb-ccc/core";
import { spore } from "@ckb-ccc/spore";
import { TRANSFER_FEE_CKB } from "@shared/canvas-utils";
import { addPlatformFeeToTransaction } from "./blockchain-utils";

export interface TransferSporeParams {
  signer: any; // CCC Signer (accepts from any CCC package to avoid type conflicts)
  sporeId: string; // Spore ID (SDK finds the cell automatically)
  toAddress: string; // Recipient CKB address
}

export interface TransferSporeResult {
  txHash: string;
}

export async function transferPixelSpore(params: TransferSporeParams): Promise<TransferSporeResult> {
  const { signer, sporeId, toAddress } = params;
  
  // Get client from signer
  const client = signer.client;
  
  // Get recipient's lock script from address
  const { script: recipientLock } = await ccc.Address.fromString(toAddress, client);
  
  console.log(`[spore-transfer] Starting transfer of Spore ${sporeId} to ${toAddress.slice(0, 10)}...`);
  
  // CRITICAL: Find the original Spore cell first to get its capacity
  // CCC SDK defaults to minimum capacity (~223 CKB), but we need to preserve the tier value
  const sporeCell = await spore.findSpore(client, sporeId);
  if (!sporeCell) {
    throw new Error(`Spore cell not found for ID: ${sporeId}`);
  }
  
  const originalCapacity = sporeCell.cell.cellOutput.capacity;
  console.log(`[spore-transfer] Found Spore with original capacity: ${ccc.fixedPointToString(originalCapacity)} CKB`);
  
  // Use official CCC Spore SDK transfer API to build the transaction
  const { tx } = await spore.transferSpore({
    signer,
    id: sporeId,
    to: recipientLock,
  });
  
  console.log(`[spore-transfer] Transaction built by CCC Spore SDK`);
  
  // CRITICAL FIX: Manually restore the original capacity to preserve tier value
  // CCC SDK defaults to minimum capacity, but we need the full locked CKB amount
  if (tx.outputs[0]) {
    tx.outputs[0].capacity = originalCapacity;
    console.log(`[spore-transfer] ✓ Capacity preserved: ${ccc.fixedPointToString(originalCapacity)} CKB`);
  } else {
    throw new Error('Transaction missing Spore output');
  }
  
  // Verify DOB/0 metadata is preserved in the transfer
  if (tx.outputsData[0]) {
    const outputDataHex = tx.outputsData[0];
    console.log(`[spore-transfer] ✓ DOB/0 metadata preserved (${outputDataHex.length} bytes):`, outputDataHex.slice(0, 100) + '...');
  } else {
    throw new Error('Transaction missing output data - DOB/0 metadata would be lost!');
  }
  
  // Add platform transfer fee (150 CKB to treasury)
  await addPlatformFeeToTransaction(tx, signer, TRANSFER_FEE_CKB, "spore-transfer");
  
  // Complete transaction inputs by capacity (adds more inputs if needed for fees)
  console.log("[spore-transfer] Completing inputs by capacity...");
  await tx.completeInputsByCapacity(signer);
  
  // Complete transaction fees - let CCC auto-calculate the optimal fee rate
  // Official docs recommend omitting the fee rate parameter for automatic calculation
  console.log("[spore-transfer] Completing transaction fees...");
  await tx.completeFeeBy(signer);
  
  // Sign and send transaction
  console.log("[spore-transfer] Sending transaction...");
  const txHash = await signer.sendTransaction(tx);
  
  console.log(`[spore-transfer] Transfer successful! TX: ${txHash}`);
  
  return {
    txHash,
  };
}
