import { Transaction } from '@mysten/sui/transactions';
import { CONTRACT_CONFIG, USE_MOCK_DATA } from '../config/config';
import { 
  PurchaseAdSpaceParams, 
  UpdateNFTContentParams, 
  RenewNFTParams, 
  CreateAdSpaceParams,
  RemoveGameDevParams 
} from '../types';

/**
 * 创建购买广告位交易
 */
export function createPurchaseAdSpaceTx(params: PurchaseAdSpaceParams) {
  const tx = new Transaction();
  
  if (USE_MOCK_DATA) {
    console.log('使用模拟交易数据');
    return tx;
  }
  
  console.log('构建购买广告位交易', params);
  
  // 获取Clock对象
  const clockObj = tx.object(CONTRACT_CONFIG.CLOCK_ID);
  
  // 创建SUI支付对象
  const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(params.price)]);
  
  // 准备blob_id参数
  const blobIdBytes = params.blobId 
    ? tx.pure.string(params.blobId)
    : tx.pure.string('');
  
  // 调用合约的purchase_ad_space函数
  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::purchase_ad_space`,
    arguments: [
      tx.object(CONTRACT_CONFIG.FACTORY_OBJECT_ID),
      tx.object(params.adSpaceId),
      payment,
      tx.pure.string(params.brandName),
      tx.pure.string(params.contentUrl),
      tx.pure.string(params.projectUrl),
      tx.pure.u64(params.leaseDays),
      clockObj,
      tx.pure.u64(params.startTime || 0),
      blobIdBytes,
      tx.pure.string(params.storageSource || 'none')
    ],
  });
  
  return tx;
}

/**
 * 创建更新广告内容交易
 */
export function createUpdateAdContentTx(params: UpdateNFTContentParams) {
  const tx = new Transaction();
  
  if (USE_MOCK_DATA) {
    console.log('使用模拟交易数据');
    return tx;
  }
  
  console.log('构建更新广告内容交易');
  
  // 准备blob_id参数
  const blobIdBytes = params.blobId 
    ? tx.pure.string(params.blobId)
    : tx.pure.string('');
  
  // 调用合约的update_ad_content函数
  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::update_ad_content`,
    arguments: [
      tx.object(params.nftId),
      tx.pure.string(params.contentUrl),
      blobIdBytes,
      tx.pure.string(params.storageSource || 'none'),
      tx.object(CONTRACT_CONFIG.CLOCK_ID)
    ],
  });
  
  return tx;
}

/**
 * 创建续租交易
 */
export function createRenewLeaseTx(params: RenewNFTParams) {
  const tx = new Transaction();
  
  if (USE_MOCK_DATA) {
    console.log('使用模拟交易数据');
    return tx;
  }
  
  console.log('构建续租交易，参数:', params);
  
  // 确保价格是字符串，并检查是否需要转换单位
  let priceAmount = params.price;
  if (Number(priceAmount) < 1000000) {
    priceAmount = (Number(priceAmount) * 1000000000).toString();
    console.log('价格单位转换:', params.price, '->', priceAmount);
  }
  
  // 创建SUI支付对象
  const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(priceAmount)]);
  
  // 调用合约的renew_lease函数
  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::renew_lease`,
    arguments: [
      tx.object(CONTRACT_CONFIG.FACTORY_OBJECT_ID),
      tx.object(params.adSpaceId),
      tx.object(params.nftId),
      payment,
      tx.pure.u64(params.leaseDays),
      tx.object(CONTRACT_CONFIG.CLOCK_ID)
    ],
  });
  
  return tx;
}

/**
 * 创建广告位交易
 */
export function createAdSpaceTx(params: CreateAdSpaceParams) {
  const tx = new Transaction();
  
  if (USE_MOCK_DATA) {
    console.log('使用模拟交易数据');
    return tx;
  }
  
  // 调用合约的create_ad_space函数
  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::create_ad_space`,
    arguments: [
      tx.object(CONTRACT_CONFIG.FACTORY_OBJECT_ID),
      tx.pure.string(params.gameId),
      tx.pure.string(params.location),
      tx.pure.string(params.size),
      tx.pure.string(params.price),
      tx.object(CONTRACT_CONFIG.CLOCK_ID)
    ],
  });
  
  return tx;
}

/**
 * 创建注册游戏开发者交易
 */
export function createRegisterGameDevTx(params: { developer: string }) {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::register_game_dev`,
    arguments: [
      tx.object(CONTRACT_CONFIG.FACTORY_OBJECT_ID),
      tx.pure.address(params.developer)
    ],
  });
  
  return tx;
}

/**
 * 创建移除游戏开发者交易
 */
export function createRemoveGameDevTx(params: RemoveGameDevParams) {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::remove_game_dev`,
    arguments: [
      tx.object(params.factoryId),
      tx.pure.address(params.developer)
    ],
  });
  
  return tx;
}

/**
 * 创建更新平台分成比例交易
 */
export function createUpdatePlatformRatioTx(params: { ratio: number }) {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::update_platform_ratio`,
    arguments: [
      tx.object(CONTRACT_CONFIG.FACTORY_OBJECT_ID),
      tx.pure.u64(params.ratio)
    ],
  });
  
  return tx;
}

/**
 * 创建更新广告位价格交易
 */
export function createUpdateAdSpacePriceTx(params: { adSpaceId: string, price: string }) {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::update_ad_space_price`,
    arguments: [
      tx.object(params.adSpaceId),
      tx.pure.string(params.price)
    ],
  });
  
  return tx;
}

/**
 * 创建删除广告位交易
 */
export function createDeleteAdSpaceTx(params: { adSpaceId: string }) {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::delete_ad_space`,
    arguments: [
      tx.object(CONTRACT_CONFIG.FACTORY_OBJECT_ID),
      tx.object(params.adSpaceId)
    ],
  });
  
  return tx;
} 