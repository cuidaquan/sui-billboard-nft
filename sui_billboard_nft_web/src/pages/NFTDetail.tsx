import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Typography, Alert, Spin, Button, Descriptions, Space, Tag, Modal, Input, Form } from 'antd';
import { EditOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { BillboardNFT } from '../types';
import { getNFTDetails } from '../utils/contract';
import { formatDate, truncateAddress } from '../utils/format';
import './NFTDetail.scss';

const { Title, Paragraph } = Typography;

const NFTDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [nft, setNft] = useState<BillboardNFT | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // 模态框状态
  const [updateContentVisible, setUpdateContentVisible] = useState<boolean>(false);
  const [renewLeaseVisible, setRenewLeaseVisible] = useState<boolean>(false);
  const [contentUrl, setContentUrl] = useState<string>('');
  const [renewDays, setRenewDays] = useState<number>(30);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // 获取NFT详情
  useEffect(() => {
    const fetchNFTDetails = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const nftDetails = await getNFTDetails(id);
        setNft(nftDetails);
        
        if (!nftDetails) {
          setError('未找到NFT详情');
        } else {
          setContentUrl(nftDetails.contentUrl);
        }
      } catch (err) {
        console.error('获取NFT详情失败:', err);
        setError('获取NFT详情失败，请稍后再试。');
      } finally {
        setLoading(false);
      }
    };
    
    fetchNFTDetails();
  }, [id]);

  // 更新广告内容
  const handleUpdateContent = async () => {
    if (!nft) return;
    
    try {
      setSubmitting(true);
      // 这里应该调用合约更新广告内容
      // 模拟成功
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 更新本地数据
      setNft({
        ...nft,
        contentUrl: contentUrl
      });
      
      setUpdateContentVisible(false);
      setSubmitting(false);
    } catch (err) {
      console.error('更新内容失败:', err);
      setSubmitting(false);
    }
  };

  // 续租NFT
  const handleRenewLease = async () => {
    if (!nft) return;
    
    try {
      setSubmitting(true);
      // 这里应该调用合约续租NFT
      // 模拟成功
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 更新本地数据
      const currentEndDate = new Date(nft.leaseEnd);
      const newEndDate = new Date(currentEndDate.getTime() + renewDays * 86400000);
      
      setNft({
        ...nft,
        leaseEnd: newEndDate.toISOString()
      });
      
      setRenewLeaseVisible(false);
      setSubmitting(false);
    } catch (err) {
      console.error('续租失败:', err);
      setSubmitting(false);
    }
  };

  // 判断NFT是否已过期
  const isExpired = nft ? new Date(nft.leaseEnd) < new Date() : false;

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <p>加载NFT详情...</p>
      </div>
    );
  }
  
  if (error || !nft) {
    return (
      <Alert
        message="错误"
        description={error || "未找到NFT详情"}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div className="nft-detail-page">
      <div className="nft-header">
        <Title level={2}>{nft.brandName}</Title>
        <div className="status-tag">
          <Tag className={`status ${isExpired ? 'expired' : 'active'}`}>
            {isExpired ? '已过期' : '活跃中'}
          </Tag>
        </div>
      </div>
      
      <div className="nft-content">
        <div className="nft-image">
          <img src={nft.contentUrl} alt={nft.brandName} />
        </div>
        
        <div className="nft-details">
          <Card>
            <Descriptions title="NFT详情" bordered column={1}>
              <Descriptions.Item label="NFT ID">{truncateAddress(nft.id)}</Descriptions.Item>
              <Descriptions.Item label="广告位ID">{truncateAddress(nft.adSpaceId)}</Descriptions.Item>
              <Descriptions.Item label="所有者">{truncateAddress(nft.owner)}</Descriptions.Item>
              <Descriptions.Item label="品牌名称">{nft.brandName}</Descriptions.Item>
              <Descriptions.Item label="项目网址">
                <a href={nft.projectUrl} target="_blank" rel="noopener noreferrer">
                  {nft.projectUrl}
                </a>
              </Descriptions.Item>
              <Descriptions.Item label="租期">
                {formatDate(new Date(nft.leaseStart).getTime())} - {formatDate(new Date(nft.leaseEnd).getTime())}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={isExpired ? "red" : "green"}>
                  {isExpired ? "已过期" : "活跃中"}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            
            <div className="nft-actions">
              <Space size="middle">
                <Button 
                  type="primary" 
                  icon={<EditOutlined />} 
                  onClick={() => setUpdateContentVisible(true)}
                  disabled={isExpired}
                >
                  更新广告内容
                </Button>
                <Button 
                  type="default" 
                  icon={<ClockCircleOutlined />} 
                  onClick={() => setRenewLeaseVisible(true)}
                >
                  续租NFT
                </Button>
              </Space>
            </div>
          </Card>
        </div>
      </div>
      
      {/* 更新广告内容模态框 */}
      <Modal
        title="更新广告内容"
        open={updateContentVisible}
        onCancel={() => setUpdateContentVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setUpdateContentVisible(false)}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={submitting} 
            onClick={handleUpdateContent}
          >
            更新
          </Button>
        ]}
      >
        <Form layout="vertical">
          <Form.Item 
            label="广告内容URL" 
            required 
            rules={[{ required: true, message: '请输入内容URL' }]}
          >
            <Input 
              placeholder="请输入内容URL" 
              value={contentUrl} 
              onChange={e => setContentUrl(e.target.value)}
            />
          </Form.Item>
          <Paragraph type="secondary">
            请输入新的广告内容URL，该URL应指向图片或其他媒体内容。
          </Paragraph>
        </Form>
      </Modal>
      
      {/* 续租NFT模态框 */}
      <Modal
        title="续租NFT"
        open={renewLeaseVisible}
        onCancel={() => setRenewLeaseVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRenewLeaseVisible(false)}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={submitting} 
            onClick={handleRenewLease}
          >
            续租
          </Button>
        ]}
      >
        <Form layout="vertical">
          <Form.Item 
            label="续租天数" 
            required 
            rules={[{ required: true, message: '请输入续租天数' }]}
          >
            <Input 
              type="number" 
              placeholder="请输入续租天数" 
              value={renewDays} 
              onChange={e => setRenewDays(parseInt(e.target.value))}
              min={1}
            />
          </Form.Item>
          <Paragraph type="secondary">
            当前租期到：{formatDate(new Date(nft.leaseEnd).getTime())}
          </Paragraph>
          <Paragraph type="secondary">
            续租后到期日：{formatDate(new Date(nft.leaseEnd).getTime() + renewDays * 86400000)}
          </Paragraph>
        </Form>
      </Modal>
    </div>
  );
};

export default NFTDetailPage; 