import { ccc } from "@ckb-ccc/connector-react";
import { spore } from "@ckb-ccc/spore";
import { createSoMoClusterMetadata } from "@shared/dob-metadata";
import { createAcpLock, getAcpCellDep } from "./acp-lock";

export interface MintClusterParams {
  signer: any; // CCC Signer type
  name: string;
  description: string;
}

export interface MintClusterResult {
  txHash: string;
  clusterId: string;
  cellData?: any; // Cluster cell data for reference
}

/**
 * Mint a Spore Cluster for SoMo pixels with ACP (Anyone-Can-Pay) lock
 * This allows users to mint Spores into the cluster without admin signature
 */
export async function mintSoMoCluster(params: MintClusterParams): Promise<MintClusterResult> {
  const { signer, name, description } = params;

  // Get client from signer
  const client = signer.client;

  console.log("=== CREATING CLUSTER (ACP Lock - Anyone Can Pay) ===");
  console.log(`Name: ${name}`);
  console.log(`Description: ${description}`);

  // Create DOB/0 cluster metadata
  const clusterMetadata = createSoMoClusterMetadata();

  // Use CCC SDK's DOB/0 encoder
  const dob0Config = {
    description: clusterMetadata.description,
    dob: {
      ver: 0 as const,
      decoder: ccc.spore.dob.getDecoder(client, "dob0"),
      pattern: clusterMetadata.dob.pattern,
    },
  };

  const encodedDescription = ccc.spore.dob.encodeClusterDescriptionForDob0(dob0Config);

  // Create cluster data
  const clusterData = {
    name,
    description: encodedDescription,
  };

  console.log("🔓 Creating ACP lock for cluster...");
  // Create ACP lock (allows anyone to include cluster in transactions as long as capacity is preserved)
  const acpLock = await createAcpLock(signer, 0); // 0 = no minimum CKB requirement
  
  console.log("🎯 Creating cluster with ACP lock...");

  // Create cluster with ACP lock
  const { tx, id } = await spore.createSporeCluster({
    signer,
    data: clusterData,
    to: acpLock, // Use ACP lock instead of default signer lock
  });

  console.log(`✅ Cluster created! Cluster ID: ${id}`);
  
  // Add ACP cellDep (required for ACP lock validation)
  console.log("🔧 Adding ACP cellDep to transaction...");
  const acpCellDep = getAcpCellDep();
  tx.cellDeps.push(acpCellDep);
  console.log("✅ ACP cellDep added");

  // Complete transaction with fees
  console.log("Completing fees...");
  await tx.completeFeeBy(signer, 1000);

  // Send transaction
  console.log("📤 Sending to wallet for signing...");
  const txHash = await signer.sendTransaction(tx);
  console.log(`✅ Transaction sent! Hash: ${txHash}`);

  // Capture cluster cell data for reference
  const clusterOutput = tx.outputs[0];
  const clusterOutputData = tx.outputsData[0];
  
  const cellData = {
    capacity: clusterOutput.capacity.toString(),
    lock: {
      codeHash: clusterOutput.lock.codeHash,
      hashType: clusterOutput.lock.hashType,
      args: clusterOutput.lock.args,
    },
    type: clusterOutput.type ? {
      codeHash: clusterOutput.type.codeHash,
      hashType: clusterOutput.type.hashType,
      args: clusterOutput.type.args,
    } : undefined,
    data: clusterOutputData,
    outputIndex: 0, // Cluster is output 0
    txHash,
  };

  console.log("✅ Cluster creation complete!");
  console.log(`  Cluster ID: ${id}`);
  console.log(`  Transaction: ${txHash}`);

  return {
    txHash,
    clusterId: id,
    cellData,
  };
}
