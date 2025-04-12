import React, { useState } from 'react';
import { Button, Upload, message, Radio, Spin, Form, Input, Progress, Tooltip } from 'antd';
import { UploadOutlined, CheckCircleOutlined, InfoCircleOutlined, InboxOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/lib/upload';
import { walrusService } from '../../utils/walrus';
import './WalrusUpload.scss';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useCurrentAccount } from '@mysten/dapp-kit';
import type { SignFunction } from '../../utils/walrus';

const { Dragger } = Upload;

interface WalrusUploadProps {
  onSuccess?: (url: string) => void;
  onError?: (error: Error) => void;
  leaseDays?: number;
  onChange?: (data: { url: string; blobId?: string; storageSource: string }) => void;
}

/**
 * Walrus文件上传组件
 * 支持外部URL和Walrus上传两种模式
 */
const WalrusUpload: React.FC<WalrusUploadProps> = ({ onSuccess, onError, leaseDays = 30, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const signFunction: SignFunction = async (tx) => {
    if (!account?.address) {
      throw new Error('钱包未连接');
    }
    
    try {
      const response = await signAndExecute({
        transaction: tx,
        chain: 'sui:testnet'
      });
      
      return response;
    } catch (e) {
      console.error('签名失败:', e);
      throw e;
    }
  };

  const handleUpload = async (file: RcFile) => {
    if (!account?.address) {
      message.error('请先连接钱包');
      return false;
    }

    setUploading(true);
    try {
      const duration = leaseDays * 24 * 60 * 60; // 转换为秒
      const result = await walrusService.uploadFile(
        file,
        duration,
        account.address,
        signFunction
      );

      message.success('文件上传成功');
      onSuccess?.(result.url);
      
      // 通知父组件内容变更
      onChange?.({
        url: result.url,
        blobId: result.blobId,
        storageSource: 'walrus'
      });
    } catch (error) {
      console.error('文件上传失败:', error);
      const err = error instanceof Error ? error : new Error(String(error));
      message.error('文件上传失败: ' + err.message);
      onError?.(err);
    } finally {
      setUploading(false);
    }
    return false;
  };

  const uploadProps = {
    name: 'file',
    multiple: false,
    beforeUpload: handleUpload,
    showUploadList: false,
    disabled: uploading || !account?.address,
  };

  return (
    <Dragger {...uploadProps}>
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">
        {account?.address
          ? '点击或拖拽文件到此区域上传'
          : '请先连接钱包'}
      </p>
      <p className="ant-upload-hint">
        支持单个文件上传，文件将存储在 Walrus 上
      </p>
    </Dragger>
  );
};

export default WalrusUpload; 