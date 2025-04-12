// @ts-nocheck
import { WalrusClient } from '@mysten/walrus';

/**
 * Walrus服务类：负责与Walrus存储交互
 */
export class WalrusService {
  private client: any;
  private baseUrl: string;
  
  constructor() {
    // 初始化Walrus客户端
    const network = process.env.REACT_APP_NETWORK || 'testnet';
    this.client = new WalrusClient({
      network: network
    });
    
    // 设置baseUrl
    this.baseUrl = network === 'mainnet' 
      ? 'https://walrus.mainnet.sui.io' 
      : 'https://walrus-testnet.mystenlabs.com';
  }
  
  /**
   * 上传文件到Walrus
   * @param file 要上传的文件
   * @param duration 存储时长(秒)
   * @returns Promise<{blobId: string, url: string}>
   */
  async uploadFile(file: File, duration: number): Promise<{ blobId: string, url: string }> {
    try {
      console.log(`正在上传文件到Walrus: ${file.name}, 大小: ${file.size} 字节`);
      
      // 转换为ArrayBuffer
      const buffer = await file.arrayBuffer();
      
      // 计算存储有效期
      const validUntil = Math.floor(Date.now() / 1000) + duration;
      console.log(`文件将存储至: ${new Date(validUntil * 1000).toLocaleString()}`);
      
      // 使用新版API上传
      try {
        const result = await this.client.uploadBlob({
          content: new Uint8Array(buffer),
          expireAt: validUntil,
        });
        
        console.log(`文件上传成功, Blob ID: ${result.id}`);
        
        // 构建URL
        const url = `${this.baseUrl}/blob/${result.id}`;
        
        return { blobId: result.id, url };
      } catch (uploadError) {
        console.error('Walrus API调用错误:', uploadError);
        
        // 如果API调用失败，尝试使用fetch作为备选方案
        console.log('尝试使用fetch方式上传...');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('expireAt', validUntil.toString());
        
        const response = await fetch(`${this.baseUrl}/blob`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`上传失败: HTTP ${response.status} - ${response.statusText}`);
        }
        
        const result = await response.json();
        if (!result.id) {
          throw new Error('服务器返回的数据格式不正确');
        }
        
        console.log(`文件上传成功, Blob ID: ${result.id}`);
        
        // 构建URL
        const url = `${this.baseUrl}/blob/${result.id}`;
        
        return { blobId: result.id, url };
      }
    } catch (error) {
      console.error('Walrus上传错误:', error);
      throw new Error(`上传到Walrus失败: ${error.message}`);
    }
  }
  
  /**
   * 延长Blob存储时间
   * @param blobId Walrus中的Blob ID
   * @param duration 要延长的时长(秒)
   */
  async extendStorageDuration(blobId: string, duration: number): Promise<void> {
    try {
      console.log(`正在延长Blob(${blobId})的存储时间: ${duration}秒`);
      
      // 计算新的过期时间
      const newExpiry = Math.floor(Date.now() / 1000) + duration;
      console.log(`新的过期时间: ${new Date(newExpiry * 1000).toLocaleString()}`);
      
      // 调用Walrus API延长有效期
      if (typeof this.client.update === 'function') {
        // 新版API
        await this.client.update({
          id: blobId,
          expireAt: newExpiry
        });
      } else if (typeof this.client.updateBlob === 'function') {
        // 可能的替代API
        await this.client.updateBlob(blobId, newExpiry);
      } else {
        // 尝试直接用fetch请求更新
        const response = await fetch(`${this.baseUrl}/blob/${blobId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            expireAt: newExpiry
          }),
        });
        
        if (!response.ok) {
          throw new Error(`更新失败: ${response.statusText}`);
        }
      }
      
      console.log(`成功延长Blob存储时间`);
    } catch (error) {
      console.error('延长存储时间错误:', error);
      throw new Error('延长Walrus存储时间失败');
    }
  }
  
  /**
   * 检查Blob是否存在
   * @param blobId Walrus中的Blob ID
   * @returns 存在则返回true
   */
  async checkBlobExists(blobId: string): Promise<boolean> {
    try {
      if (typeof this.client.get === 'function') {
        // 新版API
        await this.client.get({ id: blobId });
      } else if (typeof this.client.getBlob === 'function') {
        // 可能的替代API
        await this.client.getBlob(blobId);
      } else {
        // 尝试直接用fetch请求获取
        const response = await fetch(`${this.baseUrl}/blob/${blobId}`);
        if (!response.ok) {
          throw new Error(`获取失败: ${response.statusText}`);
        }
      }
      return true;
    } catch (error) {
      console.log(`Blob(${blobId})不存在或已过期`);
      return false;
    }
  }
  
  /**
   * 获取Blob的HTTP URL
   * @param blobId Walrus中的Blob ID
   * @returns HTTP URL
   */
  getBlobUrl(blobId: string): string {
    // 直接构建URL
    return `${this.baseUrl}/blob/${blobId}`;
  }
}

// 创建单例实例
export const walrusService = new WalrusService(); 