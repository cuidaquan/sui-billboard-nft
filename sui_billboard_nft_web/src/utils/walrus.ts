import { WalrusClient } from '@mysten/walrus';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { RetryableWalrusClientError } from '@mysten/walrus';

// Buffer polyfill for browser environments
const BufferPolyfill = {
  from: (data: string, encoding?: string): Uint8Array => {
    if (encoding === 'base64') {
      // 简单的base64解码实现
      const decodedString = atob(data);
      const bytes = new Uint8Array(decodedString.length);
      for (let i = 0; i < decodedString.length; i++) {
        bytes[i] = decodedString.charCodeAt(i);
      }
      return bytes;
    }
    // 默认处理为utf-8
    const encoder = new TextEncoder();
    return encoder.encode(data);
  }
};

// 使用原生Buffer或polyfill
const BufferCompat = typeof Buffer !== 'undefined' ? Buffer : BufferPolyfill;

// 输出SDK版本信息，帮助调试
console.log('======= SDK版本信息 =======');
// 使用硬编码方式记录版本，避免浏览器环境中的require问题
console.log('Walrus版本: 0.0.13 (固定版本)');
console.log('Sui版本: ^1.27.0 (package.json中声明的版本)');
console.log('==========================');

// 定义Walrus所需的签名者接口
interface WalrusSigner {
  address: string;
  signTransaction: (txBytes: Uint8Array) => Promise<Uint8Array>;
}

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
    
    // 完全绕过类型检查，构造符合Walrus 0.0.13运行时需求的配置
    const config = {
      network: network === 'devnet' || network === 'localnet' ? undefined : network,
      suiClient: this.suiClient,
      wasmUrl: 'https://unpkg.com/@mysten/walrus-wasm@0.0.5/web/walrus_wasm_bg.wasm',
      storageNodeClientOptions: {
        timeout: 60_000,
        fetch: this.createFetchWithRetry()
      }
    };
    
    // 使用强制类型转换（双重断言）绕过TypeScript类型检查
    this.client = new WalrusClient(config as any);
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
      
      console.log('开始调用Walrus SDK上传文件...');
      
      // 创建一个标准的存储交易
      console.log('创建存储交易...');
      try {
        // 准备一个标准的签名对象 - 遵循@mysten/sui.js的Signer接口
        const address = signer.getAddress();
        const signerObj = {
          // 提供直接的地址属性
          address: address,
          // 提供方法
          getAddress: () => address,
          // 提供toSuiAddress方法
          toSuiAddress: () => address,
          // 使用原始的签名方法
          signTransactionBlock: signer.signTransactionBlock.bind(signer)
        };
        
        // 1. 首先创建一个存储交易
        const storageTransaction = await this.client.createStorageTransaction({
          size: uint8Array.length,
          epochs: epochs,
          owner: address
        });
        
        // 2. 执行存储交易
        console.log('执行存储交易...');
        await signerObj.signTransactionBlock(storageTransaction);
        console.log('存储交易执行成功');
        
        // 3. 上传文件内容
        console.log('上传文件内容...');
        
        // 确保signer对象具有toSuiAddress方法
        if (!signerObj.toSuiAddress) {
          console.log('添加toSuiAddress方法');
          (signerObj as any).toSuiAddress = () => address;
        }
        
        // 使用任何可能的变体尝试
        console.log('尝试多种上传方式...');
        
        let blobId: string;
        
        try {
          // 方式1：使用writeBlob - 最可能成功的方式
          console.log('尝试方式1: writeBlob');
          const writeResult = await this.client.writeBlob({
            signer: signerObj as any,
            blob: uint8Array,
            deletable: true,
            epochs: epochs,
            attributes: {
              filename: file.name,
              contentType: file.type
            }
          });
          
          blobId = writeResult.blobId;
          console.log('方式1成功，获得blobId:', blobId);
        } catch (error1) {
          console.error('方式1失败:', error1);
          
          // 尝试重置客户端
          this.client.reset();
          
          throw error1;
        }
        
        // 构建blob URL
        const url = `https://walrus.mystenlabs.com/blob/${blobId}`;
        console.log('文件上传成功, URL:', url);
        
        return { blobId, url };
      } catch (error) {
        if (error instanceof RetryableWalrusClientError) {
          console.log('遇到可重试错误，重置客户端后重试...');
          this.client.reset();
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
   * 获取Walrus客户端实例
   * 仅供内部使用或调试
   */
  getClient(): WalrusClient {
    return this.client;
  }
}

// 创建单例实例
export const walrusService = new WalrusService(); 