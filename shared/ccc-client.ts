import { ccc } from "@ckb-ccc/core";

// Determine network based on environment variable (defaults to testnet)
const getIsMainnet = () => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env.VITE_CKB_NETWORK === "mainnet";
  }
  return process.env.VITE_CKB_NETWORK === "mainnet";
};

const isMainnet = getIsMainnet();

// Create CCC client for the appropriate network
export const getCccClient = () => {
  return isMainnet
    ? new ccc.ClientPublicMainnet()
    : new ccc.ClientPublicTestnet();
};

// Default client instance
export const cccClient = getCccClient();

// Helper to get network name
export const getNetworkName = () => isMainnet ? "mainnet" : "testnet";

// Helper to get explorer URL for transaction
export const getExplorerTxUrl = (txHash: string) => {
  const baseUrl = isMainnet
    ? "https://explorer.nervos.org"
    : "https://testnet.explorer.nervos.org";
  return `${baseUrl}/transaction/${txHash}`;
};

// Helper to get explorer URL for Spore NFT (DOB)
export const getExplorerSporeUrl = (clusterId: string, sporeId: string) => {
  const baseUrl = isMainnet
    ? "https://explorer.nervos.org"
    : "https://testnet.explorer.nervos.org";
  return `${baseUrl}/dob-info/${clusterId}/${sporeId}`;
};

// Helper to get explorer URL for Spore Cluster
export const getExplorerClusterUrl = (clusterId: string) => {
  const baseUrl = isMainnet
    ? "https://explorer.nervos.org"
    : "https://testnet.explorer.nervos.org";
  return `${baseUrl}/nft-collections/${clusterId}`;
};
