import { WalrusClient } from '@mysten/walrus';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { WALRUS_CONFIG } from '../config/config';


export type SignFunction = (tx: any) => Promise<any>;

/**
 * Walrus服务类：负责与Walrus存储交互
 */
export class WalrusService {
  private client!: WalrusClient;
  private suiClient!: SuiClient;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1秒
  
  constructor() {
    // 使用类型断言确保网络类型正确
    const network = (process.env.REACT_APP_WALRUS_ENVIRONMENT || 'testnet') as 'testnet' | 'mainnet' | 'devnet' | 'localnet';
    console.log('初始化 Walrus 服务，网络环境:', network);
    
    // 初始化 SUI 客户端
    this.suiClient = new SuiClient({
      url: getFullnodeUrl(network),
    });
    
    try {
      // 初始化 Walrus 客户端
      this.client = new WalrusClient({
        // 只使用 testnet 或 mainnet，将 devnet 和 localnet 都映射到 testnet
        network: (network === 'testnet' || network === 'mainnet') ? network : 'testnet',
        // 由于类型不兼容问题，使用类型断言
        suiClient: this.suiClient as any,
        // 使用 CDN 地址加载 WASM
        wasmUrl: 'https://unpkg.com/@mysten/walrus-wasm@latest/web/walrus_wasm_bg.wasm',
        storageNodeClientOptions: {
          timeout: 60_000,
          // 调整fetch参数类型
          fetch: ((url: RequestInfo, options?: RequestInit) => 
            this.fetchWithRetry(url.toString(), options || {}, this.MAX_RETRIES)) as any
        }
      });
      
      console.log('Walrus 客户端初始化完成');
    } catch (err) {
      console.error('Walrus 客户端初始化失败:', err);
    }
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
   * 获取API路径
   * @param pathType 路径类型，'publish'或'read'
   * @param id 可选的ID参数（blobId或objectId）
   * @param useObjectId 是否使用对象ID进行读取
   * @returns 完整的API路径
   */
  private getApiPath(pathType: 'publish' | 'read', id?: string, useObjectId: boolean = false): string {
    if (pathType === 'publish') {
      return WALRUS_CONFIG.paths.publishBlob;
    } else if (useObjectId) {
      return `${WALRUS_CONFIG.paths.readBlobByObjectId}${id || ''}`;
    } else {
      return `${WALRUS_CONFIG.paths.readBlob}${id || ''}`;
    }
  }

  /**
   * 上传文件到Walrus
   * @param file 要上传的文件
   * @param duration 存储时长(秒)
   * @param address 钱包地址
   * @param signAndExecute 签名并执行交易的函数
   * @returns Promise<{blobId: string, objectId: string, url: string}>
   */
  async uploadFile(
    file: File, 
    duration: number, 
    address: string,
    signAndExecute: SignFunction
  ): Promise<{ blobId: string, objectId: string, url: string }> {
    try {
      console.log(`正在上传文件到Walrus: ${file.name}, 大小: ${file.size} 字节`);
      
      // 计算存储时长（转换为epoch数，1个epoch约24小时）
      const epochs = Math.ceil(duration / (24 * 60 * 60));
      console.log(`文件将存储 ${epochs} 个epochs（约${epochs}天）`);
      
      try {
        // 使用Walrus HTTP API上传文件
        console.log('使用Walrus HTTP API上传文件...');
        
        // 获取发布器端点
        const publisherEndpoint = this.getNetworkEndpoint(false);
        
        // 构建上传URL
        let uploadUrl = `${publisherEndpoint}${this.getApiPath('publish')}?epochs=${epochs}`;
        if (address) {
          uploadUrl += `&send_object_to=${address}`;
        }
        
        console.log('尝试上传文件到Walrus HTTP API:', uploadUrl);
        
        // 发送上传请求 - 使用PUT方法
        const response = await this.fetchWithRetry(uploadUrl, {
          method: 'PUT',
          body: file, // 直接发送文件
          headers: {
            'Accept': 'application/json'
          }
        });
        
        // 解析响应
        const result = await response.json();
        console.log('文件上传成功，响应:', result);
        
        // 从响应中提取blobId和objectId
        let blobId = '';
        let objectId = '';
        
        // 处理新创建的blob
        if (result.newlyCreated && result.newlyCreated.blobObject) {
          blobId = result.newlyCreated.blobObject.blobId;
          objectId = result.newlyCreated.blobObject.id; // 提取对象ID
        } 
        // 处理已经认证过的blob
        else if (result.alreadyCertified) {
          blobId = result.alreadyCertified.blobId;
          objectId = result.alreadyCertified.id; // 提取对象ID
        }
        
        if (!blobId || !objectId) {
          console.warn('响应中未找到所需ID信息，完整响应:', result);
          throw new Error('上传成功但未返回必要的ID信息');
        }
        
        // 获取聚合器端点
        const aggregatorEndpoint = this.getNetworkEndpoint(true);
        
        // 构建URL - 优先使用objectId构建URL
        const url = `${aggregatorEndpoint}${this.getApiPath('read', objectId, true)}`;
        
        return { blobId, objectId, url };
      } catch (uploadError) {
        console.error('HTTP API上传失败:', uploadError);
        
        // 如果HTTP API上传失败，回退到SDK方法
        console.log('尝试使用SDK方法上传...');
        try {
          // 将文件转换为Uint8Array
          const buffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(buffer);
          
          // 使用SDK方法
          const result = await this.client.writeBlob({
            blob: uint8Array,
            deletable: true,
            epochs: epochs,
            // 使用简化的signer对象
            signer: {
              address: address,
              toSuiAddress: () => address
            } as any,
            attributes: {
              filename: file.name,
              contentType: file.type,
              uploadTime: new Date().toISOString()
            }
          });
          
          // SDK方法可能只返回blobId，此时没有objectId
          const blobId = result.blobId;
          const objectId = (result as any).objectId || ''; // 尝试获取objectId，如果没有则为空字符串
          
          // 获取聚合器端点
          const aggregatorEndpoint = this.getNetworkEndpoint(true);
          
          // 构建URL - 如果有objectId则优先使用，否则使用blobId
          const url = objectId 
            ? `${aggregatorEndpoint}${this.getApiPath('read', objectId, true)}`
            : `${aggregatorEndpoint}${this.getApiPath('read', blobId)}`;
            
          return { blobId, objectId, url };
        } catch (sdkError) {
          console.error('Walrus SDK上传失败:', sdkError);
          throw sdkError;
        }
      }
    } catch (err) {
      console.error('Walrus上传错误:', err);
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      throw new Error(`上传到Walrus失败: ${errorMessage}`);
    }
  }
  
  /**
   * 获取网络对应的端点
   * @param isAggregator 是否是聚合器，false表示publisher
   * @returns 对应的端点URL
   */
  private getNetworkEndpoint(isAggregator: boolean = true): string {
    const network = process.env.REACT_APP_WALRUS_ENVIRONMENT || 'testnet';
    const networkType = network === 'mainnet' ? 'mainnet' : 'testnet';
    
    // 从配置文件获取端点URL
    return isAggregator 
      ? WALRUS_CONFIG[networkType].aggregatorUrl
      : WALRUS_CONFIG[networkType].publisherUrl;
  }

  /**
   * 读取Blob内容（通过blobId或objectId）
   * @param id Walrus中的Blob ID或对象ID
   * @param isObjectId 是否是对象ID，默认为false
   * @returns Promise<Uint8Array>
   */
  async readBlob(id: string, isObjectId: boolean = false): Promise<Uint8Array> {
    try {
      // 获取聚合器端点 - 读取操作必须使用聚合器
      const aggregatorEndpoint = this.getNetworkEndpoint(true);
      
      // 构建读取URL - 根据ID类型选择不同的路径
      const url = `${aggregatorEndpoint}${this.getApiPath('read', id, isObjectId)}`;
      
      console.log(`尝试从聚合器读取Blob (${isObjectId ? '对象ID' : 'Blob ID'}):`, url);
      
      // 发送GET请求
      const response = await this.fetchWithRetry(url, {
        method: 'GET'
      });
      
      // 将响应转换为ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error('读取Blob失败:', error);
      
      // 如果是通过对象ID读取失败，尝试使用blobId再读一次
      if (isObjectId) {
        console.log('通过对象ID读取失败，尝试使用Blob ID...');
        try {
          return await this.readBlob(id, false);
        } catch (secondError) {
          console.error('通过Blob ID读取也失败:', secondError);
        }
      }
      
      // 回退到SDK方法
      try {
        return await this.client.readBlob({ blobId: id });
      } catch (sdkError) {
        if (sdkError instanceof Error && sdkError.name === 'RetryableWalrusClientError') {
          console.log('遇到可重试错误，重置客户端后重试...');
          (this.client as any).reset();
          return this.readBlob(id, isObjectId);
        }
        throw sdkError;
      }
    }
  }
  
  /**
   * 获取Blob的类型信息
   * @param blobId Walrus中的Blob ID
   */
  async getBlobType(blobId: string): Promise<any> {
    try {
      // 传入对象参数或直接传入blobId，根据API需要调整
      return await (this.client as any).getBlobType({ blobId });
    } catch (e) {
      // 如果方法不存在，返回默认值
      console.warn('getBlobType方法可能不存在或已更改:', e);
      return { contentType: 'application/octet-stream' };
    }
  }
  
  /**
   * 获取Blob的URL
   * @param id Blob ID或对象ID
   * @param isObjectId 是否是对象ID，默认为false
   * @returns Promise<string>
   */
  async getBlobUrl(id: string, isObjectId: boolean = false): Promise<string> {
    // 获取聚合器端点 - 获取URL必须使用聚合器
    const aggregatorEndpoint = this.getNetworkEndpoint(true);
    
    // 返回完整的URL - 根据ID类型选择不同的路径
    return `${aggregatorEndpoint}${this.getApiPath('read', id, isObjectId)}`;
  }
}

// 创建单例实例
export const walrusService = new WalrusService(); 