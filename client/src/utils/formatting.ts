export const formatCKB = (amount: number): string => {
  return `${formatCompactNumber(amount)} CKB`;
};

export const formatCompactNumber = (num: number): string => {
  if (num >= 1000000) {
    const formatted = (num / 1000000).toFixed(1);
    return `${formatted.replace(/\.0$/, '')}M`;
  }
  if (num >= 1000) {
    const value = num / 1000;
    const rounded = Math.round(value * 10) / 10;
    
    // If rounding pushes us to 1000k, promote to 1M
    if (rounded >= 1000) {
      return '1M';
    }
    
    const formatted = value.toFixed(1);
    return `${formatted.replace(/\.0$/, '')}k`;
  }
  return num.toString();
};

export const formatPixelCount = (count: number): string => {
  return count.toLocaleString();
};

export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};

export const formatAddress = (address: string, length = 8): string => {
  if (address.length <= length) return address;
  return `${address.slice(0, length / 2)}...${address.slice(-length / 2)}`;
};