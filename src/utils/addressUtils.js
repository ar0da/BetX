/**
 * Formats an address for display by showing only the first and last few characters
 * @param {string} address - The full address to format
 * @param {number} prefixLength - Number of characters to show from the start (default: 6)
 * @param {number} suffixLength - Number of characters to show from the end (default: 4)
 * @returns {string} Formatted address with ellipsis in the middle
 */
export const formatAddress = (address, prefixLength = 6, suffixLength = 4) => {
  if (!address || address.length <= prefixLength + suffixLength) {
    return address || '';
  }
  
  return `${address.substring(0, prefixLength)}...${address.substring(address.length - suffixLength)}`;
};

/**
 * Formats a transaction hash for display
 * @param {string} hash - The transaction hash to format
 * @returns {string} Formatted transaction hash
 */
export const formatTransactionHash = (hash) => {
  return formatAddress(hash, 10, 10);
};

/**
 * Formats an amount of EGLD from the smallest denomination (wei) to EGLD
 * @param {string|number} amount - The amount in wei
 * @returns {string} The formatted amount in EGLD
 */
export const formatEgldAmount = (amount) => {
  if (!amount) return '0';
  
  // Convert from wei to EGLD (1 EGLD = 10^18 wei)
  const egldAmount = Number(amount) / Math.pow(10, 18);
  
  // Format with 4 decimal places
  return egldAmount.toLocaleString(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
};

/**
 * Converts EGLD to wei (smallest denomination)
 * @param {string|number} egld - The amount in EGLD
 * @returns {string} The amount in wei as a string
 */
export const egldToWei = (egld) => {
  if (!egld) return '0';
  
  // Convert from EGLD to wei (1 EGLD = 10^18 wei)
  const weiAmount = Number(egld) * Math.pow(10, 18);
  
  // Return as string to avoid precision issues with big numbers
  return weiAmount.toString();
};
