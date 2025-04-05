export interface AdSpace {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: string; // Sui金额
  duration: number; // 租期天数
  dimension: {
    width: number;
    height: number;
  };
  owner: string | null;
  available: boolean;
  location: string; // 位置描述
  isExample?: boolean; // 标记是否为示例数据
  price_description?: string; // 价格描述，说明价格的计算方式
}

export interface NFTBillboard {
  id: string;
  adSpaceId: string;
  owner: string;
  contentUrl: string;
  expiryDate: number; // Unix时间戳
  created: number; // Unix时间戳
  status: 'active' | 'expired';
  adSpace: AdSpace;
}

export interface PurchaseAdSpaceParams {
  adSpaceId: string;
  contentUrl: string;
  brandName: string;
  projectUrl: string;
  price: string;
  leaseDays: number;
}

export interface UpdateNFTContentParams {
  nftId: string;
  contentUrl: string;
}

export interface RenewNFTParams {
  nftId: string;
  adSpaceId: string;
  leaseDays: number;
  price: string;
}

export interface UserProfile {
  address: string;
  nfts: NFTBillboard[];
}

// 旧的接口定义，为了兼容性保留
export interface BillboardNFT {
  id: string;
  adSpaceId: string;
  owner: string;
  brandName: string;
  contentUrl: string;
  projectUrl: string;
  leaseStart: string;
  leaseEnd: string;
  isActive: boolean;
}

export interface AdSpaceFilter {
  gameId?: string;
  location?: string;
  size?: string;
  isAvailable?: boolean;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  GAME_DEV = 'GAME_DEV',
  USER = 'USER'
}

export interface User {
  address: string;
  role: UserRole;
}

export interface CreateAdSpaceParams {
  factoryId: string;    // Factory 对象 ID
  gameId: string;       // 游戏 ID
  location: string;     // 位置信息
  size: string;         // 尺寸信息
  price: string;        // 每日价格
  clockId: string;      // Clock 对象 ID
}

export interface RegisterGameDevParams {
  factoryId: string;    // Factory 对象 ID
  developer: string;    // 开发者地址
}

export interface RemoveGameDevParams {
  factoryId: string;    // Factory 对象 ID
  developer: string;    // 要移除的开发者地址
}

export interface UpdatePlatformRatioParams {
  factoryId: string;    // Factory 对象 ID
  ratio: number;        // 新的分成比例 (0-100)
}

export interface UpdateAdSpacePriceParams {
  adSpaceId: string;    // 广告位 ID
  price: string;        // 新的价格
}