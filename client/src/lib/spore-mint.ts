import { ccc } from "@ckb-ccc/connector-react";
import { spore } from "@ckb-ccc/spore";
import { createPixelDOBContent } from "@shared/dob-metadata";
import { getTierColor, getContrastingTextColor, getPlatformFee } from "@/lib/canvas";
import type { PixelTier } from "@shared/canvas-utils";
import type { TextColor } from "@shared/schema";
import { addPlatformFeeToTransaction } from "./blockchain-utils";

export interface MintSporeParams {
  signer: any; // CCC Signer type
  x: number;
  y: number;
  tier: PixelTier;
  price: number;
  clusterId?: string;  // Cluster ID for Spore type script args
  clusterTxHash?: string;  // Transaction hash where cluster was created
  clusterCellData?: any;  // Full cluster cell data for manual injection
  dobContent?: any; // Pre-generated DOB content from backend with real mint numbers
}

export interface MintSporeResult {
  txHash: string;
  sporeId: string;
  dna: string;
}

/**
 * Mint a Spore NFT for a pixel claim - simplified standard approach
 * Opens wallet for user to sign the transaction
 */
export async function mintPixelSpore(params: MintSporeParams): Promise<MintSporeResult> {
  const { signer, x, y, tier, price, clusterId, clusterTxHash, clusterCellData, dobContent: providedDobContent } = params;

  console.log("=== MINTING PIXEL SPORE (Two-Step Flow) ===");
  console.log(`Pixel: (${x}, ${y}), Tier: ${tier}, Price: ${price} CKB`);

  // Use pre-generated DOB content from backend (with real mint numbers)
  // If not provided, fallback to generating with placeholder numbers
  let dobContent;
  if (providedDobContent) {
    dobContent = providedDobContent;
    console.log(`Using backend-generated DNA with real mint numbers`);
  } else {
    // Fallback: generate with placeholder numbers (backward compatibility)
    console.warn(`WARNING: No dobContent provided, using placeholder mint numbers (0,0)`);
    const tierColor = getTierColor(tier);
    const textColor = getContrastingTextColor(tierColor) as TextColor;
    dobContent = createPixelDOBContent(
      tierColor as any,
      textColor,
      tier,
      x,
      y,
      price,
      0, // Placeholder tierMintNumber
      0  // Placeholder globalMintNumber
    );
  }

  console.log(`DOB/0 DNA: ${dobContent.dna}`);

  // CRITICAL FIX: Use CCC SDK's encodeDna to properly encode DNA
  // According to CCC SDK types, DNA can be: string | { dna: string } | string[]
  // The encodeDna function converts any of these formats to proper ArrayBuffer
  const encodedDna = ccc.spore.dob.encodeDna(dobContent);

  console.log("🎯 CORRECT APPROACH: Using clusterMode 'clusterCell'");
  console.log("Cluster ID:", clusterId);

  let tx: any, id: string;
  let usedMode: string;

  // ✅ CORRECT APPROACH (Using clusterCell mode):
  // The SDK has three clusterMode options:
  // - "lockProxy": For proxy locks (doesn't work for ACP)
  // - "clusterCell": For using the actual cluster cell ✅ THIS ONE!
  // - "skip": Manual management
  //
  // clusterCell mode automatically:
  // 1. Fetches cluster by ID from blockchain
  // 2. Adds cluster as input/output pair
  // 3. Preserves capacity (no rebalancing!)
  // 4. Adds cluster script cellDeps
  // We only need to manually add ACP lock cellDep (per CCC dev feedback)
  
  if (clusterId && clusterCellData) {
    console.log("🎯 Creating Spore with ACP cluster using clusterCell mode...");
    console.log(`  Cluster ID: ${clusterId}`);
    
    // Create Spore with cluster using clusterCell mode
    const sporeData = {
      contentType: "dob/0",
      content: encodedDna,
      clusterId: clusterId,  // ✅ SDK will fetch and handle cluster automatically
    };
    
    const result = await spore.createSpore({
      signer,
      data: sporeData,
      clusterMode: "clusterCell",  // ✅ Correct mode for ACP clusters!
    });
    tx = result.tx;
    id = result.id;
    usedMode = "clusterCell";
    
    console.log(`✅ Spore created with cluster link! Spore ID: ${id}`);
    console.log(`✅ SDK automatically handled cluster input/output`);
    
    // Manually add ACP lock script cellDep
    // Per CCC dev: "Devs need to handle the cellDeps manually for ACP cells"
    console.log(`🔧 Adding ACP lock script cellDep (manual, per dev requirement)...`);
    const acpCellDep = ccc.CellDep.from({
      outPoint: {
        txHash: "0xec26b0f85ed839ece5f11c4c4e837ec359f5adc4420410f6453b1f6b60fb96a6",
        index: 0,
      },
      depType: "depGroup"
    });
    
    // Check if cellDep already exists
    const cellDepExists = tx.cellDeps.some((dep: any) => 
      dep.outPoint?.txHash === acpCellDep.outPoint.txHash &&
      dep.outPoint?.index === acpCellDep.outPoint.index
    );
    
    if (!cellDepExists) {
      tx.cellDeps.push(acpCellDep);
      console.log(`✅ ACP cellDep added`);
    } else {
      console.log(`✅ ACP cellDep already exists`);
    }
    
  } else if (clusterId && !clusterCellData) {
    throw new Error("Cluster ID provided but cluster data not found in database");
  } else {
    // No cluster specified, mint standalone
    console.log("No cluster specified. Minting standalone Spore...");
    
    const sporeData = {
      contentType: "dob/0",
      content: encodedDna,
    };
    
    const result = await spore.createSpore({
      signer,
      data: sporeData,
      clusterMode: undefined,
    });
    tx = result.tx;
    id = result.id;
    usedMode = "standalone";
    console.log(`✅ Standalone mint succeeded! Spore ID: ${id}`);
  }

  console.log(`Spore created with ID: ${id}`);

  // Add platform fee output to admin wallet FIRST
  // This must be done before completing inputs
  const platformFee = getPlatformFee(tier);
  console.log(`Adding platform fee output:`);
  console.log(`  Fee: ${platformFee} CKB`);
  
  await addPlatformFeeToTransaction(tx, signer, platformFee, "spore-mint");
  
  // Get current Spore cell capacity (output 0)
  const currentCapacity = tx.outputs[0].capacity;
  console.log(`  Current Spore cell capacity: ${ccc.fixedPointToString(currentCapacity)} CKB`);
  
  // Set Spore cell to exact tier value
  const tierCapacity = ccc.fixedPointFrom(price.toString());
  console.log(`  Setting Spore to tier value: ${price} CKB`);
  tx.outputs[0].capacity = tierCapacity;
  console.log(`  ✅ Spore capacity set to: ${ccc.fixedPointToString(tx.outputs[0].capacity)} CKB`);
  
  // Complete transaction fees - SDK will find user's empty cells
  console.log("Completing transaction fees...");
  await tx.completeFeeBy(signer, 1000);
  console.log(`  ✅ Fee completed. Final Spore capacity: ${ccc.fixedPointToString(tx.outputs[0].capacity)} CKB`)

  console.log("Transaction ready, sending to wallet...");
  
  // LOG TRANSACTION DETAILS FOR CCC DEVS
  console.log("═══════════════════════════════════════════════════════════");
  console.log("📋 COMPLETE TRANSACTION ANALYSIS");
  console.log("═══════════════════════════════════════════════════════════");
  
  // Get user address
  const userAddress = await signer.getRecommendedAddress();
  console.log("\n👤 USER INFO:");
  console.log(`  Address: ${userAddress}`);
  
  console.log("\n🎯 CLUSTER INFO:");
  console.log(`  Cluster ID: ${clusterId || 'None (standalone mint)'}`);
  console.log(`  Approach Used: ${usedMode}`);
  if (usedMode === "clusterCell") {
    console.log(`  ✅ clusterMode: "clusterCell" (CORRECT mode for ACP)`);
    console.log(`  ✅ SDK automatically fetches cluster by ID`);
    console.log(`  ✅ SDK automatically adds cluster input/output`);
    console.log(`  ✅ SDK automatically preserves cluster capacity`);
    console.log(`  ✅ Manual ACP cellDep added (per CCC dev requirement)`);
  } else if (usedMode === "standalone") {
    console.log(`  ⚠️ No cluster: Pixel minted as standalone NFT`);
  }
  
  console.log("\n🎨 PIXEL INFO:");
  console.log(`  Coordinates: (${x}, ${y})`);
  console.log(`  Tier: ${tier}`);
  console.log(`  Price: ${price} CKB`);
  console.log(`  DOB/0 DNA: ${dobContent.dna}`);
  
  try {
    const txJson = tx.stringify();
    const txObj = JSON.parse(txJson);
    
    console.log("\n📦 TRANSACTION INPUTS:", txObj.inputs?.length || 0);
    txObj.inputs?.forEach((input: any, i: number) => {
      const capacity = input.previousOutput?.capacity || 'unknown';
      console.log(`  Input ${i}: ${capacity} capacity`);
      console.log(`    OutPoint: ${input.previousOutput?.txHash?.substring(0, 10)}...`);
    });
    
    console.log("\n📤 TRANSACTION OUTPUTS:", txObj.outputs?.length || 0);
    txObj.outputs?.forEach((output: any, i: number) => {
      const capacityHex = output.capacity;
      const capacityNum = capacityHex ? parseInt(capacityHex, 16) / 100000000 : 0;
      const lockCodeHash = output.lock?.codeHash;
      const typeCodeHash = output.type?.codeHash;
      
      console.log(`  Output ${i}: ${capacityNum.toFixed(2)} CKB`);
      console.log(`    Lock: ${lockCodeHash?.substring(0, 10)}...`);
      if (typeCodeHash) {
        console.log(`    Type: ${typeCodeHash?.substring(0, 10)}... ${typeCodeHash?.includes('spore') ? '(Spore)' : ''}`);
        console.log(`    ⚠️ THIS OUTPUT HAS TYPE SCRIPT - Script verification will run`);
      }
    });
    
    console.log("\n🔗 CELL DEPENDENCIES:", txObj.cellDeps?.length || 0);
    txObj.cellDeps?.forEach((dep: any, i: number) => {
      const isCluster = dep.outPoint?.txHash === clusterId?.split(':')[0];
      console.log(`  CellDep ${i}: ${dep.depType} ${isCluster ? '⭐ (CLUSTER)' : ''}`);
      console.log(`    OutPoint: ${dep.outPoint?.txHash?.substring(0, 10)}...#${dep.outPoint?.index}`);
    });
    
    console.log("\n📊 TRANSACTION SUMMARY:");
    console.log(`  Total Inputs: ${txObj.inputs?.length || 0}`);
    console.log(`  Total Outputs: ${txObj.outputs?.length || 0}`);
    console.log(`  Total CellDeps: ${txObj.cellDeps?.length || 0}`);
    console.log(`  Witnesses: ${txObj.witnesses?.length || 0}`);
    
    console.log("\n📝 FULL TRANSACTION JSON (for CCC devs):");
    console.log(JSON.stringify(txObj, null, 2));
    
  } catch (error) {
    console.log("⚠️ Could not parse transaction:", error);
    console.log("Raw transaction object:", tx);
  }
  
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("📤 Sending transaction to wallet for signing...");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Send transaction and get hash - wrap in try-catch to capture wallet errors
  let txHash: string;
  try {
    txHash = await signer.sendTransaction(tx);
    console.log(`✅ Transaction sent successfully!`);
    console.log(`   TX Hash: ${txHash}`);
  } catch (walletError: any) {
    console.error("\n❌ WALLET TRANSACTION FAILED");
    console.error("═══════════════════════════════════════════════════════════");
    console.error("Error Type:", walletError.constructor.name);
    console.error("Error Message:", walletError.message);
    console.error("Error Stack:", walletError.stack);
    
    // Check for specific error patterns
    if (walletError.message?.includes('TransactionFailedToVerify')) {
      console.error("\n🔍 VERIFICATION ERROR DETECTED:");
      console.error("This is Error 7 - TransactionScriptError");
      
      if (walletError.message?.includes('Outputs[0].Type')) {
        console.error("❌ Failed on: Outputs[0].Type (Spore NFT type script)");
        console.error("💡 Analysis: Spore type script verification failed");
      } else if (walletError.message?.includes('error code 10')) {
        console.error("❌ Error Code 10: Duplicate cluster cells detected");
        console.error("💡 Analysis: Transaction has multiple cluster outputs");
      }
      
      console.error("\n📋 SHARE THIS WITH CCC DEVS:");
      console.error("Cluster ID:", clusterId);
      console.error("Approach: lockProxy-with-acp-celldep");
      console.error("User Address:", userAddress);
      console.error("Pattern: clusterId in sporeData + clusterMode: lockProxy + manual ACP cellDep");
    }
    
    console.error("═══════════════════════════════════════════════════════════\n");
    
    // Re-throw to trigger UI error handling
    throw walletError;
  }
  
  console.log("=== END PIXEL SPORE MINT ===\n");

  return {
    txHash,
    sporeId: id,
    dna: dobContent.dna,
  };
}
