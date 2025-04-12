// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Form, Button, InputNumber, message, Space, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { SuiClient, SuiTransactionBlockResponse } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { BillboardNFT, RenewNFTParams } from '../../types';
import { formatSuiCoin } from '../../utils/formatter';
import { walrusService } from '../../utils/walrus';

interface RenewLeaseFormProps {
  nft: BillboardNFT;
  adSpacePrice?: string;
  onSuccess?: (txHash: string) => void;
  onCancel?: () => void;
  suiClient: SuiClient;
}

const RenewLeaseForm: React.FC<RenewLeaseFormProps> = ({
  nft,
  adSpacePrice,
  onSuccess,
  onCancel,
  suiClient
}) => {
  const { signAndExecuteTransactionBlock } = useCurrentAccount();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [leaseDays, setLeaseDays] = useState<number>(30);
  const [estimatedPrice, setEstimatedPrice] = useState<string>('0');
  
  // 当租期变化时，更新价格估算
  useEffect(() => {
    if (adSpacePrice) {
      // 简化计算，实际应调用合约的calculate_lease_price函数
      const pricePerDay = BigInt(adSpacePrice);
      const totalPrice = pricePerDay * BigInt(leaseDays);
      setEstimatedPrice(formatSuiCoin(totalPrice.toString()));
    }
  }, [adSpacePrice, leaseDays]);
  
  // 处理租期变化
  const handleLeaseDaysChange = (value: number | null) => {
    if (value !== null) {
      setLeaseDays(value);
    }
  };
  
  // 延长Walrus存储时间
  const extendWalrusStorage = async (leaseDays: number) => {
    if (nft.blobId && nft.storageSource === 'walrus') {
      try {
        // 检查blob是否存在
        const exists = await walrusService.checkBlobExists(nft.blobId);
        if (exists) {
          // 延长存储时间
          await walrusService.extendStorageDuration(
            nft.blobId,
            leaseDays * 24 * 60 * 60
          );
          message.success('已成功延长Walrus存储时间！');
          return true;
        } else {
          message.warning('找不到原始Blob内容，可能已过期');
        }
      } catch (error) {
        console.error('延长Walrus存储时间错误:', error);
        message.error('延长Walrus存储时间失败: ' + (error instanceof Error ? error.message : String(error)));
      }
    }
    return false;
  };
  
  // 提交表单，续租NFT
  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      
      // 准备续租参数
      const renewParams: RenewNFTParams = {
        nftId: nft.id,
        adSpaceId: nft.adSpaceId,
        leaseDays: values.leaseDays,
        price: adSpacePrice || '0'
      };
      
      // 构建交易
      const tx = new TransactionBlock();
      
      // 准备支付
      // 简化计算，实际应调用合约的calculate_lease_price函数
      const pricePerDay = BigInt(renewParams.price);
      const totalPrice = pricePerDay * BigInt(renewParams.leaseDays);
      
      // 创建支付Coin对象
      const [coin] = tx.splitCoins(tx.gas, [tx.pure(totalPrice.toString())]);
      
      // 调用合约
      tx.moveCall({
        target: `${process.env.REACT_APP_CONTRACT_PACKAGE_ID}::${process.env.REACT_APP_CONTRACT_MODULE_NAME}::renew_lease`,
        arguments: [
          tx.object(process.env.REACT_APP_FACTORY_OBJECT_ID || ''),
          tx.object(renewParams.adSpaceId),
          tx.object(renewParams.nftId),
          coin,
          tx.pure(renewParams.leaseDays),
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
        message.success('NFT租期续费成功！');
        
        // 延长Walrus存储时间
        if (nft.blobId && nft.storageSource === 'walrus') {
          await extendWalrusStorage(renewParams.leaseDays);
        }
        
        if (onSuccess) {
          onSuccess(result.digest);
        }
      } else {
        message.error('续租失败');
      }
    } catch (error) {
      console.error('续租NFT错误:', error);
      message.error('续租NFT时发生错误: ' + (error instanceof Error ? error.message : String(error)));
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
        name="leaseDays"
        label={
          <span>
            续租天数
            <Tooltip title="续租天数将延长NFT的租期，如果NFT内容存储在Walrus，也会自动延长存储时间">
              <InfoCircleOutlined style={{ marginLeft: '4px' }} />
            </Tooltip>
          </span>
        }
        rules={[{ required: true, message: '请输入续租天数' }]}
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
      
      {nft.blobId && nft.storageSource === 'walrus' && (
        <div className="walrus-info">
          <InfoCircleOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
          <span>NFT内容存储在Walrus，续租后会自动延长存储时间</span>
        </div>
      )}
      
      <Form.Item>
        <Space>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={submitting}
          >
            续租NFT
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

export default RenewLeaseForm; 