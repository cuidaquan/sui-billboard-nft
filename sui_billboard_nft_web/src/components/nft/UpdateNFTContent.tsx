// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Input, message, Image, Space } from 'antd';
import { SuiClient, SuiTransactionBlockResponse } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { walrusService } from '../../utils/walrus';
import WalrusUpload from '../walrus/WalrusUpload';
import { BillboardNFT, UpdateNFTContentParams } from '../../types';

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
  const { signAndExecuteTransactionBlock } = useWalletKit();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  
  // 上传参数
  const [contentParams, setContentParams] = useState<{
    url: string;
    blobId?: string;
    storageSource: string;
  }>({
    url: nft.contentUrl || '',
    blobId: nft.blobId,
    storageSource: nft.storageSource || 'external'
  });
  
  // 处理内容上传参数变更
  const handleContentParamsChange = (data: { url: string, blobId?: string, storageSource: string }) => {
    setContentParams(data);
  };
  
  // 延长旧的Walrus存储时间
  const handleExtendWalrusStorage = async (blobId: string, days: number): Promise<boolean> => {
    if (!blobId) return false;
    
    try {
      // 检查blob是否存在
      const exists = await walrusService.checkBlobExists(blobId);
      if (exists) {
        // 延长存储时间
        await walrusService.extendStorageDuration(
          blobId,
          days * 24 * 60 * 60
        );
        message.success('已成功延长旧内容的存储时间！');
        return true;
      } else {
        message.warning('找不到旧的内容，可能已过期');
      }
    } catch (error) {
      console.error('延长Walrus存储时间错误:', error);
      message.error('延长存储时间失败: ' + (error instanceof Error ? error.message : String(error)));
    }
    return false;
  };
  
  // 提交表单，更新NFT内容
  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      
      // 检查内容URL
      if (!contentParams.url) {
        message.error('请提供内容URL');
        setSubmitting(false);
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
      const tx = new TransactionBlock();
      
      // 准备参数
      const blobIdBytes = updateParams.blobId 
        ? tx.pure(Array.from(new TextEncoder().encode(updateParams.blobId)))
        : tx.pure([]);
      
      // 调用合约
      tx.moveCall({
        target: `${process.env.REACT_APP_CONTRACT_PACKAGE_ID}::${process.env.REACT_APP_CONTRACT_MODULE_NAME}::update_ad_content`,
        arguments: [
          tx.object(updateParams.nftId),
          tx.pure(updateParams.contentUrl),
          blobIdBytes,
          tx.pure(updateParams.storageSource),
          tx.object(process.env.REACT_APP_CLOCK_ID || '')
        ]
      });
      
      // 执行交易
      const result = await signAndExecuteTransactionBlock({
        transactionBlock: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      }) as SuiTransactionBlockResponse;
      
      // 检查交易结果
      if (result && result.digest) {
        message.success('NFT内容已成功更新！');
        
        // 如果旧内容是Walrus存储，而新内容不是相同的blobId
        // 则需要延长旧内容的存储时间，防止租期内内容丢失
        if (nft.blobId && 
            nft.storageSource === 'walrus' && 
            (contentParams.blobId !== nft.blobId || contentParams.storageSource !== 'walrus')) {
          
          // 计算从现在到租期结束的时间
          const leaseEnd = new Date(nft.leaseEnd);
          const now = new Date();
          const diffTime = Math.max(0, leaseEnd.getTime() - now.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays > 0) {
            await handleExtendWalrusStorage(nft.blobId, diffDays);
          }
        }
        
        if (onSuccess) {
          onSuccess(result.digest);
        }
      } else {
        message.error('更新NFT内容失败');
      }
    } catch (error) {
      console.error('更新NFT内容错误:', error);
      message.error('更新NFT内容时发生错误: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSubmitting(false);
    }
  };
  
  // 初始化表单
  useEffect(() => {
    form.setFieldsValue({
      contentUrl: nft.contentUrl || ''
    });
  }, [form, nft]);
  
  return (
    <Card 
      title="更新NFT内容" 
      className="update-nft-content-card"
    >
      <div className="current-content">
        <div className="current-content-label">当前内容:</div>
        <Image
          width={200}
          src={nft.contentUrl}
          alt={nft.brandName}
          fallback="https://via.placeholder.com/200x200?text=加载失败"
        />
      </div>
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ marginTop: '24px' }}
      >
        <Form.Item
          label="新内容"
          required
        >
          <WalrusUpload
            leaseDays={30} // 示例租期
            initialValue={nft.contentUrl}
            initialBlobId={nft.blobId}
            initialStorageSource={nft.storageSource}
            onChange={handleContentParamsChange}
          />
        </Form.Item>
        
        <Form.Item>
          <Space>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={submitting}
            >
              更新内容
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
 