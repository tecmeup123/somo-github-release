import { type Cluster, type InsertCluster, clusters } from "@shared/schema";
import { db } from "../../db";
import { eq, desc } from "drizzle-orm";

export interface IClusterStorage {
  getActiveCluster(): Promise<Cluster | undefined>;
  getAllClusters(): Promise<Cluster[]>;
  createCluster(cluster: InsertCluster): Promise<Cluster>;
  updateCluster(id: string, updates: Partial<Cluster>): Promise<Cluster | undefined>;
  setActiveCluster(clusterId: string): Promise<void>;
}

export class ClusterStorage implements IClusterStorage {
  async getActiveCluster(): Promise<Cluster | undefined> {
    const [cluster] = await db
      .select()
      .from(clusters)
      .where(eq(clusters.isActive, true));
    return cluster || undefined;
  }

  async getAllClusters(): Promise<Cluster[]> {
    return await db
      .select()
      .from(clusters)
      .orderBy(desc(clusters.createdAt));
  }

  async createCluster(insertCluster: InsertCluster): Promise<Cluster> {
    const [cluster] = await db
      .insert(clusters)
      .values(insertCluster)
      .returning();
    return cluster;
  }

  async updateCluster(id: string, updates: Partial<Cluster>): Promise<Cluster | undefined> {
    const [updatedCluster] = await db
      .update(clusters)
      .set(updates)
      .where(eq(clusters.id, id))
      .returning();
    return updatedCluster || undefined;
  }

  async setActiveCluster(clusterId: string): Promise<void> {
    // First, set all clusters to inactive
    await db
      .update(clusters)
      .set({ isActive: false });
    
    // Then set the specified cluster as active
    await db
      .update(clusters)
      .set({ isActive: true })
      .where(eq(clusters.clusterId, clusterId));
  }
}

export const clusterStorage = new ClusterStorage();
