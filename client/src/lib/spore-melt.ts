import { spore } from "@ckb-ccc/spore";
import { ccc } from "@ckb-ccc/core";
import { MELT_FEE_CKB } from "@shared/canvas-utils";
import { addPlatformFeeToTransaction } from "./blockchain-utils";

export interface MeltSporeParams {
  signer: any; // CCC Signer (accepts from any CCC package to avoid type conflicts)
  sporeId: string; // Spore ID
}

export interface MeltSporeResult {
  txHash: string;
  reclaimedCapacity: bigint; // Amount of CKB (in shannons) reclaimed from melting (after fee deduction)
}

export async function meltPixelSpore(params: MeltSporeParams): Promise<MeltSporeResult> {
  const { signer, sporeId } = params;
  
  console.log("[spore-melt] Starting melt operation using CCC SDK", { sporeId });
  
  // Use official CCC SDK meltSpore function
  console.log("[spore-melt] Building melt transaction with CCC SDK...");
  const { tx } = await spore.meltSpore({
    signer,
    id: sporeId,
  });
  
  console.log("[spore-melt] Transaction built successfully");
  
  // Get the spore cell to determine reclaimed capacity
  console.log("[spore-melt] Fetching spore cell to get capacity...");
  let reclaimedCapacity = BigInt(0);
  
  try {
    // The tx inputs should contain the spore cell
    if (tx.inputs.length > 0) {
      const sporeInput = tx.inputs[0];
      const sporeCell = await signer.client.getCellLive({
        txHash: sporeInput.previousOutput!.txHash,
        index: Number(sporeInput.previousOutput!.index),
      });
      
      if (sporeCell) {
        reclaimedCapacity = sporeCell.cellOutput.capacity;
        console.log("[spore-melt] Reclaimed capacity:", reclaimedCapacity.toString());
      }
    }
  } catch (error) {
    console.warn("[spore-melt] Could not fetch capacity info:", error);
  }
  
  // Add platform melt fee (150 CKB to treasury)
  await addPlatformFeeToTransaction(tx, signer, MELT_FEE_CKB, "spore-melt");
  
  // Complete transaction inputs by capacity (required to fund the fee output)
  console.log("[spore-melt] Completing inputs by capacity...");
  await tx.completeInputsByCapacity(signer);
  
  // Complete transaction fees
  console.log("[spore-melt] Completing transaction fees...");
  await tx.completeFeeBy(signer, 1000); // 1000 shannons per KB
  
  // Send transaction to wallet for signing
  console.log("[spore-melt] Sending transaction to wallet for signing...");
  const txHash = await signer.sendTransaction(tx);
  
  console.log("[spore-melt] Transaction sent successfully, txHash:", txHash);
  
  return {
    txHash,
    reclaimedCapacity,
  };
}
