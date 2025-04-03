import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SuiClient } from '@mysten/sui.js/client';
import { CONTRACT_CONFIG, NETWORKS, DEFAULT_NETWORK, USE_MOCK_DATA } from '../config/config';
import { BillboardNFT, AdSpace, PurchaseAdSpaceParams, UpdateNFTContentParams, RenewNFTParams, CreateAdSpaceParams } from '../types';

// 创建 SUI 客户端
export const createSuiClient = (network = DEFAULT_NETWORK) => {
  return new SuiClient({ url: NETWORKS[network].fullNodeUrl });
};

// 获取所有可用的广告位
export async function getAvailableAdSpaces(): Promise<AdSpace[]> {
  // 如果使用模拟数据，返回模拟的广告位
  if (USE_MOCK_DATA) {
    console.log('使用模拟广告位数据');
    // 模拟数据
    const mockAdSpaces: AdSpace[] = [
      {
        id: '0x123',
        name: '首页顶部广告位',
        description: '网站首页顶部横幅广告位，高曝光量',
        imageUrl: 'https://example.com/ad-space-1.jpg',
        price: '100000000', // 0.1 SUI
        duration: 30, // 30天
        dimension: {
          width: 1200,
          height: 300,
        },
        owner: null,
        available: true,
        location: '首页顶部',
      },
      {
        id: '0x456',
        name: '侧边栏广告位',
        description: '网站所有页面侧边栏广告位',
        imageUrl: 'https://example.com/ad-space-2.jpg',
        price: '50000000', // 0.05 SUI
        duration: 30, // 30天
        dimension: {
          width: 300,
          height: 600,
        },
        owner: null,
        available: true,
        location: '所有页面侧边栏',
      },
    ];
    
    return mockAdSpaces;
  }
  
  // 实际从链上获取数据
  try {
    const client = createSuiClient();
    console.log('从链上获取广告位数据');
    // 这里是真实代码，应该调用合约获取广告位
    // 由于实际代码需要根据合约结构实现，这里只是一个示例框架
    
    // TODO: 实现实际的合约调用逻辑
    
    return []; // 返回空数组作为示例
  } catch (error) {
    console.error('获取广告位失败:', error);
    return [];
  }
}

// 获取用户拥有的 NFT
export async function getUserNFTs(owner: string): Promise<BillboardNFT[]> {
  // 如果使用模拟数据，返回模拟的NFT
  if (USE_MOCK_DATA) {
    console.log('使用模拟NFT数据');
    // 模拟数据
    const mockNFTs: BillboardNFT[] = [
      {
        id: '0x789',
        adSpaceId: '0x123',
        owner: owner,
        brandName: '示例品牌',
        contentUrl: 'https://example.com/ad-content-1.jpg',
        projectUrl: 'https://example.com',
        leaseStart: new Date(Date.now() - 86400000 * 10).toISOString(), // 10天前
        leaseEnd: new Date(Date.now() + 86400000 * 20).toISOString(), // 20天后
        isActive: true
      }
    ];
    
    return mockNFTs;
  }
  
  // 实际从链上获取数据
  try {
    const client = createSuiClient();
    console.log('从链上获取用户NFT数据');
    // 这里是真实代码，应该调用合约获取用户NFT
    // 由于实际代码需要根据合约结构实现，这里只是一个示例框架
    
    // TODO: 实现实际的合约调用逻辑
    
    return []; // 返回空数组作为示例
  } catch (error) {
    console.error('获取用户NFT失败:', error);
    return [];
  }
}

// 获取单个广告位详情
export async function getAdSpaceDetails(adSpaceId: string): Promise<AdSpace | null> {
  // 如果使用模拟数据，返回模拟的广告位详情
  if (USE_MOCK_DATA) {
    console.log('使用模拟广告位详情数据');
    // 模拟获取数据的延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 根据ID返回不同的模拟数据
    if (adSpaceId === '0x123') {
      return {
        id: '0x123',
        name: '首页顶部广告位',
        description: '网站首页顶部横幅广告位，高曝光量',
        imageUrl: 'https://example.com/ad-space-1.jpg',
        price: '100000000', // 0.1 SUI
        duration: 30, // 30天
        dimension: {
          width: 1200,
          height: 300,
        },
        owner: null,
        available: true,
        location: '首页顶部',
      };
    } else if (adSpaceId === '0x456') {
      return {
        id: '0x456',
        name: '侧边栏广告位',
        description: '网站所有页面侧边栏广告位',
        imageUrl: 'https://example.com/ad-space-2.jpg',
        price: '50000000', // 0.05 SUI
        duration: 30, // 30天
        dimension: {
          width: 300,
          height: 600,
        },
        owner: null,
        available: true,
        location: '所有页面侧边栏',
      };
    }
    
    return null;
  }
  
  // 实际从链上获取数据
  try {
    const client = createSuiClient();
    console.log('从链上获取广告位详情数据');
    // 这里是真实代码，应该调用合约获取广告位详情
    // 由于实际代码需要根据合约结构实现，这里只是一个示例框架
    
    // TODO: 实现实际的合约调用逻辑
    
    return null; // 返回null作为示例
  } catch (error) {
    console.error('获取广告位详情失败:', error);
    return null;
  }
}

// 获取单个NFT详情
export async function getNFTDetails(nftId: string): Promise<BillboardNFT | null> {
  // 如果使用模拟数据，返回模拟的NFT详情
  if (USE_MOCK_DATA) {
    console.log('使用模拟NFT详情数据');
    // 模拟获取数据的延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (nftId === '0x789') {
      return {
        id: '0x789',
        adSpaceId: '0x123',
        owner: '0xuser',
        brandName: '示例品牌',
        contentUrl: 'https://example.com/ad-content-1.jpg',
        projectUrl: 'https://example.com',
        leaseStart: new Date(Date.now() - 86400000 * 10).toISOString(), // 10天前
        leaseEnd: new Date(Date.now() + 86400000 * 20).toISOString(), // 20天后
        isActive: true
      };
    }
    
    return null;
  }
  
  // 实际从链上获取数据
  try {
    const client = createSuiClient();
    console.log('从链上获取NFT详情数据');
    // 这里是真实代码，应该调用合约获取NFT详情
    // 由于实际代码需要根据合约结构实现，这里只是一个示例框架
    
    // TODO: 实现实际的合约调用逻辑
    
    return null; // 返回null作为示例
  } catch (error) {
    console.error('获取NFT详情失败:', error);
    return null;
  }
}

// 创建购买广告位交易
export function createPurchaseAdSpaceTx(params: PurchaseAdSpaceParams): TransactionBlock {
  const txb = new TransactionBlock();
  
  if (USE_MOCK_DATA) {
    console.log('使用模拟交易数据');
    // 不进行实际的交易构建
    return txb;
  }
  
  console.log('构建购买广告位交易');
  // 这里是真实代码，应该构建购买广告位的交易
  // 由于实际代码需要根据合约结构实现，这里只是一个示例框架
  
  // TODO: 实现实际的交易构建逻辑
  
  return txb;
}

// 创建更新广告内容交易
export function createUpdateAdContentTx(params: UpdateNFTContentParams): TransactionBlock {
  const txb = new TransactionBlock();
  
  if (USE_MOCK_DATA) {
    console.log('使用模拟交易数据');
    // 不进行实际的交易构建
    return txb;
  }
  
  console.log('构建更新广告内容交易');
  // 这里是真实代码，应该构建更新广告内容的交易
  // 由于实际代码需要根据合约结构实现，这里只是一个示例框架
  
  // TODO: 实现实际的交易构建逻辑
  
  return txb;
}

// 创建续租交易
export function createRenewLeaseTx(params: RenewNFTParams): TransactionBlock {
  const txb = new TransactionBlock();
  
  if (USE_MOCK_DATA) {
    console.log('使用模拟交易数据');
    // 不进行实际的交易构建
    return txb;
  }
  
  console.log('构建续租交易');
  // 这里是真实代码，应该构建续租的交易
  // 由于实际代码需要根据合约结构实现，这里只是一个示例框架
  
  // TODO: 实现实际的交易构建逻辑
  
  return txb;
}

// 创建广告位交易
export function createAdSpaceTx(params: CreateAdSpaceParams): TransactionBlock {
  const txb = new TransactionBlock();
  
  if (USE_MOCK_DATA) {
    console.log('使用模拟交易数据');
    // 不进行实际的交易构建
    return txb;
  }
  
  console.log('构建创建广告位交易');
  // 这里是真实代码，应该构建创建广告位的交易
  // 由于实际代码需要根据合约结构实现，这里只是一个示例框架
  
  // TODO: 实现实际的交易构建逻辑
  
  return txb;
}

// 格式化 SUI 金额
export function formatSuiAmount(amount: string): string {
  return (Number(amount) / 1000000000).toString();
} 