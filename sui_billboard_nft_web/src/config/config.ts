import { getFullnodeUrl } from '@mysten/sui/client';

/**
 * 支持的网络类型定义
 * - mainnet: Sui主网
 * - testnet: Sui测试网
 * - devnet: Sui开发网
 * - localnet: 本地开发网络
 */
export type NetworkName = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

/**
 * 网络配置接口定义
 * 每个网络都包含这些基本信息
 */
export interface NetworkConfig {
  /** 网络显示名称 */
  name: string;
  /** 全节点RPC URL */
  fullNodeUrl: string;
  /** 水龙头URL (可选，主网没有) */
  faucetUrl?: string;
  /** 区块浏览器URL */
  explorerUrl: string;
}

/**
 * 网络配置对象
 * 包含了不同网络的连接信息
 */
export const NETWORKS: Record<NetworkName, NetworkConfig> = {
  mainnet: {
    name: '主网',
    fullNodeUrl: getFullnodeUrl('mainnet'),
    explorerUrl: 'https://suiexplorer.com'
  },
  testnet: {
    name: '测试网',
    fullNodeUrl: getFullnodeUrl('testnet'),
    faucetUrl: 'https://faucet.testnet.sui.io',
    explorerUrl: 'https://suiexplorer.com/?network=testnet'
  },
  devnet: {
    name: '开发网',
    fullNodeUrl: getFullnodeUrl('devnet'),
    faucetUrl: 'https://faucet.devnet.sui.io',
    explorerUrl: 'https://suiexplorer.com/?network=devnet'
  },
  localnet: {
    name: '本地网络',
    fullNodeUrl: 'http://localhost:9000',
    faucetUrl: 'http://localhost:9123/gas',
    explorerUrl: 'https://suiexplorer.com/?network=local'
  }
};

/**
 * 默认网络设置
 * 可通过环境变量 REACT_APP_DEFAULT_NETWORK 修改
 */
export const DEFAULT_NETWORK: NetworkName = 
  (process.env.REACT_APP_DEFAULT_NETWORK as NetworkName) || 'testnet';

/**
 * 合约配置
 * 包含了合约的关键参数
 */
export const CONTRACT_CONFIG = {
  /**
   * 合约包ID
   * 可通过环境变量 REACT_APP_CONTRACT_PACKAGE_ID 修改
   */
  PACKAGE_ID: process.env.REACT_APP_CONTRACT_PACKAGE_ID || '0x123...',
  
  /**
   * 合约模块名称
   * 可通过环境变量 REACT_APP_CONTRACT_MODULE_NAME 修改
   */
  MODULE_NAME: process.env.REACT_APP_CONTRACT_MODULE_NAME || 'billboard_nft',
  
  /**
   * 广告位工厂对象ID
   * 可通过环境变量 REACT_APP_FACTORY_OBJECT_ID 修改
   */
  FACTORY_OBJECT_ID: process.env.REACT_APP_FACTORY_OBJECT_ID || '0x123...',

  /**
   * NFT显示配置对象ID
   * 可通过环境变量 REACT_APP_NFT_DISPLAY_CONFIG_ID 修改
   */
  NFT_DISPLAY_CONFIG_ID: process.env.REACT_APP_NFT_DISPLAY_CONFIG_ID || '0x123...',

  /**
   * Clock对象ID
   * 可通过环境变量 REACT_APP_CLOCK_ID 修改
   */
  CLOCK_ID: process.env.REACT_APP_CLOCK_ID || '0x6',
};

/**
 * API配置
 * 包含API相关的配置参数
 */
export const API_CONFIG = {
  /**
   * API请求超时时间（毫秒）
   */
  TIMEOUT: Number(process.env.REACT_APP_API_TIMEOUT || 30000),
};

/**
 * 是否使用模拟数据
 * 开发阶段可以设置为true，使用模拟数据而不是实际调用链上合约
 */
export const USE_MOCK_DATA = process.env.REACT_APP_USE_MOCK_DATA === 'true'; 