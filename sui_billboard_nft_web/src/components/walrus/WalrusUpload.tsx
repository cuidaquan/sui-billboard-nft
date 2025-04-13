import React, { useState } from 'react';
import { Button, Upload, message, Radio, Spin, Form, Input, Progress, Tooltip } from 'antd';
import { UploadOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/lib/upload';
import { walrusService } from '../../utils/walrus';
import './WalrusUpload.scss';
import { useWalletKit } from '@mysten/wallet-kit';
import { useCurrentAccount } from '@mysten/dapp-kit';

interface WalrusUploadProps {
  onChange?: (data: { url: string, blobId?: string, storageSource: string }) => void;
  leaseDays: number;
  initialValue?: string;
  initialBlobId?: string;
  initialStorageSource?: string;
}

/**
 * Walrus文件上传组件
 * 支持外部URL和Walrus上传两种模式
 */
const WalrusUpload: React.FC<WalrusUploadProps> = ({ 
  onChange, 
  leaseDays,
  initialValue = '',
  initialBlobId = '',
  initialStorageSource = 'external'
}) => {
  // 获取钱包工具
  const { signAndExecuteTransactionBlock } = useWalletKit();
  const currentAccount = useCurrentAccount();
  
  // 存储选择
  const [storageSource, setStorageSource] = useState<'external' | 'walrus'>(
    initialStorageSource === 'walrus' ? 'walrus' : 'external'
  );
  
  // 文件上传状态
  const [uploadedFile, setUploadedFile] = useState<RcFile | null>(null);
  const [uploadedBlobId, setUploadedBlobId] = useState<string>(initialBlobId);
  const [uploadedUrl, setUploadedUrl] = useState<string>(initialValue);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [contentUrl, setContentUrl] = useState<string>(initialValue);
  
  // 处理存储方式变更
  const handleStorageTypeChange = (e: any) => {
    const newType = e.target.value;
    setStorageSource(newType);
    
    // 重置上传状态
    if (newType === 'external') {
      // 如果切换到外部URL，通知父组件
      if (onChange) {
        onChange({
          url: contentUrl,
          storageSource: 'external'
        });
      }
    } else {
      // 如果切换到Walrus但没有已上传的文件，重置URL
      if (!uploadedUrl && onChange) {
        onChange({
          url: '',
          storageSource: 'walrus'
        });
      } else if (uploadedUrl && uploadedBlobId && onChange) {
        // 如果已经有上传的Walrus文件
        onChange({
          url: uploadedUrl,
          blobId: uploadedBlobId,
          storageSource: 'walrus'
        });
      }
    }
  };
  
  // 处理URL输入变更
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setContentUrl(url);
    
    // 通知父组件
    if (onChange) {
      onChange({
        url,
        storageSource: 'external'
      });
    }
  };
  
  // 处理文件上传前的验证
  const handleBeforeUpload = (file: RcFile) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件!');
      return false;
    }
    
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('图片必须小于5MB!');
      return false;
    }
    
    // 保存文件，但不立即上传
    setUploadedFile(file);
    
    // 阻止默认上传
    return false;
  };
  
  // 模拟进度条更新
  const simulateProgress = () => {
    let progress = 0;
    const timer = setInterval(() => {
      progress += Math.floor(Math.random() * 3) + 1;
      if (progress >= 100) {
        progress = 100;
        clearInterval(timer);
      }
      setUploadProgress(progress);
    }, 100);
    
    return () => clearInterval(timer);
  };
  
  // 上传到Walrus
  const handleUploadToWalrus = async () => {
    if (!uploadedFile || !currentAccount) {
      message.error('请先连接钱包并选择文件');
      return;
    }
    
    try {
      setUploading(true);
      // 启动进度条
      const stopProgress = simulateProgress();
      
      // 计算存储时间 (从现在到租期结束)
      const storageDuration = leaseDays * 24 * 60 * 60; // 秒数
      
      // 获取当前网络配置
      const network = process.env.REACT_APP_NETWORK || 'testnet';
      
      // 创建符合 SDK 要求的 signer 对象
      const signer = {
        getAddress: () => currentAccount.address,
        signTransactionBlock: async (tx: any) => {
          try {
            return signAndExecuteTransactionBlock({ 
              transactionBlock: tx,
              chain: `sui:${network}`,
              options: { showEffects: true }
            });
          } catch (error) {
            console.error('交易签名错误:', error);
            throw error;
          }
        }
      };
      
      // 执行文件上传
      const { blobId, url } = await walrusService.uploadFile(
        uploadedFile,
        storageDuration,
        signer
      );
      
      // 确保进度条到100%
      setUploadProgress(100);
      stopProgress();
      
      // 更新状态
      setUploadedBlobId(blobId);
      setUploadedUrl(url);
      setContentUrl(url);
      
      // 通知父组件
      if (onChange) {
        onChange({
          url,
          blobId,
          storageSource: 'walrus'
        });
      }
      
      // 显示成功消息
      message.success('文件已成功上传到Walrus！');
      
    } catch (error) {
      console.error('上传到Walrus失败:', error);
      message.error('上传到Walrus失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };
  
  // 放弃当前选择的文件
  const handleCancelUpload = () => {
    setUploadedFile(null);
    setUploadProgress(0);
  };
  
  return (
    <div className="walrus-upload-container">
      <div className="storage-selector">
        <Radio.Group 
          onChange={handleStorageTypeChange} 
          value={storageSource}
          buttonStyle="solid"
        >
          <Radio.Button value="external">
            <Tooltip title="直接使用外部图片URL">
              <span>外部URL</span>
            </Tooltip>
          </Radio.Button>
          <Radio.Button value="walrus">
            <Tooltip title="将图片上传到去中心化存储Walrus">
              <span>Walrus存储</span>
            </Tooltip>
          </Radio.Button>
        </Radio.Group>
        
        <Tooltip title="使用Walrus存储可确保内容的可用性与租期同步">
          <InfoCircleOutlined style={{ marginLeft: '8px', color: '#1890ff' }} />
        </Tooltip>
      </div>
      
      {storageSource === 'external' ? (
        <Form.Item
          label="广告内容URL"
          rules={[
            { required: true, message: '请输入广告内容URL' },
            { type: 'url', message: '请输入有效的URL' }
          ]}
        >
          <Input 
            placeholder="请输入图片URL地址" 
            value={contentUrl}
            onChange={handleUrlChange}
          />
          
          {contentUrl && (
            <div className="preview-section">
              <div className="preview-title">预览</div>
              <img 
                src={contentUrl} 
                alt="图片预览" 
                className="preview-image"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  message.error('URL图片加载失败，请检查链接是否有效');
                }}
              />
            </div>
          )}
        </Form.Item>
      ) : (
        <div className="walrus-upload-section">
          <Form.Item
            label="上传到Walrus"
            required={!uploadedUrl}
          >
            <div className="upload-container">
              {!uploadedFile && !uploadedUrl && (
                <Upload
                  beforeUpload={handleBeforeUpload}
                  showUploadList={false}
                  accept="image/*"
                >
                  <Button 
                    icon={<UploadOutlined />} 
                    disabled={uploading}
                  >
                    选择广告图片
                  </Button>
                </Upload>
              )}
              
              {uploadedFile && !uploading && !uploadedUrl && (
                <div className="selected-file">
                  <div className="file-info">
                    已选择: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(2)} KB)
                  </div>
                  <div className="file-actions">
                    <Button 
                      type="primary" 
                      onClick={handleUploadToWalrus}
                      style={{ marginRight: '8px' }}
                    >
                      上传到Walrus
                    </Button>
                    <Button 
                      danger
                      onClick={handleCancelUpload}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              )}
              
              {uploading && (
                <div className="upload-progress">
                  <Progress percent={uploadProgress} status="active" />
                  <Spin size="small" style={{ marginLeft: '8px' }} />
                  <span style={{ marginLeft: '8px' }}>上传中...</span>
                </div>
              )}
              
              {uploadedUrl && (
                <div className="upload-success">
                  <div className="success-header">
                    <CheckCircleOutlined style={{ color: 'green', marginRight: '8px' }} />
                    <span>上传成功</span>
                    <Button 
                      size="small" 
                      type="link" 
                      style={{ marginLeft: '16px' }}
                      onClick={() => {
                        setUploadedFile(null);
                        setUploadedUrl('');
                        setUploadedBlobId('');
                        setContentUrl('');
                        setUploadProgress(0);
                        
                        if (onChange) {
                          onChange({
                            url: '',
                            storageSource: 'walrus'
                          });
                        }
                      }}
                    >
                      重新上传
                    </Button>
                  </div>
                  
                  <div className="blob-info">
                    <Tooltip title="这是文件在Walrus上的唯一标识">
                      <span>Blob ID: </span>
                    </Tooltip>
                    <code>{uploadedBlobId}</code>
                  </div>
                  
                  <div className="storage-duration">
                    <Tooltip title="文件将存储至租期结束">
                      <span>存储有效期: {leaseDays} 天</span>
                    </Tooltip>
                  </div>
                  
                  <div className="preview-container">
                    <img 
                      src={uploadedUrl} 
                      alt="上传预览" 
                      className="upload-preview"
                    />
                  </div>
                </div>
              )}
            </div>
          </Form.Item>
          
          {!uploadedUrl && (
            <div className="upload-note">
              <InfoCircleOutlined style={{ marginRight: '8px' }} />
              <span>上传的图片将存储在Walrus去中心化存储中，存储时间与NFT租期一致。</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WalrusUpload; 