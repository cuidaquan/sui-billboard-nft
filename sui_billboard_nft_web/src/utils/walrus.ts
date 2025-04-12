// @ts-nocheck
import { WalrusClient } from '@mysten/walrus';
import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client';

/**
 * Walrus服务类：负责与Walrus存储交互
 */
export class WalrusService {
  private client: WalrusClient;
  private suiClient: SuiClient;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1秒
  
  constructor() {
    const network = process.env.REACT_APP_NETWORK || 'testnet';
    
    // 初始化 SUI 客户端
    this.suiClient = new SuiClient({
      url: getFullnodeUrl(network),
    });
    
    // 初始化 Walrus 客户端
    this.client = new WalrusClient({
      network: network,
      suiClient: this.suiClient,
      // 使用 CDN 地址加载 WASM
      wasmUrl: 'https://unpkg.com/@mysten/walrus-wasm@latest/web/walrus_wasm_bg.wasm',
      storageNodeClientOptions: {
        timeout: 60_000,
        fetch: this.fetchWithRetry.bind(this)
      }
    });
  }

  /**
   * 延迟指定时间
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 带重试的fetch请求
   */
  private async fetchWithRetry(url: string, options: any, retries = this.MAX_RETRIES): Promise<Response> {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(60_000) // 60秒超时
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status} - ${response.statusText}\n${errorText}`);
      }
      return response;
    } catch (error) {
      if (retries > 0) {
        console.log(`请求失败，${retries}次重试机会剩余，等待${this.RETRY_DELAY}ms后重试...`);
        await this.delay(this.RETRY_DELAY);
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  }
  
  /**
   * 上传文件到Walrus
   * @param file 要上传的文件
   * @param duration 存储时长(秒)
   * @param signer 交易签名者
   * @returns Promise<{blobId: string, url: string}>
   */
  async uploadFile(file: File, duration: number, signer: any): Promise<{ blobId: string, url: string }> {
    try {
      console.log(`正在上传文件到Walrus: ${file.name}, 大小: ${file.size} 字节`);
      
      // 将文件转换为 Uint8Array
      const buffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      
      // 计算存储时长（转换为epoch数，1个epoch约24小时）
      const epochs = Math.ceil(duration / (24 * 60 * 60));
      console.log(`文件将存储 ${epochs} 个epochs（约${epochs}天）`);
      
      try {
        // 创建存储对象
        const tx = await this.client.createStorageTransaction({
          size: uint8Array.length,
          epochs: epochs,
          owner: signer.getAddress()
        });
        
        // 执行存储创建交易
        const storageResult = await signer.signTransactionBlock(tx);
        
        // 上传文件
        const { blobId } = await this.client.writeBlob({
          blob: uint8Array,
          deletable: true,
          epochs: epochs,
          signer: signer,
          attributes: {
            filename: file.name,
            contentType: file.type,
            uploadTime: new Date().toISOString()
          }
        });
        
        console.log(`文件上传成功, Blob ID: ${blobId}`);
        
        // 获取blob URL
        const url = await this.client.getBlobUrl(blobId);
        
        return { blobId, url };
      } catch (error) {
        if (error instanceof Error && error.name === 'RetryableWalrusClientError') {
          console.log('遇到可重试错误，重置客户端后重试...');
          this.client.reset();
          // 重新尝试上传
          return this.uploadFile(file, duration, signer);
        }
        throw error;
      }
    } catch (error) {
      console.error('Walrus上传错误:', error);
      throw new Error(`上传到Walrus失败: ${error.message}`);
    }
  }
  
  /**
   * 读取Blob内容
   * @param blobId Walrus中的Blob ID
   * @returns Promise<Uint8Array>
   */
  async readBlob(blobId: string): Promise<Uint8Array> {
    try {
      return await this.client.readBlob({ blobId });
    } catch (error) {
      if (error instanceof Error && error.name === 'RetryableWalrusClientError') {
        console.log('遇到可重试错误，重置客户端后重试...');
        this.client.reset();
        return this.readBlob(blobId);
      }
      throw error;
    }
  }
  
  /**
   * 获取Blob的类型信息
   * @param blobId Walrus中的Blob ID
   */
  async getBlobType(blobId: string): Promise<any> {
    return this.client.getBlobType({ blobId });
  }
  
  /**
   * 获取Blob的URL
   * @param blobId Walrus中的Blob ID
   * @returns Promise<string>
   */
  async getBlobUrl(blobId: string): Promise<string> {
    return this.client.getBlobUrl(blobId);
  }
}

// 创建单例实例
export const walrusService = new WalrusService(); 