import React, { useState } from 'react';
import { Form, Button, InputNumber, message, Space, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { SuiClient } from '@mysten/sui/client';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { BillboardNFT, RenewNFTParams } from '../../types';
import { formatSuiCoin } from '../../utils/formatter';
import { createRenewLeaseTx } from '../../utils/transaction';
import { useTransaction } from '../../hooks/useTransaction';

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
  const [form] = Form.useForm();
  
  const account = useCurrentAccount();
  const transaction = useTransaction(suiClient, {
    successMessage: '广告位续租成功！',
    loadingMessage: '正在续租广告位...',
    successMessageKey: 'renew_lease_success',
    loadingMessageKey: 'renew_lease_loading',
    onSuccess
  });
  
  // 提交表单，续租NFT
  const handleSubmit = async (values: any) => {
    // 准备续租参数
    const renewParams: RenewNFTParams = {
      nftId: nft.id,
      adSpaceId: nft.adSpaceId,
      leaseDays: values.leaseDays,
      price: adSpacePrice || '0'
    };
    
    // 构建交易
    const tx = createRenewLeaseTx(renewParams);
    
    // 执行交易
    await transaction.executeTransaction(tx);
  };
  
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        leaseDays: 365
      }}
    >
      <Form.Item
        label={
          <Space>
            <span>续租天数</span>
            <Tooltip title="续租期固定为365天">
              <InfoCircleOutlined />
            </Tooltip>
          </Space>
        }
        name="leaseDays"
      >
        <InputNumber
          min={365}
          max={365}
          style={{ width: '100%' }}
          disabled
        />
      </Form.Item>
      
      <Form.Item>
        <Space>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={transaction.isPending}
          >
            确认续租
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