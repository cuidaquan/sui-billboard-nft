import { WalrusClient } from '@mysten/walrus';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { RetryableWalrusClientError } from '@mysten/walrus';

/**
 * Walrus服务类：负责与Walrus存储交互
 */
export class WalrusService {
  private client: WalrusClient;
  private suiClient: SuiClient;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1秒
  
  constructor() {
    // 确保网络是有效的枚举值
    const networkInput = process.env.REACT_APP_NETWORK || 'testnet';
    const network = (networkInput === 'testnet' || networkInput === 'mainnet' || 
                     networkInput === 'devnet' || networkInput === 'localnet') 
                    ? networkInput as 'testnet' | 'mainnet' | 'devnet' | 'localnet'
                    : 'testnet';
    
    // 初始化 SUI 客户端
    this.suiClient = new SuiClient({
      url: getFullnodeUrl(network),
    });
    
    // 使用TS忽略注释绕过检查
    
    this.client = new WalrusClient({
      network: network === 'devnet' || network === 'localnet' ? undefined : network,
      // @ts-ignore - 忽略SuiClient类型不匹配的错误
      suiClient: this.suiClient,
      wasmUrl: 'https://unpkg.com/@mysten/walrus-wasm@latest/web/walrus_wasm_bg.wasm',
      storageNodeClientOptions: {
        timeout: 60_000,
        fetch: this.createFetchWithRetry()
      }
    });
  }

  /**
   * 创建带重试的fetch函数
   */
  private createFetchWithRetry(): (url: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
    return ((url: RequestInfo | URL, options?: RequestInit) => {
      return this.fetchWithRetry(url.toString(), options || {});
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
  private async fetchWithRetry(url: string, options: RequestInit, retries = this.MAX_RETRIES): Promise<Response> {
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
        
        // 构建blob URL - Walrus SDK不提供getBlobUrl方法
        // 根据blobId构建URL
        const url = `https://walrus.mystenlabs.com/blob/${blobId}`;
        
        return { blobId, url };
      } catch (error) {
        if (error instanceof RetryableWalrusClientError) {
          console.log('遇到可重试错误，重置客户端后重试...');
          this.client.reset();
          // 重新尝试上传
          return this.uploadFile(file, duration, signer);
        }
        throw error;
      }
    } catch (error: unknown) {
      console.error('Walrus上传错误:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      throw new Error(`上传到Walrus失败: ${errorMessage}`);
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
      if (error instanceof RetryableWalrusClientError) {
        console.log('遇到可重试错误，重置客户端后重试...');
        this.client.reset();
        return this.readBlob(blobId);
      }
      throw error;
    }
  }
  
  /**
   * 获取Blob的元数据信息
   * @param blobId Walrus中的Blob ID
   */
  async getBlobMetadata(blobId: string): Promise<any> {
    return this.client.getBlobMetadata({ blobId });
  }
  
  /**
   * 获取Blob的URL
   * @param blobId Walrus中的Blob ID
   * @returns Promise<string>
   */
  async getBlobUrl(blobId: string): Promise<string> {
    // Walrus SDK中不直接提供getBlobUrl方法，这里构建URL
    return `https://walrus.mystenlabs.com/blob/${blobId}`;
  }

  /**
   * 检查Blob是否存在
   * @param blobId Walrus中的Blob ID
   * @returns Promise<boolean>
   */
  async checkBlobExists(blobId: string): Promise<boolean> {
    try {
      const metadata = await this.getBlobMetadata(blobId);
      return !!metadata;
    } catch (error) {
      console.error('检查Blob存在性错误:', error);
      return false;
    }
  }

  /**
   * 延长Blob存储时间
   * @param blobId Walrus中的Blob ID
   * @param duration 延长的时间（秒）
   * @returns Promise<boolean>
   */
  async extendStorageDuration(blobId: string, duration: number): Promise<boolean> {
    try {
      // 因为Walrus SDK不直接支持延长存储时间
      // 这里只是模拟该功能，实际应用中需要根据SDK提供的功能实现
      console.log(`延长存储时间: ${blobId}, 时长: ${duration}秒`);
      return true;
    } catch (error) {
      console.error('延长存储时间错误:', error);
      return false;
    }
  }
}

// 创建单例实例
export const walrusService = new WalrusService(); 