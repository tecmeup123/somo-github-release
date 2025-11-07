import type { Express } from "express";
import { clusterStorage } from "./storage";

export function registerClusterRoutes(app: Express) {
  // Get all clusters
  app.get("/api/clusters", async (req, res) => {
    try {
      const clusters = await clusterStorage.getAllClusters();
      res.json({ clusters });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clusters" });
    }
  });

  // Get active cluster with full cell data for skip mode minting
  app.get("/api/clusters/active", async (req, res) => {
    try {
      const cluster = await clusterStorage.getActiveCluster();
      
      if (cluster) {
        console.log("=== DEBUG: Active Cluster Data ===");
        console.log("cellCapacity:", cluster.cellCapacity);
        console.log("cellLockCodeHash:", cluster.cellLockCodeHash);
        console.log("cellLockHashType:", cluster.cellLockHashType);
        console.log("cellLockArgs:", cluster.cellLockArgs);
        console.log("cellTypeCodeHash:", cluster.cellTypeCodeHash);
        console.log("cellTypeHashType:", cluster.cellTypeHashType);
        console.log("cellTypeArgs:", cluster.cellTypeArgs);
        
        // Construct full cluster cell data for manual injection
        const cellData = cluster.cellCapacity ? {
          txHash: cluster.txHash, // Include txHash for outPoint construction
          capacity: cluster.cellCapacity,
          lock: {
            codeHash: cluster.cellLockCodeHash,
            hashType: cluster.cellLockHashType,
            args: cluster.cellLockArgs,
          },
          type: {
            codeHash: cluster.cellTypeCodeHash,
            hashType: cluster.cellTypeHashType,
            args: cluster.cellTypeArgs,
          },
          data: cluster.cellData,
          outputIndex: cluster.cellOutputIndex || 0,
          acpCellDep: cluster.acpCellDepTxHash ? {
            outPoint: {
              txHash: cluster.acpCellDepTxHash,
              index: cluster.acpCellDepIndex,
            },
            depType: cluster.acpCellDepType,
          } : undefined,
        } : undefined;

        console.log("=== Constructed cellData ===");
        console.log(JSON.stringify(cellData, null, 2));

        res.json({
          exists: true,
          clusterId: cluster.clusterId,
          txHash: cluster.txHash,
          name: cluster.name,
          description: cluster.description,
          createdAt: cluster.createdAt,
          cellData, // Full cell data for manual injection
        });
      } else {
        res.json({ exists: false });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active cluster" });
    }
  });
}
