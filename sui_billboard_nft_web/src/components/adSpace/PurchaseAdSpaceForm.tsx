// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, InputNumber, message, Space, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { SuiClient, SuiTransactionBlockResponse } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { useCurrentAccount } from '@mysten/dapp-kit';
import WalrusUpload from '../walrus/WalrusUpload';
import { formatSuiCoin } from '../../utils/formatter';
import { AdSpace, PurchaseAdSpaceParams } from '../../types';

interface PurchaseAdSpaceFormProps {
  adSpace: AdSpace;
  onSuccess?: (txHash: string) => void;
  onCancel?: () => void;
  suiClient: SuiClient;
}

const PurchaseAdSpaceForm: React.FC<PurchaseAdSpaceFormProps> = ({
  adSpace,
  onSuccess,
  onCancel,
  suiClient
}) => {
  const { signAndExecuteTransactionBlock } = useSignAndExecuteTransactionBlock();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [leaseDays, setLeaseDays] = useState<number>(30);
  const [estimatedPrice, setEstimatedPrice] = useState<string>('0');
  
  // 上传参数
  const [contentParams, setContentParams] = useState<{
    url: string;
    blobId?: string;
    storageSource: string;
  }>({
    url: '',
    storageSource: 'external'
  });
  
  // 当租期变化时，更新价格估算
  useEffect(() => {
    if (adSpace && adSpace.price) {
      // 简化计算，实际应调用合约的calculate_lease_price函数
      const pricePerDay = BigInt(adSpace.price);
      const totalPrice = pricePerDay * BigInt(leaseDays);
      setEstimatedPrice(formatSuiCoin(totalPrice.toString()));
    }
  }, [adSpace, leaseDays]);
  
  // 处理内容上传参数变更
  const handleContentParamsChange = (data: { url: string, blobId?: string, storageSource: string }) => {
    setContentParams(data);
    form.setFieldsValue({ contentUrl: data.url });
  };
  
  // 处理租期变化
  const handleLeaseDaysChange = (value: number | null) => {
    if (value !== null) {
      setLeaseDays(value);
    }
  };
  
  // 提交表单，购买广告位
  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      
      // 检查内容URL
      if (!contentParams.url) {
        message.error('请提供广告内容URL');
        setSubmitting(false);
        return;
      }
      
      // 准备购买参数
      const purchaseParams: PurchaseAdSpaceParams = {
        adSpaceId: adSpace.id,
        contentUrl: contentParams.url,
        brandName: values.brandName,
        projectUrl: values.projectUrl,
        price: adSpace.price,
        leaseDays: values.leaseDays,
        blobId: contentParams.blobId,
        storageSource: contentParams.storageSource
      };
      
      // 构建交易
      const tx = new TransactionBlock();
      
      // 准备支付
      // 简化计算，实际应调用合约的calculate_lease_price函数
      const pricePerDay = BigInt(adSpace.price);
      const totalPrice = pricePerDay * BigInt(leaseDays);
      
      // 创建支付Coin对象
      const [coin] = tx.splitCoins(tx.gas, [tx.pure(totalPrice.toString())]);
      
      // 准备blob_id参数
      const blobIdBytes = purchaseParams.blobId 
        ? tx.pure(Array.from(new TextEncoder().encode(purchaseParams.blobId)))
        : tx.pure([]);
      
      // 调用合约
      tx.moveCall({
        target: `${process.env.REACT_APP_CONTRACT_PACKAGE_ID}::${process.env.REACT_APP_CONTRACT_MODULE_NAME}::purchase_ad_space`,
        arguments: [
          tx.object(process.env.REACT_APP_FACTORY_OBJECT_ID || ''),
          tx.object(purchaseParams.adSpaceId),
          coin,
          tx.pure(purchaseParams.brandName),
          tx.pure(purchaseParams.contentUrl),
          tx.pure(purchaseParams.projectUrl),
          tx.pure(purchaseParams.leaseDays),
          tx.object(process.env.REACT_APP_CLOCK_ID || ''),
          tx.pure(0), // 立即开始
          blobIdBytes,
          tx.pure(purchaseParams.storageSource)
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
        message.success('广告位购买成功！');
        if (onSuccess) {
          onSuccess(result.digest);
        }
      } else {
        message.error('广告位购买失败');
      }
    } catch (error) {
      console.error('购买广告位错误:', error);
      message.error('购买广告位时发生错误: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        leaseDays: 30,
      }}
    >
      <Form.Item
        name="brandName"
        label="品牌名称"
        rules={[{ required: true, message: '请输入品牌名称' }]}
      >
        <Input placeholder="请输入您的品牌名称" />
      </Form.Item>
      
      <Form.Item
        name="projectUrl"
        label="项目URL"
        rules={[
          { required: true, message: '请输入项目URL' },
          { type: 'url', message: '请输入有效的URL' }
        ]}
      >
        <Input placeholder="请输入项目网站URL" />
      </Form.Item>
      
      <Form.Item
        name="leaseDays"
        label={
          <span>
            租期（天）
            <Tooltip title="租期越长，每天的价格越优惠">
              <InfoCircleOutlined style={{ marginLeft: '4px' }} />
            </Tooltip>
          </span>
        }
        rules={[{ required: true, message: '请输入租期天数' }]}
      >
        <InputNumber
          min={1}
          max={365}
          onChange={handleLeaseDaysChange}
          style={{ width: '100%' }}
        />
      </Form.Item>
      
      <div className="estimated-price">
        <span className="label">预估价格:</span>
        <span className="price">{estimatedPrice} SUI</span>
      </div>
      
      <Form.Item
        label="广告内容"
        required
      >
        <WalrusUpload
          leaseDays={leaseDays}
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
            购买广告位
          </Button>
          {onCancel && (
            <Button onClick={onCancel}>
              取消
            </Button>
          )}
        </Space>
      </Form.Item>
    </Form>
  );
};

export default PurchaseAdSpaceForm; 