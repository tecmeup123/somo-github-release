import type { Express } from "express";
import { clusterStorage } from "../clusters/storage";
import { pixelStorage } from "../pixels/storage";
import { transactionStorage } from "../transactions/storage";
import { isAdmin, ADMIN_WALLET_ADDRESS } from "../../config";
import { log } from "../../vite";
import { createSoMoClusterMetadata } from "@shared/dob-metadata";
import { db } from "../../db";
import { pixels } from "@shared/schema";
import { eq, and, sql, isNotNull } from "drizzle-orm";

export function registerAdminRoutes(app: Express) {
  // Admin: Check admin wallet
  app.post("/api/admin/check", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      res.json({ 
        isAdmin: isAdmin(walletAddress),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to check admin status" });
    }
  });

  // Admin: Get cluster status (active cluster)
  app.get("/api/admin/cluster-status", async (req, res) => {
    try {
      const cluster = await clusterStorage.getActiveCluster();
      
      if (cluster) {
        // Return stored admin address, fallback to config if not set (for old clusters)
        const adminAddress = cluster.adminAddress || ADMIN_WALLET_ADDRESS;
        
        res.json({
          exists: true,
          clusterId: cluster.clusterId,
          txHash: cluster.txHash,  // Include txHash for cellDep injection
          name: cluster.name,
          description: cluster.description,
          createdAt: cluster.createdAt,
          adminAddress: adminAddress, // Return actual cluster creator's address
        });
      } else {
        res.json({ exists: false });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to check cluster status" });
    }
  });

  // Admin: Get all clusters
  app.get("/api/admin/clusters", async (req, res) => {
    try {
      const clusters = await clusterStorage.getAllClusters();
      res.json({ clusters });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clusters" });
    }
  });

  // Admin: Set active cluster
  app.post("/api/admin/set-active-cluster", async (req, res) => {
    try {
      const { walletAddress, clusterId } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ 
          error: "Wallet address is required for authorization" 
        });
      }
      
      if (!isAdmin(walletAddress)) {
        return res.status(403).json({ 
          error: "Unauthorized: Only admin wallet can set active cluster" 
        });
      }
      
      if (!clusterId) {
        return res.status(400).json({ 
          error: "Cluster ID is required" 
        });
      }
      
      await clusterStorage.setActiveCluster(clusterId);
      
      res.json({
        success: true,
        message: "Active cluster updated successfully"
      });
    } catch (error: any) {
      log(`Failed to set active cluster: ${error.message}`);
      res.status(500).json({ error: error.message || "Failed to set active cluster" });
    }
  });

  // Admin: Create SoMo cluster  
  app.post("/api/admin/create-cluster", async (req, res) => {
    try {
      const { 
        walletAddress, 
        clusterId, 
        txHash, 
        message, 
        signature, 
        name, 
        description: userDescription,
        cellData // New: full cluster cell data for skip mode minting
      } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ 
          error: "Wallet address is required for authorization" 
        });
      }
      
      // Validate admin authorization
      if (!isAdmin(walletAddress)) {
        return res.status(403).json({ 
          error: "Unauthorized: Only admin wallet can create clusters" 
        });
      }
      
      // Validate blockchain transaction data
      if (!clusterId || !txHash) {
        return res.status(400).json({ 
          error: "Blockchain transaction data required: clusterId and txHash must be provided" 
        });
      }
      
      // Security Fix M-04: Check length before regex to prevent ReDoS
      // Validate cluster ID format
      if (clusterId.length > 200 || !clusterId.match(/^0x[0-9a-fA-F]+$/)) {
        return res.status(400).json({ 
          error: "Invalid cluster ID format" 
        });
      }
      
      // Validate transaction hash format (must be exactly 66 characters: 0x + 64 hex)
      if (txHash.length !== 66 || !txHash.match(/^0x[0-9a-fA-F]{64}$/)) {
        return res.status(400).json({ 
          error: "Invalid transaction hash format" 
        });
      }

      const clusterName = name || "SoMo Pixel Canvas";
      
      log(`Storing SoMo Spore cluster from blockchain...`);
      log(`Cluster ID: ${clusterId}`);
      log(`Cluster Name: ${clusterName}`);
      log(`Transaction: ${txHash}`);
      
      // Create DOB/0 cluster metadata
      const clusterMetadata = createSoMoClusterMetadata();
      
      // Check if this is the first cluster - if so, make it active
      const allClusters = await clusterStorage.getAllClusters();
      const isFirstCluster = allClusters.length === 0;
      
      // Store cluster in database with DOB/0 metadata, admin address, and full cell data
      const cluster = await clusterStorage.createCluster({
        clusterId,
        name: clusterName,
        description: JSON.stringify(clusterMetadata),
        adminAddress: walletAddress, // Store cluster creator's address
        txHash,
        isActive: isFirstCluster,
        // Store full cluster cell data for skip mode minting
        cellCapacity: cellData?.capacity,
        cellLockCodeHash: cellData?.lock?.codeHash,
        cellLockHashType: cellData?.lock?.hashType,
        cellLockArgs: cellData?.lock?.args,
        cellTypeCodeHash: cellData?.type?.codeHash,
        cellTypeHashType: cellData?.type?.hashType,
        cellTypeArgs: cellData?.type?.args,
        cellData: cellData?.data,
        cellOutputIndex: cellData?.outputIndex || 0,
        acpCellDepTxHash: cellData?.acpCellDep?.outPoint?.txHash,
        acpCellDepIndex: cellData?.acpCellDep?.outPoint?.index,
        acpCellDepType: cellData?.acpCellDep?.depType,
      });
      
      log(`SoMo cluster created successfully by admin ${walletAddress}`);
      
      res.json({
        success: true,
        clusterId: cluster.clusterId,
        name: cluster.name,
        txHash,
        message: "SoMo cluster created successfully on blockchain"
      });
      
    } catch (error: any) {
      log(`Failed to create cluster: ${error.message}`);
      res.status(500).json({ error: error.message || "Failed to create cluster" });
    }
  });

  // Admin: Recalculate all pixel tiers with corrected center
  app.post("/api/admin/recalculate-tiers", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ 
          error: "Wallet address is required for authorization" 
        });
      }
      
      if (!isAdmin(walletAddress)) {
        return res.status(403).json({ 
          error: "Unauthorized: Only admin wallet can recalculate tiers" 
        });
      }
      
      log(`Recalculating pixel tiers with corrected center (24.5, 24.5)...`);
      await pixelStorage.recalculateTiers();
      log(`Tier recalculation completed successfully`);
      
      res.json({
        success: true,
        message: "All pixel tiers recalculated successfully"
      });
    } catch (error: any) {
      log(`Failed to recalculate tiers: ${error.message}`);
      res.status(500).json({ error: error.message || "Failed to recalculate tiers" });
    }
  });

  // Admin: Get dashboard stats
  app.get("/api/admin/dashboard-stats", async (req, res) => {
    try {
      // Get platform health stats
      const [platformStats] = await db
        .select({
          totalMinted: sql<number>`COUNT(*) FILTER (WHERE ${pixels.claimed} = true)`,
          totalLockedCKB: sql<number>`SUM(${pixels.price}) FILTER (WHERE ${pixels.claimed} = true)`,
          uniqueFounders: sql<number>`COUNT(DISTINCT ${pixels.minterId}) FILTER (WHERE ${pixels.claimed} = true AND ${pixels.minterId} IS NOT NULL)`,
          lastMintTime: sql<Date>`MAX(${pixels.mintedAt})`,
        })
        .from(pixels);

      // Get tier distribution
      const tierDistribution = await db
        .select({
          tier: pixels.tier,
          minted: sql<number>`COUNT(*) FILTER (WHERE ${pixels.claimed} = true)`,
          total: sql<number>`COUNT(*)`,
        })
        .from(pixels)
        .groupBy(pixels.tier);

      // Get recent activity (last 10 mint transactions)
      const recentActivity = await transactionStorage.getRecentMintTransactions(10);

      res.json({
        platformHealth: {
          totalMinted: Number(platformStats.totalMinted) || 0,
          totalLockedCKB: Number(platformStats.totalLockedCKB) || 0,
          uniqueFounders: Number(platformStats.uniqueFounders) || 0,
          lastMintTime: platformStats.lastMintTime,
        },
        tierDistribution: tierDistribution.map(tier => ({
          tier: tier.tier,
          minted: Number(tier.minted),
          total: Number(tier.total),
        })),
        recentActivity,
      });
    } catch (error: any) {
      log(`Failed to fetch dashboard stats: ${error.message}`);
      res.status(500).json({ error: error.message || "Failed to fetch dashboard stats" });
    }
  });

  // Admin: Initialize mint counters (one-time setup)
  app.post("/api/admin/initialize-counters", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ 
          error: "Wallet address is required for authorization" 
        });
      }
      
      if (!isAdmin(walletAddress)) {
        return res.status(403).json({ 
          error: "Unauthorized: Only admin wallet can initialize counters" 
        });
      }
      
      await pixelStorage.initializeMintCounters();
      
      res.json({
        success: true,
        message: "Mint counters initialized successfully"
      });
    } catch (error: any) {
      log(`Failed to initialize mint counters: ${error.message}`);
      res.status(500).json({ error: error.message || "Failed to initialize mint counters" });
    }
  });
}
