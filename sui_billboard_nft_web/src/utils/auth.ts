import { SuiClient as SuiJsClient } from '@mysten/sui.js/client';
import { type SuiClient as DappKitSuiClient } from '@mysten/sui/client';
import { UserRole } from '../types';
import { CONTRACT_CONFIG } from '../config/config';
import { TransactionBlock } from '@mysten/sui.js/transactions';

/**
 * 检查用户是否拥有平台管理员权限
 * @param client SuiClient实例
 * @param address 用户钱包地址（用于发送交易）
 * @returns 是否拥有管理员权限
 */
export async function checkIsAdmin(client: SuiJsClient | DappKitSuiClient, address: string): Promise<boolean> {
  try {
    const txb = new TransactionBlock();
    
    // 调用合约的is_admin函数
    txb.moveCall({
      target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::is_admin`,
      arguments: [
        txb.object(CONTRACT_CONFIG.FACTORY_OBJECT_ID)
      ],
    });
    
    const result = await client.devInspectTransactionBlock({
      transactionBlock: txb.serialize(),
      sender: address // 使用当前用户地址作为发送者
    });
    
    if (result.effects.status.status === 'failure') {
      throw new Error(result.effects.status.error || '检查管理员权限失败');
    }
    
    // 从返回值中获取结果
    if (result.results && result.results[0] && result.results[0].returnValues) {
      const returnValue = result.results[0].returnValues[0];
      // Move合约中的bool类型会被序列化为[0]或[1]
      if (Array.isArray(returnValue) && returnValue.length > 0) {
        const boolValue = Number(returnValue[0]);
        return boolValue === 1;
      }
    }
    
    return false;
  } catch (error) {
    console.error('检查管理员权限失败:', error);
    return false;
  }
}

/**
 * 检查用户是否拥有游戏开发者权限
 * @param client SuiClient实例
 * @param address 用户钱包地址（用于发送交易）
 * @returns 是否拥有游戏开发者权限
 */
export async function checkIsGameDev(client: SuiJsClient | DappKitSuiClient, address: string): Promise<boolean> {
  try {
    const txb = new TransactionBlock();
    
    // 调用合约的is_game_dev函数
    txb.moveCall({
      target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::is_game_dev`,
      arguments: [
        txb.object(CONTRACT_CONFIG.FACTORY_OBJECT_ID)
      ],
    });
    
    const result = await client.devInspectTransactionBlock({
      transactionBlock: txb.serialize(),
      sender: address // 使用当前用户地址作为发送者
    });
    
    if (result.effects.status.status === 'failure') {
      throw new Error(result.effects.status.error || '检查游戏开发者权限失败');
    }
    
    // 从返回值中获取结果
    if (result.results && result.results[0] && result.results[0].returnValues) {
      const returnValue = result.results[0].returnValues[0];
      // Move合约中的bool类型会被序列化为[0]或[1]
      if (Array.isArray(returnValue) && returnValue.length > 0) {
        const boolValue = Number(returnValue[0]);
        return boolValue === 1;
      }
    }
    
    return false;
  } catch (error) {
    console.error('检查游戏开发者权限失败:', error);
    return false;
  }
}

/**
 * 检查用户角色
 * @param client SuiClient实例
 * @param address 用户钱包地址
 * @returns 用户角色
 */
export async function checkUserRole(client: SuiJsClient | DappKitSuiClient, address: string): Promise<UserRole> {
  // 首先检查是否是管理员
  const isAdmin = await checkIsAdmin(client, address);
  if (isAdmin) {
    return UserRole.ADMIN;
  }
  
  // 然后检查是否是游戏开发者
  const isGameDev = await checkIsGameDev(client, address);
  if (isGameDev) {
    return UserRole.GAME_DEV;
  }
  
  // 默认为普通用户
  return UserRole.USER;
}