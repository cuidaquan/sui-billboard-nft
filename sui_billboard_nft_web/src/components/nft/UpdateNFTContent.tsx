// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Input, message, Image, Space } from 'antd';
import { SuiClient, SuiTransactionBlockResponse } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
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
  const { mutate: signAndExecuteTransactionBlock } = useSignAndExecuteTransaction();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  
  // 上传参数 - 简化版
  const [contentParams, setContentParams] = useState<{
    url: string;
  }>({
    url: nft.contentUrl || ''
  });
  
  // 处理内容上传参数变更
  const handleContentParamsChange = (url: string) => {
    setContentParams({ url });
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
        contentUrl: contentParams.url
      };
      
      // 构建交易
      const tx = new TransactionBlock();
      
      // 调用合约
      tx.moveCall({
        target: `${process.env.REACT_APP_CONTRACT_PACKAGE_ID}::${process.env.REACT_APP_CONTRACT_MODULE_NAME}::update_ad_content`,
        arguments: [
          tx.object(updateParams.nftId),
          tx.pure(updateParams.contentUrl),
          tx.pure(''),
          tx.pure('external'),
          tx.object(process.env.REACT_APP_CLOCK_ID || '')
        ]
      });
      
      // 执行交易
      const result = await signAndExecuteTransactionBlock({
        transaction: tx
      }) as SuiTransactionBlockResponse;
      
      // 检查交易结果
      if (result && result.digest) {
        message.success('NFT内容已成功更新！');
        
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
          <Form.Item label="内容 URL" rules={[{ required: true, message: '请输入内容URL' }]}>
            <Input 
              placeholder="请输入图片URL" 
              value={contentParams.url}
              onChange={(e) => handleContentParamsChange(e.target.value)}
            />
          </Form.Item>

          {contentParams.url && (
            <Form.Item label="预览">
              <img 
                src={contentParams.url} 
                alt="内容预览" 
                style={{ maxWidth: '100%', maxHeight: '200px' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  message.error('图片加载失败，请检查URL是否有效');
                }}
              />
            </Form.Item>
          )}
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
 