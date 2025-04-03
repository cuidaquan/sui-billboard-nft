/**
 * 格式化SUI金额，将基本单位转换为SUI显示单位
 * @param amount 金额（基本单位）
 * @returns 格式化后的金额（SUI单位）
 */
export function formatSuiAmount(amount: string): string {
  return (Number(amount) / 1000000000).toString();
}

/**
 * 格式化日期
 * @param timestamp 时间戳
 * @returns 格式化后的日期字符串
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN');
}

/**
 * 格式化日期时间戳为可读字符串
 * @param timestamp Unix时间戳（秒）
 * @returns 格式化后的日期字符串
 */
export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * 计算剩余时间，返回天数
 * @param timestamp Unix时间戳（秒）
 * @returns 剩余天数
 */
export const getRemainingDays = (timestamp: number): number => {
  const now = Math.floor(Date.now() / 1000);
  const diff = timestamp - now;
  return Math.max(0, Math.floor(diff / (60 * 60 * 24)));
};

/**
 * 截断钱包地址，显示前6位和后4位
 * @param address 完整地址
 * @returns 截断后的地址
 */
export function truncateAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
} 