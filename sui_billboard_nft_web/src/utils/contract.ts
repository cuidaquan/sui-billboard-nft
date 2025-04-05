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
// 获取游戏开发者列表
export async function getGameDevs(factoryId: string): Promise<string[]> {
  try {
    const client = createSuiClient();
    const txb = new TransactionBlock();
    
    txb.moveCall({
      target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::get_game_devs`,
      arguments: [
        txb.object(factoryId)
      ],
    });
    
    const result = await client.devInspectTransactionBlock({
      transactionBlock: txb,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000'
    });
    
    if (result.effects.status.status === 'failure') {
      throw new Error(result.effects.status.error || '获取开发者列表失败');
    }
    
    // 从返回值中获取开发者列表
    if (result.results && result.results[0] && result.results[0].returnValues) {
      const returnValue = result.results[0].returnValues;
      
      // 如果返回值是数组
      if (Array.isArray(returnValue) && returnValue.length > 0) {
        // 获取第一个元素（应该是一个包含两项的数组）
        const firstElement = returnValue[0];
        if (Array.isArray(firstElement) && firstElement.length === 2) {
          // 获取地址数组（第一项）
          const addressArray = firstElement[0];
          if (Array.isArray(addressArray)) {
            // 将字节数组分组，每组32个字节代表一个地址
            const addresses: string[] = [];
            
            // 每32个字节为一组处理
            for (let i = 0; i < addressArray.length; i += 33) {
              const addressBytes = addressArray.slice(i, i + 33);
              if (addressBytes.length === 33) {
                // 将字节数组转换为十六进制字符串，确保每个字节都被正确处理
                let addressHex = '';
                // 从索引1开始到31（包括31），总共处理31个字节
                for (let j = 1; j < addressBytes.length; j++) {
                  const byte = addressBytes[j];
                  const byteHex = (typeof byte === 'number' ? byte : parseInt(byte))
                    .toString(16)
                    .padStart(2, '0');
                  addressHex += byteHex;
                }
                
                addresses.push(`0x${addressHex}`);
              }
            }
            
            return addresses;
          }
        }
      }
    }
    
    return [];
  } catch (error) {
    console.error('获取游戏开发者列表失败:', error);
    return [];
  }
}

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
    
    // 根据ID返回不同的模拟数据
    if (nftId === '0x789') {
      return {
        id: nftId,
        adSpaceId: '0x123',
        owner: '0x456',
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
    console.log('从链上获取NFT详情');
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
  
  // 获取Clock对象
  const clockObj = txb.moveCall({
    target: '0x2::clock::Clock',
  });
  
  // 创建SUI支付对象
  const payment = txb.splitCoins(txb.gas, [txb.pure(params.price)]);
  
  // 调用合约的purchase_ad_space函数
  txb.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::purchase_ad_space`,
    arguments: [
      txb.object(CONTRACT_CONFIG.FACTORY_OBJECT_ID), // factory
      txb.object(params.adSpaceId), // ad_space
      payment, // payment
      txb.pure(params.brandName), // brand_name
      txb.pure(params.contentUrl), // content_url
      txb.pure(params.projectUrl), // project_url
      txb.pure(params.leaseDays), // lease_days
      clockObj, // clock
    ],
  });
  
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
  
  // 获取Clock对象
  const clockObj = txb.moveCall({
    target: '0x2::clock::Clock',
  });
  
  // 调用合约的update_ad_content函数
  txb.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::update_ad_content`,
    arguments: [
      txb.object(params.nftId), // nft
      txb.pure(params.contentUrl), // content_url
      clockObj, // clock
    ],
  });
  
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
  
  // 获取Clock对象
  const clockObj = txb.moveCall({
    target: '0x2::clock::Clock',
  });
  
  // 获取广告位ID
  const adSpaceId = params.adSpaceId;
  
  // 创建SUI支付对象
  const payment = txb.splitCoins(txb.gas, [txb.pure(params.price)]);
  
  // 调用合约的renew_lease函数
  txb.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::renew_lease`,
    arguments: [
      txb.object(CONTRACT_CONFIG.FACTORY_OBJECT_ID), // factory
      txb.object(adSpaceId), // ad_space
      txb.object(params.nftId), // nft
      payment, // payment
      txb.pure(params.leaseDays), // lease_days
      clockObj, // clock
    ],
  });
  
  return txb;
}

// 创建广告位的交易
export function createAdSpaceTx(params: CreateAdSpaceParams): TransactionBlock {
  const txb = new TransactionBlock();
  
  // 调用合约的 create_ad_space 函数
  txb.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::create_ad_space`,
    arguments: [
      txb.object(params.factoryId), // Factory 对象
      txb.pure(params.gameId),      // 游戏ID
      txb.pure(params.location),    // 位置信息
      txb.pure(params.size),        // 尺寸信息
      txb.pure(params.price),       // 每日价格
      txb.object(params.clockId),   // Clock 对象
    ],
  });
  
  return txb;
}

// 注册游戏开发者的交易
export function registerGameDevTx(params: { factoryId: string, developer: string }): TransactionBlock {
  const txb = new TransactionBlock();
  
  // 调用合约的 register_game_dev 函数
  txb.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::register_game_dev`,
    arguments: [
      txb.object(params.factoryId),  // Factory 对象
      txb.pure(params.developer),    // 开发者地址
    ],
  });
  
  return txb;
}

// 更新平台分成比例的交易
export function updatePlatformRatioTx(params: { factoryId: string, ratio: number }): TransactionBlock {
  const txb = new TransactionBlock();
  
  // 调用合约的 update_platform_ratio 函数
  txb.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::update_platform_ratio`,
    arguments: [
      txb.object(params.factoryId), // Factory 对象
      txb.pure(params.ratio),       // 新的分成比例
    ],
  });
  
  return txb;
}

// 更新广告位价格的交易
export function updateAdSpacePriceTx(params: { adSpaceId: string, price: string }): TransactionBlock {
  const txb = new TransactionBlock();
  
  // 调用合约的 update_ad_space_price 函数
  txb.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::update_ad_space_price`,
    arguments: [
      txb.object(params.adSpaceId), // AdSpace 对象
      txb.pure(params.price),       // 新的价格
    ],
  });
  
  return txb;
}

// 计算广告位租赁价格
export async function calculateLeasePrice(adSpaceId: string, leaseDays: number): Promise<string> {
  if (USE_MOCK_DATA) {
    console.log('使用模拟价格计算');
    // 模拟价格计算 (仅测试用)
    const mockPrice = 100000000 * leaseDays; // 0.1 SUI * 天数
    return mockPrice.toString();
  }
  
  console.log('从链上获取广告位租赁价格');
  
  try {
    const client = createSuiClient();
    const result = await client.devInspectTransactionBlock({
      transactionBlock: createCalculateLeasePriceTx(adSpaceId, leaseDays),
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000'
    });
    
    // 从检查结果中提取返回值
    if (result.effects.status.status === 'success') {
      // 解析返回值 (u64 类型的价格)
      const returnValues = result.results?.[0]?.returnValues;
      if (returnValues && returnValues.length > 0) {
        const priceValue = returnValues[0][0];
        return priceValue.toString(); // 将返回值转换为字符串
      }
    }
    
    // 如果计算失败，返回一个默认值或抛出错误
    throw new Error('无法计算租赁价格');
  } catch (error) {
    console.error('获取广告位租赁价格失败:', error);
    // 出错时返回一个默认值
    return '0';
  }
}

// 创建计算租赁价格的只读交易
function createCalculateLeasePriceTx(adSpaceId: string, leaseDays: number): TransactionBlock {
  const txb = new TransactionBlock();
  
  // 调用合约的计算价格函数
  txb.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::calculate_lease_price`,
    arguments: [
      txb.object(adSpaceId), // ad_space
      txb.pure(leaseDays), // lease_days
    ],
  });
  
  return txb;
}

// 格式化 SUI 金额
export function formatSuiAmount(amount: string): string {
  return (Number(amount) / 1000000000).toString();
}

// 更新NFT内容
export async function updateNFTContent(params: UpdateNFTContentParams): Promise<boolean> {
  try {
    console.log('更新NFT内容');
    // 这里是真实代码，应该调用合约更新NFT内容
    // 由于实际代码需要根据合约结构实现，这里只是一个示例框架
    
    // TODO: 实现实际的合约调用逻辑
    
    return true; // 返回true作为示例
  } catch (error) {
    console.error('更新NFT内容失败:', error);
    return false;
  }
}