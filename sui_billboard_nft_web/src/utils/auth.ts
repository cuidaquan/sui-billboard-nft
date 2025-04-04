import { SuiClient as SuiJsClient } from '@mysten/sui.js/client';
import { type SuiClient as DappKitSuiClient } from '@mysten/sui/client';
import { UserRole } from '../types';
import { CONTRACT_CONFIG } from '../config/config';

/**
 * 检查用户是否拥有平台管理员权限（PlatformCap对象）
 * @param client SuiClient实例
 * @param address 用户钱包地址
 * @returns 是否拥有管理员权限
 */
export async function checkIsAdmin(client: SuiJsClient | DappKitSuiClient, address: string): Promise<boolean> {
  try {
    // 查询用户拥有的对象
    const { data: objects } = await client.getOwnedObjects({
      owner: address,
      options: { showType: true },
      filter: {
        StructType: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::PlatformCap`
      }
    });

    // 如果找到至少一个PlatformCap对象，则用户是管理员
    return objects.length > 0;
  } catch (error) {
    console.error('检查管理员权限失败:', error);
    return false;
  }
}

/**
 * 检查用户是否拥有游戏开发者权限（GameDevCap对象）
 * @param client SuiClient实例
 * @param address 用户钱包地址
 * @returns 是否拥有游戏开发者权限
 */
export async function checkIsGameDev(client: SuiJsClient | DappKitSuiClient, address: string): Promise<boolean> {
  try {
    // 查询用户拥有的对象
    const { data: objects } = await client.getOwnedObjects({
      owner: address,
      options: { showType: true },
      filter: {
        StructType: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::GameDevCap`
      }
    });

    // 如果找到至少一个GameDevCap对象，则用户是游戏开发者
    return objects.length > 0;
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