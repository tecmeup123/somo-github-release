export function getCKBExplorerUrl(type: 'transaction' | 'address', value: string): string {
  const isMainnet = import.meta.env.VITE_CKB_NETWORK === 'mainnet';
  const baseUrl = isMainnet 
    ? 'https://explorer.nervos.org'
    : 'https://testnet.explorer.nervos.org';
  
  switch (type) {
    case 'transaction':
      return `${baseUrl}/transaction/${value}`;
    case 'address':
      return `${baseUrl}/address/${value}`;
    default:
      return baseUrl;
  }
}

// Note: For Spore/DOB explorer URLs, use getExplorerSporeUrl(clusterId, sporeId) from @shared/ccc-client
// For cluster URLs, use getExplorerClusterUrl(clusterId) from @shared/ccc-client

export function getNetworkLabel(): string {
  return import.meta.env.VITE_CKB_NETWORK === 'mainnet' ? 'Mainnet' : 'Testnet';
}
