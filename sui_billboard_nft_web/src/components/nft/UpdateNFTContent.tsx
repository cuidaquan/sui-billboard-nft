import React, { useState } from 'react';
import { Card, Form, Button, Input, message, Image, Space } from 'antd';
import { SuiClient } from '@mysten/sui/client';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { walrusService } from '../../utils/walrus';
import WalrusUpload from '../walrus/WalrusUpload';
import { BillboardNFT, UpdateNFTContentParams } from '../../types';
import { createUpdateAdContentTx } from '../../utils/contract';
import { useTransaction } from '../../hooks/useTransaction';

interface UpdateNFTContentProps {
  nft: BillboardNFT;
  onSuccess?: (txHash: string) => void;
  onCancel?: () => void;
  suiClient: SuiClient;
}

const UpdateNFTContent: React.FC<UpdateNFTContentProps> = ({
  nft,
  onSuccess,
  onCancel,
  suiClient
}) => {
  const [form] = Form.useForm();
  const [contentParams, setContentParams] = useState<{
    url: string;
    blobId?: string;
    storageSource?: string;
  }>({ url: '' });
  
  const account = useCurrentAccount();
  const transaction = useTransaction(suiClient, {
    successMessage: '广告内容更新成功！',
    loadingMessage: '正在更新广告内容...',
    successMessageKey: 'update_content_success',
    loadingMessageKey: 'update_content_loading',
    onSuccess
  });
  
  // 处理内容上传成功
  const handleContentUploadSuccess = (url: string, blobId?: string, storageSource?: string) => {
    setContentParams({ url, blobId, storageSource });
  };
  
  // 处理内容参数变更
  const handleContentParamsChange = (data: { url: string; blobId?: string; storageSource: string }) => {
    setContentParams(data);
  };
  
  // 提交表单，更新NFT内容
  const handleSubmit = async (values: any) => {
    // 检查内容URL
    if (!contentParams.url) {
      message.error('请提供内容URL');
      return;
    }
    
    // 准备更新参数
    const updateParams: UpdateNFTContentParams = {
      nftId: nft.id,
      contentUrl: contentParams.url,
      blobId: contentParams.blobId,
      storageSource: contentParams.storageSource
    };
    
    // 构建交易
    const tx = createUpdateAdContentTx(updateParams);
    
    // 执行交易
    await transaction.executeTransaction(tx);
  };
  
  return (
    <Card title="更新广告内容">
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label="当前内容"
        >
          <Image
            src={nft.contentUrl}
            alt="当前广告内容"
            style={{ maxWidth: '100%', maxHeight: '300px' }}
          />
        </Form.Item>
        
        <Form.Item
          label="新的广告内容"
          required
          help="支持图片格式：PNG、JPG、GIF，最大文件大小：10MB"
        >
          <WalrusUpload
            onSuccess={handleContentUploadSuccess}
            onChange={handleContentParamsChange}
            leaseDays={365}
          />
        </Form.Item>
        
        <Form.Item>
          <Space>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={transaction.isPending}
            >
              确认更新
            </Button>
            {onCancel && (
              <Button onClick={onCancel}>
                取消
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default UpdateNFTContent;
 