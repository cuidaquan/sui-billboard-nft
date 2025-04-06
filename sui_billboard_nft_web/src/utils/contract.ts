import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SuiClient } from '@mysten/sui.js/client';
import { CONTRACT_CONFIG, NETWORKS, DEFAULT_NETWORK, USE_MOCK_DATA } from '../config/config';
import { BillboardNFT, AdSpace, PurchaseAdSpaceParams, UpdateNFTContentParams, RenewNFTParams, CreateAdSpaceParams, RemoveGameDevParams } from '../types';

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
    console.log('从链上获取可用广告位数据');
    
    // 直接从区块链获取广告位数据
    const client = createSuiClient();
    
    // 获取工厂对象，包含ad_spaces列表
    const factoryObject = await client.getObject({
      id: CONTRACT_CONFIG.FACTORY_OBJECT_ID,
      options: {
        showContent: true,
        showDisplay: true,
        showType: true,
      }
    });
    
    console.log('获取到工厂对象:', factoryObject);
    
    // 从工厂对象中直接解析广告位列表
    if (factoryObject.data?.content?.dataType === 'moveObject') {
      const fields = factoryObject.data.content.fields as any;
      console.log('工厂对象字段:', fields);
      
      // 检查广告位列表字段
      if (fields && fields.ad_spaces) {
        console.log('广告位列表数据结构:', JSON.stringify(fields.ad_spaces, null, 2));
        
        // 获取广告位条目
        let adSpaceEntries = [];
        if (Array.isArray(fields.ad_spaces)) {
          adSpaceEntries = fields.ad_spaces;
          console.log('获取到广告位条目数组:', adSpaceEntries.length);
          
          // 如果广告位数组为空，提前返回空状态
          if (adSpaceEntries.length === 0) {
            console.log('广告位列表为空数组，返回空状态提示');
            return [{
              id: '0x0',
              name: '您还没有创建广告位',
              description: '您尚未创建任何广告位，点击"创建广告位"按钮开始创建您的第一个广告位。',
              imageUrl: 'https://via.placeholder.com/300x250?text=创建您的第一个广告位',
              price: '0',
              duration: 365,
              dimension: { width: 300, height: 250 },
              owner: null,
              available: true,
              location: '无',
              isExample: true, // 标记为示例数据
              price_description: '点击创建您的第一个广告位'
            }];
          }
        } else {
          console.log('广告位数据不是数组，尝试从调试输出中提取');
          adSpaceEntries = [fields.ad_spaces];
        }
        
        // 获取所有广告位ID
        const allAdSpacePromises = [];
        
        // 遍历所有广告位条目
        for (const entry of adSpaceEntries) {
          try {
            // 获取广告位ID
            let adSpaceId: string | null = null;
            
            console.log('处理广告位条目:', JSON.stringify(entry, null, 2));
            
            // 处理不同的数据结构情况
            if (entry.ad_space_id) {
              // 直接包含ad_space_id的情况
              if (typeof entry.ad_space_id === 'string') {
                adSpaceId = entry.ad_space_id;
              } else if (entry.ad_space_id.id) {
                adSpaceId = entry.ad_space_id.id;
              }
            } else if (entry.fields) {
              // 包含在fields字段中的情况
              if (entry.fields.ad_space_id) {
                if (typeof entry.fields.ad_space_id === 'string') {
                  adSpaceId = entry.fields.ad_space_id;
                } else if (entry.fields.ad_space_id.id) {
                  adSpaceId = entry.fields.ad_space_id.id;
                }
              }
            }
            
            console.log('提取的广告位ID:', adSpaceId);
            
            if (adSpaceId) {
              // 异步获取广告位详情
              allAdSpacePromises.push(getAdSpaceById(adSpaceId).then(adSpace => {
                if (adSpace) {
                  console.log('成功获取广告位详情:', adSpace.id, '可用状态:', adSpace.available);
                  return adSpace;
                }
                return null;
              }));
            }
          } catch (err) {
            console.error('处理广告位条目出错:', err);
          }
        }
        
        // 等待所有广告位查询完成
        console.log('等待广告位查询完成...');
        const adSpacesResults = await Promise.all(allAdSpacePromises);
        const allAdSpaces = adSpacesResults.filter(Boolean) as AdSpace[];
        
        console.log('获取到所有广告位数量:', allAdSpaces.length);
        
        // 过滤出可用的广告位
        const availableAdSpaces = allAdSpaces.filter(adSpace => adSpace.available);
        
        console.log('可用广告位数量:', availableAdSpaces.length);
        
        if (availableAdSpaces.length === 0) {
          console.log('没有可用的广告位');
          // 如果没有可用的广告位，返回友好提示
          return [{
            id: '0x0',
            name: '暂无可用广告位',
            description: '目前没有可用的广告位，请稍后再来查看，或联系游戏开发者创建新的广告位。',
            imageUrl: 'https://via.placeholder.com/300x250?text=暂无可用广告位',
            price: '0',
            duration: 365, // 改为365天
            dimension: { width: 300, height: 250 },
            owner: null,
            available: false,
            location: '无',
            isExample: true, // 标记这是示例数据
            price_description: '价格为365天的租赁费用'
          }];
        }
        
        // 规范化广告位数据
        return availableAdSpaces.map(adSpace => ({
          ...adSpace,
          name: adSpace.name || `广告位 ${adSpace.id.substring(0, 8)}`,
          description: adSpace.description || `位于 ${adSpace.location || '未知位置'} 的广告位`,
          imageUrl: adSpace.imageUrl || `https://via.placeholder.com/${adSpace.dimension.width}x${adSpace.dimension.height}?text=${encodeURIComponent(adSpace.name || 'AdSpace')}`,
          duration: 365, // 确保都是365天
          price_description: '价格为365天的租赁费用'
        }));
      }
    }
    
    // 如果无法从链上获取数据，返回友好提示
    console.log('从链上未能获取到广告位数据');
    return [{
      id: '0x0',
      name: '数据加载失败',
      description: '无法从区块链获取广告位数据，请刷新页面重试。',
      imageUrl: 'https://via.placeholder.com/300x250?text=数据加载失败',
      price: '0',
      duration: 30,
      dimension: { width: 300, height: 250 },
      owner: null,
      available: false,
      location: '无',
      isExample: true // 标记这是示例数据
    }];
  } catch (error) {
    console.error('获取可用广告位失败:', error);
    // 出错时返回友好提示
    return [{
      id: '0x0',
      name: '数据加载失败',
      description: '加载广告位数据时发生错误，请刷新页面重试。',
      imageUrl: 'https://via.placeholder.com/300x250?text=加载失败',
      price: '0',
      duration: 30,
      dimension: { width: 300, height: 250 },
      owner: null,
      available: false,
      location: '无',
      isExample: true // 标记这是示例数据
    }];
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
  
  try {
    // 确保参数有效
    if (!params.factoryId || !params.gameId || !params.location || !params.size || !params.price || !params.clockId) {
      throw new Error('创建广告位参数不完整');
    }
    
    // 转换尺寸格式为规范化的格式
    let formattedSize = '';
    switch (params.size) {
      case '小':
        formattedSize = '128x128';
        break;
      case '中':
        formattedSize = '256x256';
        break;
      case '大':
        formattedSize = '512x512';
        break;
      case '超大':
        formattedSize = '1024x512';
        break;
      default:
        // 如果已经是正确格式，则直接使用
        if (/\d+x\d+/.test(params.size)) {
          formattedSize = params.size;
        } else {
          throw new Error(`尺寸格式无效: ${params.size}`);
        }
    }
    
    console.log('创建广告位参数:', {
      factoryId: params.factoryId,
      gameId: params.gameId,
      location: params.location,
      size: params.size,
      formattedSize,
      price: params.price,
      clockId: params.clockId
    });

    // 创建交易参数，验证是否所有值都符合要求
    try {
      // 创建工厂对象引用 - 确保使用正确的对象引用方式
      const factoryObj = txb.object(params.factoryId);
      
      // 获取Clock对象 - 使用正确的方法获取Clock对象
      const clockObj = txb.object(params.clockId);
      
      // 调用合约的 create_ad_space 函数
      const result = txb.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::create_ad_space`,
        arguments: [
          factoryObj,                 // Factory 对象
          txb.pure(params.gameId),    // 游戏ID
          txb.pure(params.location),  // 位置信息
          txb.pure(formattedSize),    // 尺寸信息 - 使用转换后的格式
          txb.pure(params.price),     // 每日价格
          clockObj,                   // Clock 对象
        ],
      });
      
      console.log('交易参数生成成功, moveCall result:', result);
    } catch (paramError) {
      console.error('交易参数生成失败:', paramError);
      throw new Error(`参数转换错误: ${paramError}`);
    }
    
    console.log('广告位交易创建成功');
    return txb;
  } catch (error) {
    console.error('创建广告位交易失败:', error);
    // 即使出错也返回交易块，让上层处理错误
    return txb;
  }
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

// 辅助函数：详细比较两个地址
export function compareAddresses(address1: string, address2: string): boolean {
  // 规范化两个地址
  const normalizedAddr1 = address1.toLowerCase();
  const normalizedAddr2 = address2.toLowerCase();
  
  const isEqual = normalizedAddr1 === normalizedAddr2;
  
  // 如果不相等，分析原因
  if (!isEqual) {
    // 长度比较
    if (normalizedAddr1.length !== normalizedAddr2.length) {
      console.log(`地址长度不同: ${normalizedAddr1.length} vs ${normalizedAddr2.length}`);
    }
    
    // 前缀比较
    if (!normalizedAddr1.startsWith('0x') || !normalizedAddr2.startsWith('0x')) {
      console.log(`地址前缀问题: "${normalizedAddr1.substring(0, 2)}" vs "${normalizedAddr2.substring(0, 2)}"`);
    }
    
    // 逐字符比较，找到第一个不同的位置
    for (let i = 0; i < Math.min(normalizedAddr1.length, normalizedAddr2.length); i++) {
      if (normalizedAddr1[i] !== normalizedAddr2[i]) {
        console.log(`地址第${i+1}个字符不同: "${normalizedAddr1[i]}" vs "${normalizedAddr2[i]}"`);
        console.log(`地址不同部分: "${normalizedAddr1.substring(i, i+10)}..." vs "${normalizedAddr2.substring(i, i+10)}..."`);
        break;
      }
    }
  }
  
  return isEqual;
}

export async function getGameDevsFromFactory(factoryId: string): Promise<string[]> {
  try {
    console.log('从链上获取工厂对象数据，factoryId:', factoryId);
    const client = createSuiClient();
    
    // 获取工厂对象
    const factoryObject = await client.getObject({
      id: factoryId,
      options: {
        showContent: true,
        showDisplay: true,
        showType: true,
      }
    });
    
    console.log('获取到工厂对象:', JSON.stringify(factoryObject, null, 2));
    
    // 从工厂对象中获取游戏开发者列表
    if (factoryObject.data?.content?.dataType === 'moveObject') {
      const fields = factoryObject.data.content.fields as any;
      console.log('工厂对象字段:', JSON.stringify(fields, null, 2));
      
      if (fields && fields.game_devs) {
        // 游戏开发者列表是向量类型
        const gameDevs = fields.game_devs as string[];
        console.log('原始游戏开发者列表:', gameDevs);
        
        // 确保所有地址都以小写形式存储，以便一致比较
        const normalizedGameDevs = gameDevs.map(dev => dev.toLowerCase());
        console.log('规范化后的游戏开发者列表:', normalizedGameDevs);
        
        return normalizedGameDevs;
      } else {
        console.warn('工厂对象中未找到game_devs字段，完整字段列表:', Object.keys(fields || {}));
      }
    } else {
      console.warn('工厂对象不是moveObject类型:', factoryObject.data?.content?.dataType);
    }
    
    console.warn('未能找到游戏开发者列表，工厂对象结构:', factoryObject);
    return [];
  } catch (error) {
    console.error('获取游戏开发者列表失败:', error);
    return [];
  }
}

// 从Factory中获取所有广告位
export async function getAllAdSpacesFromFactory(factoryId: string, developerAddress?: string): Promise<AdSpace[]> {
  try {
    // 生成一个唯一的请求ID，用于日志跟踪
    const requestId = new Date().getTime().toString();
    // 规范化开发者地址
    const normalizedDevAddress = developerAddress ? developerAddress.toLowerCase() : '';
    
    console.log(`[${requestId}] 从Factory获取所有广告位数据，开发者: ${normalizedDevAddress || '未指定'}`);
    const client = createSuiClient();
    
    // 获取工厂对象
    const factoryObject = await client.getObject({
      id: factoryId,
      options: {
        showContent: true,
        showDisplay: true,
        showType: true,
      }
    });
    
    // 从工厂对象中直接获取广告位列表和创建者信息
    if (factoryObject.data?.content?.dataType === 'moveObject') {
      const fields = factoryObject.data.content.fields as any;
      console.log(`[${requestId}] Factory对象字段列表:`, Object.keys(fields || {}));
      
      // 在Factory处理过程中增加新的日志和格式处理
      console.log(`[${requestId}] Factory原始字段:`, fields);

      // 检查并打印ad_spaces的详细内容
      if (fields && fields.ad_spaces) {
        console.log(`[${requestId}] ad_spaces类型:`, typeof fields.ad_spaces);
        console.log(`[${requestId}] ad_spaces是否数组:`, Array.isArray(fields.ad_spaces));
        console.log(`[${requestId}] ad_spaces详细内容:`, JSON.stringify(fields.ad_spaces));
        
        // 特殊处理ad_spaces的格式
        const adSpacesEntries = Array.isArray(fields.ad_spaces) ? fields.ad_spaces : 
          (typeof fields.ad_spaces === 'object' ? [fields.ad_spaces] : []);
        
        console.log(`[${requestId}] 处理后的ad_spaces条目总数:`, adSpacesEntries.length);
        
        // 详细记录每个条目的类型和结构
        adSpacesEntries.forEach((entry: any, index: number) => {
          console.log(`[${requestId}] 条目[${index}]类型:`, typeof entry);
          console.log(`[${requestId}] 条目[${index}]内容:`, entry);
          
          // 检查创建者字段的存在方式
          let creator = null;
          if (entry.creator) {
            creator = entry.creator;
          } else if (entry.fields && entry.fields.creator) {
            creator = entry.fields.creator;
          }
          
          console.log(`[${requestId}] 条目[${index}]创建者:`, creator);
        });
        
        // 详细记录每个条目的创建者地址，便于调试
        console.log(`[${requestId}] ==== 广告位创建者地址列表 ====`);
        adSpacesEntries.forEach((entry: any, index: number) => {
          // 特殊处理不同格式的创建者字段
          let creator = null;
          if (entry.creator) {
            creator = entry.creator;
          } else if (entry.fields && entry.fields.creator) {
            creator = entry.fields.creator;
          }
          
          if (creator) {
            const creatorStr = typeof creator === 'string' ? creator : 
              (typeof creator === 'object' ? JSON.stringify(creator) : String(creator));
            console.log(`[${requestId}] 条目[${index}] 创建者: ${creatorStr}`);
          } else {
            console.log(`[${requestId}] 条目[${index}] 创建者字段不存在或格式不正确:`, entry);
          }
        });
        
        // 过滤出当前开发者创建的广告位，适应多种可能的格式
        const devAdSpaceEntries = adSpacesEntries.filter((entry: any) => {
          // 如果未指定开发者地址，则返回所有广告位
          if (!normalizedDevAddress) {
            return true;
          }
          
          // 提取创建者字段，考虑多种可能的结构
          let creator = null;
          if (entry.creator) {
            creator = entry.creator;
          } else if (entry.fields && entry.fields.creator) {
            creator = entry.fields.creator;
          }
          
          if (!creator) {
            console.log(`[${requestId}] 跳过无效条目 (无法找到创建者字段):`, entry);
            return false;
          }
          
          // 规范化创建者地址为小写
          const entryCreator = typeof creator === 'string' ? creator.toLowerCase() : 
            (typeof creator === 'object' ? JSON.stringify(creator).toLowerCase() : String(creator).toLowerCase());
          
          console.log(`[${requestId}] 详细比较:
            - 原始创建者数据: ${typeof creator === 'object' ? JSON.stringify(creator) : creator}
            - 处理后的创建者: ${entryCreator}
            - 规范化的查询地址: ${normalizedDevAddress}
            - 地址类型: ${typeof creator}
          `);
          
          // 测试特定地址的匹配情况
          if (normalizedDevAddress === "0x0020a8a7006d0f1eee952994192f67e41afabbb971678ac44eb068955193c6a4") {
            console.log(`[${requestId}] 正在与已知地址0x0020a...进行比较`);
            if (entryCreator.includes("0x0020a8a7006d0f1eee952994192f67e41afabbb971678ac44eb068955193c6a4")) {
              console.log(`[${requestId}] 特殊匹配成功!`);
              return true;
            }
          }
          
          // 尝试多种可能的匹配方式
          const exactMatch = entryCreator === normalizedDevAddress;
          const containsMatch = entryCreator.includes(normalizedDevAddress) || normalizedDevAddress.includes(entryCreator);
          
          console.log(`[${requestId}] 匹配结果: 
            - 完全匹配: ${exactMatch}
            - 包含匹配: ${containsMatch}
          `);
          
          return exactMatch || containsMatch;
        });

        // 其余代码保持不变
        console.log(`[${requestId}] 开发者创建的广告位条目数:`, devAdSpaceEntries.length);
        
        if (devAdSpaceEntries.length === 0) {
          console.log(`[${requestId}] 开发者没有创建过广告位`);
          // 返回一个友好的提示广告位
          return [{
            id: '0x0',
            name: '您还没有创建广告位',
            description: '您尚未创建任何广告位，点击"创建广告位"按钮开始创建您的第一个广告位。',
            imageUrl: 'https://via.placeholder.com/300x250?text=创建您的第一个广告位',
            price: '100000000', // 0.1 SUI
            duration: 30,
            dimension: { width: 300, height: 250 },
            owner: null,
            available: true,
            location: '示例位置',
            isExample: true // 标记这是示例数据
          }];
        }
        
        // 获取开发者创建的广告位详细信息
        const devAdSpaces: AdSpace[] = [];
        
        for (const entry of devAdSpaceEntries as any[]) {
          try {
            // 确保entry包含ad_space_id字段
            if (!entry.ad_space_id || !entry.ad_space_id.id) {
              console.error(`[${requestId}] 广告位条目缺少ad_space_id字段:`, entry);
              continue;
            }
            
            const adSpaceId = entry.ad_space_id.id;
            console.log(`[${requestId}] 获取广告位详细信息, ID:`, adSpaceId);
            
            // 尝试直接通过ID获取广告位信息
            const adSpace = await getAdSpaceById(adSpaceId);
            
            if (adSpace) {
              // 添加创建者信息到广告位，以便调试
              (adSpace as any).creator = entry.creator;
              
              devAdSpaces.push(adSpace);
              console.log(`[${requestId}] 成功添加广告位:`, adSpace.id);
            } else {
              // 如果直接获取失败，尝试原有的方式
              console.log(`[${requestId}] 直接获取广告位失败，尝试原有方式:`, adSpaceId);
              
              // 获取广告位对象，使用相同的选项强制刷新
              const adSpaceObject = await client.getObject({
                id: adSpaceId,
                options: {
                  showContent: true,
                  showDisplay: true,
                  showBcs: false,
                  showOwner: true,
                  showPreviousTransaction: true,
                  showStorageRebate: true,
                }
              });
              
              if (adSpaceObject.data?.content?.dataType === 'moveObject') {
                const adSpaceFields = adSpaceObject.data.content.fields as any;
                console.log(`[${requestId}] 广告位对象字段:`, Object.keys(adSpaceFields || {}));
                console.log(`[${requestId}] 广告位详细数据:`, adSpaceFields);
                
                // 安全地获取尺寸信息
                let width = 300, height = 250;
                if (adSpaceFields.size && typeof adSpaceFields.size === 'string' && adSpaceFields.size.includes('x')) {
                  const sizeParts = adSpaceFields.size.split('x');
                  if (sizeParts.length === 2) {
                    width = parseInt(sizeParts[0]) || 300;
                    height = parseInt(sizeParts[1]) || 250;
                  }
                }
                
                // 构建广告位数据
                const adSpace: AdSpace = {
                  id: adSpaceId,
                  name: adSpaceFields.game_id ? `${adSpaceFields.game_id} 广告位` : `广告位 ${adSpaceId.substring(0, 8)}`,
                  description: adSpaceFields.location ? `位于 ${adSpaceFields.location} 的广告位` : '广告位详情',
                  imageUrl: `https://via.placeholder.com/${width}x${height}?text=${adSpaceFields.game_id || 'AdSpace'}`,
                  price: adSpaceFields.fixed_price || '0',
                  duration: 30, // 默认30天
                  dimension: {
                    width,
                    height,
                  },
                  owner: null, // 初始没有所有者
                  available: adSpaceFields.is_available !== undefined ? adSpaceFields.is_available : true,
                  location: adSpaceFields.location || '未知位置',
                };
                
                // 添加创建者信息到广告位，以便调试
                (adSpace as any).creator = entry.creator;
                
                devAdSpaces.push(adSpace);
                console.log(`[${requestId}] 成功添加广告位:`, adSpace.id);
              } else {
                console.warn(`[${requestId}] 获取的广告位不是Move对象类型:`, adSpaceObject.data?.content?.dataType);
              }
            }
          } catch (err) {
            console.error(`[${requestId}] 获取单个广告位详情失败:`, err);
            // 继续处理下一个广告位
          }
        }
        
        console.log(`[${requestId}] 完成广告位数据加载，共找到 ${devAdSpaces.length} 个广告位`);
        
        if (devAdSpaces.length === 0) {
          console.log(`[${requestId}] 获取到的有效广告位数量为0，返回提示广告位`);
          return [{
            id: '0x0',
            name: '无可用广告位',
            description: '无法获取您创建的广告位详细信息，请确保合约数据正确。',
            imageUrl: 'https://via.placeholder.com/300x250?text=无可用广告位',
            price: '0',
            duration: 30,
            dimension: { width: 300, height: 250 },
            owner: null,
            available: false,
            location: '无',
            isExample: true
          }];
        }
        
        return devAdSpaces;
      }
    }
    
    console.warn(`[${requestId}] 未找到广告位列表，Factory对象结构:`, factoryObject);
    return [{
      id: '0x0',
      name: '无法从合约获取数据',
      description: '无法从Factory合约获取广告位数据，请稍后重试。',
      imageUrl: 'https://via.placeholder.com/300x250?text=数据获取失败',
      price: '0',
      duration: 30,
      dimension: { width: 300, height: 250 },
      owner: null,
      available: false,
      location: '无',
      isExample: true
    }];
  } catch (error) {
    // 这里的错误日志不使用requestId，因为它可能发生在requestId创建之前
    console.error('获取Factory广告位列表失败:', error);
    return [{
      id: '0x0',
      name: '数据加载错误',
      description: '获取广告位数据时发生错误，请稍后重试。',
      imageUrl: 'https://via.placeholder.com/300x250?text=加载错误',
      price: '0',
      duration: 30,
      dimension: { width: 300, height: 250 },
      owner: null,
      available: false,
      location: '无',
      isExample: true
    }];
  }
}

// 通过ID直接获取广告位信息
export async function getAdSpaceById(adSpaceId: string): Promise<AdSpace | null> {
  try {
    console.log(`通过ID获取广告位信息: ${adSpaceId}`);
    
    if (!adSpaceId.startsWith('0x')) {
      console.error('广告位ID格式无效:', adSpaceId);
      return null;
    }
    
    const client = createSuiClient();
    
    // 获取广告位对象
    const adSpaceObject = await client.getObject({
      id: adSpaceId,
      options: {
        showContent: true,
        showDisplay: true,
        showBcs: false,
        showOwner: true,
        showPreviousTransaction: true,
      }
    });
    
    console.log('获取到广告位对象:', adSpaceObject);
    
    if (adSpaceObject.data?.content?.dataType === 'moveObject') {
      const adSpaceFields = adSpaceObject.data.content.fields as any;
      console.log('广告位对象字段:', Object.keys(adSpaceFields || {}));
      console.log('广告位详细内容:', adSpaceFields);
      
      // 安全地获取尺寸信息
      let width = 300, height = 250;
      if (adSpaceFields.size && typeof adSpaceFields.size === 'string' && adSpaceFields.size.includes('x')) {
        const sizeParts = adSpaceFields.size.split('x');
        if (sizeParts.length === 2) {
          width = parseInt(sizeParts[0]) || 300;
          height = parseInt(sizeParts[1]) || 250;
        }
      }
      
      // 构建广告位数据
      const adSpace: AdSpace = {
        id: adSpaceId,
        name: adSpaceFields.game_id ? `${adSpaceFields.game_id} 广告位` : `广告位 ${adSpaceId.substring(0, 8)}`,
        description: adSpaceFields.location ? `位于 ${adSpaceFields.location} 的广告位` : '广告位详情',
        imageUrl: `https://via.placeholder.com/${width}x${height}?text=${adSpaceFields.game_id || 'AdSpace'}`,
        price: adSpaceFields.fixed_price || '0',
        duration: 30, // 默认30天
        dimension: {
          width,
          height,
        },
        owner: null, // 初始没有所有者
        available: adSpaceFields.is_available !== undefined ? adSpaceFields.is_available : true,
        location: adSpaceFields.location || '未知位置',
      };
      
      return adSpace;
    } else {
      console.warn('获取的广告位不是Move对象类型:', adSpaceObject.data?.content?.dataType);
      return null;
    }
  } catch (error) {
    console.error('通过ID获取广告位失败:', error);
    return null;
  }
}

// 获取游戏开发者创建的广告位列表
export async function getCreatedAdSpaces(developerAddress: string): Promise<AdSpace[]> {
  try {
    console.log('获取开发者创建的广告位列表, 开发者地址:', developerAddress);
    
    if (!developerAddress) {
      console.error('开发者地址为空');
      throw new Error('Developer address is required');
    }
    
    // 从链上获取当前广告位数据
    console.log('尝试直接从区块链上获取开发者广告位...');
    const client = createSuiClient();
    
    // 获取工厂对象，包含ad_spaces列表
    const factoryObject = await client.getObject({
      id: CONTRACT_CONFIG.FACTORY_OBJECT_ID,
      options: {
        showContent: true,
        showDisplay: true,
        showType: true,
      }
    });
    
    console.log('获取到工厂对象:', factoryObject);
    
    // 从工厂对象中直接解析广告位列表
    if (factoryObject.data?.content?.dataType === 'moveObject') {
      const fields = factoryObject.data.content.fields as any;
      console.log('工厂对象字段:', fields);
      
      // 检查控制台输出中的ad_spaces_id字段
      if (fields && fields.ad_spaces) {
        console.log('广告位列表数据结构:', JSON.stringify(fields.ad_spaces, null, 2));
        
        // 获取广告位条目
        let adSpaceEntries = [];
        if (Array.isArray(fields.ad_spaces)) {
          adSpaceEntries = fields.ad_spaces;
          console.log('获取到广告位条目数组:', adSpaceEntries.length);
          
          // 如果广告位数组为空，提前返回空状态
          if (adSpaceEntries.length === 0) {
            console.log('广告位列表为空数组，返回空状态提示');
            return [{
              id: '0x0',
              name: '您还没有创建广告位',
              description: '您尚未创建任何广告位，点击"创建广告位"按钮开始创建您的第一个广告位。',
              imageUrl: 'https://via.placeholder.com/300x250?text=创建您的第一个广告位',
              price: '0',
              duration: 365,
              dimension: { width: 300, height: 250 },
              owner: null,
              available: true,
              location: '无',
              isExample: true, // 标记为示例数据
              price_description: '点击创建您的第一个广告位'
            }];
          }
        } else {
          console.log('广告位数据不是数组，尝试从调试输出中提取');
          adSpaceEntries = [fields.ad_spaces];
        }
        
        // 获取广告位ID列表
        const myAdSpacePromises = [];
        
        // 规范化开发者地址
        const normalizedDevAddress = developerAddress.toLowerCase();
        
        // 遍历所有广告位条目
        for (const entry of adSpaceEntries) {
          try {
            console.log('处理广告位条目:', entry);
            
            // 确认条目中的创建者字段匹配当前开发者
            let creator = null;
            if (entry.creator) {
              creator = entry.creator;
            } else if (entry.fields && entry.fields.creator) {
              creator = entry.fields.creator;
            }
            
            const creatorStr = typeof creator === 'string' ? creator.toLowerCase() : 
              (typeof creator === 'object' ? JSON.stringify(creator).toLowerCase() : String(creator).toLowerCase());
              
            console.log('比较创建者:', creatorStr, '与开发者:', normalizedDevAddress);
            
            const isMatch = creatorStr === normalizedDevAddress || 
                            creatorStr.includes(normalizedDevAddress) || 
                            normalizedDevAddress.includes(creatorStr);
                            
            if (isMatch) {
              // 如果匹配，获取广告位ID
              let adSpaceId: string | null = null;
              
              // 检查各种可能的路径以获取ad_space_id
              if (entry.ad_space_id) {
                // 直接访问ad_space_id
                if (typeof entry.ad_space_id === 'string') {
                  adSpaceId = entry.ad_space_id;
                } else if (entry.ad_space_id.id) {
                  adSpaceId = entry.ad_space_id.id;
                } else if (typeof entry.ad_space_id === 'object') {
                  adSpaceId = JSON.stringify(entry.ad_space_id);
                }
              } else if (entry.fields) {
                // 通过fields访问
                if (entry.fields.ad_space_id) {
                  if (typeof entry.fields.ad_space_id === 'string') {
                    adSpaceId = entry.fields.ad_space_id;
                  } else if (entry.fields.ad_space_id.id) {
                    adSpaceId = entry.fields.ad_space_id.id;
                  } else if (typeof entry.fields.ad_space_id === 'object') {
                    // 尝试直接获取对象中的值
                    const objStr = JSON.stringify(entry.fields.ad_space_id);
                    console.log('广告位ID对象内容:', objStr);
                    
                    // 尝试从JSON字符串中提取ID
                    const idMatch = objStr.match(/"id"\s*:\s*"(0x[a-fA-F0-9]+)"/);
                    if (idMatch && idMatch[1]) {
                      adSpaceId = idMatch[1];
                    }
                  }
                }
              }
              
              console.log('找到匹配的广告位ID:', adSpaceId);
              
              if (adSpaceId) {
                // 如果ID是字符串形式，但包装在引号中，移除引号
                if (typeof adSpaceId === 'string' && adSpaceId.startsWith('"') && adSpaceId.endsWith('"')) {
                  adSpaceId = adSpaceId.substring(1, adSpaceId.length - 1);
                }
                
                // 确保ID以0x开头
                if (typeof adSpaceId === 'string' && adSpaceId.startsWith('0x')) {
                  // 异步获取广告位详情
                  myAdSpacePromises.push(getAdSpaceById(adSpaceId).then(adSpace => {
                    if (adSpace) {
                      console.log('成功获取广告位详情:', adSpace.id);
                      return adSpace;
                    }
                    return null;
                  }).catch(err => {
                    console.error(`获取广告位 ${adSpaceId} 详情失败:`, err);
                    return null;
                  }));
                } else {
                  console.warn('解析出的广告位ID格式不正确:', adSpaceId);
                }
              }
            }
          } catch (err) {
            console.error('处理广告位条目出错:', err);
          }
        }
        
        // 等待所有广告位查询完成
        console.log('等待广告位查询完成...');
        const adSpacesResults = await Promise.all(myAdSpacePromises);
        const validAdSpaces = adSpacesResults.filter(Boolean) as AdSpace[];
        
        console.log('获取到有效广告位数量:', validAdSpaces.length);
        
        // 如果没有找到任何广告位，返回默认广告位
        if (validAdSpaces.length === 0) {
          console.log('未找到开发者创建的广告位，返回空状态提示广告位');
          return [{
            id: '0x0',
            name: '您还没有创建广告位',
            description: '您尚未创建任何广告位，点击"创建广告位"按钮开始创建您的第一个广告位。',
            imageUrl: 'https://via.placeholder.com/300x250?text=创建您的第一个广告位',
            price: '0',
            duration: 365,
            dimension: { width: 300, height: 250 },
            owner: null,
            available: true,
            location: '无',
            isExample: true, // 标记为示例数据
            price_description: '点击创建您的第一个广告位'
          }];
        }
        
        // 规范化广告位数据
        return validAdSpaces.map(adSpace => ({
          ...adSpace,
          name: adSpace.name || `广告位 ${adSpace.id.substring(0, 8)}`,
          description: adSpace.description || `位于 ${adSpace.location || '未知位置'} 的广告位`,
          imageUrl: adSpace.imageUrl || `https://via.placeholder.com/${adSpace.dimension.width}x${adSpace.dimension.height}?text=${encodeURIComponent(adSpace.name || 'AdSpace')}`,
          price_description: '价格为365天的租赁费用' // 添加价格描述说明
        }));
      }
    }
    
    // 如果无法从链上获取数据，返回默认广告位
    console.log('从链上未能获取到广告位数据，返回空状态提示');
    return [{
      id: '0x0',
      name: '无法获取广告位数据',
      description: '无法从区块链获取广告位数据，请稍后刷新页面重试。',
      imageUrl: 'https://via.placeholder.com/300x250?text=无法获取数据',
      price: '0',
      duration: 365,
      dimension: { width: 300, height: 250 },
      owner: null,
      available: false,
      location: '无',
      isExample: true, // 标记为示例数据
      price_description: '请稍后刷新页面重试'
    }];
  } catch (error) {
    console.error('获取开发者广告位列表失败:', error);
    // 返回一个错误提示广告位
    return [{
      id: '0x0',
      name: '获取广告位失败',
      description: '获取广告位数据时发生错误，请稍后刷新页面重试。',
      imageUrl: 'https://via.placeholder.com/300x250?text=加载出错',
      price: '0',
      duration: 365,
      dimension: { width: 300, height: 250 },
      owner: null,
      available: false,
      location: '无',
      isExample: true, // 标记为示例数据
      price_description: '请稍后刷新页面重试'
    }];
  }
}

// 移除游戏开发者的交易
export function removeGameDevTx(params: RemoveGameDevParams): TransactionBlock {
  const txb = new TransactionBlock();
  
  // 调用合约的 remove_game_dev 函数
  txb.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::remove_game_dev`,
    arguments: [
      txb.object(params.factoryId),  // Factory 对象
      txb.pure(params.developer),    // 开发者地址
    ],
  });
  
  return txb;
}

// 创建删除广告位的交易
export function deleteAdSpaceTx(params: { factoryId: string, adSpaceId: string }): TransactionBlock {
  console.log('创建删除广告位交易:', params);
  const { factoryId, adSpaceId } = params;
  
  const txb = new TransactionBlock();
  txb.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::delete_ad_space`,
    arguments: [
      txb.object(factoryId),
      txb.object(adSpaceId)
    ],
  });
  
  return txb;
}