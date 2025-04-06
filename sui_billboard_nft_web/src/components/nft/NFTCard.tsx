import React from 'react';
import { Card, Button, Typography, Tag, Space } from 'antd';
import { Link } from 'react-router-dom';
import { BillboardNFT } from '../../types';
import { formatDate } from '../../utils/format';
import { ClockCircleOutlined, LinkOutlined } from '@ant-design/icons';
import './NFTCard.scss';

const { Text, Title } = Typography;

interface NFTCardProps {
  nft: BillboardNFT;
}

const NFTCard: React.FC<NFTCardProps> = ({ nft }) => {
  // 计算是否过期
  const isExpired = new Date(nft.leaseEnd) < new Date();
  
  // 计算是否即将过期（小于7天）
  const isAboutToExpire = () => {
    const now = new Date();
    const expiryDate = new Date(nft.leaseEnd);
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
  };

  // 自定义租期显示格式
  const formatLeaseDate = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return '无效日期';
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}/${month}/${day} ${hours}:${minutes}`;
    } catch (error) {
      console.error('日期格式化错误:', error);
      return '无效日期';
    }
  };

  return (
    <Card
      hoverable
      className="nft-card"
      cover={
        <div className="nft-image-container">
          <img alt={nft.brandName} src={nft.contentUrl} />
        </div>
      }
    >
      <Title level={5} className="nft-title">{nft.brandName}</Title>
      
      <div className="nft-info">
        <div className="info-row">
          <Text type="secondary">广告位ID:</Text>
          <Link to={`/ad-spaces/${nft.adSpaceId}`} className="ad-space-link">
            <Text>{nft.adSpaceId.substring(0, 8)}...</Text>
            <LinkOutlined style={{ marginLeft: 4, fontSize: '12px' }} />
          </Link>
        </div>
        
        <div className="info-row lease-period">
          <Text type="secondary"><ClockCircleOutlined /> 租期:</Text>
          <Space direction="vertical" size={0} style={{ textAlign: 'right' }}>
            <Text style={{ fontSize: '12px' }}>从: {formatLeaseDate(nft.leaseStart)}</Text>
            <Text style={{ fontSize: '12px' }}>至: {formatLeaseDate(nft.leaseEnd)}</Text>
          </Space>
        </div>
        
        <div className="nft-status">
          <Tag color={isExpired ? "red" : isAboutToExpire() ? "orange" : "green"}>
            {isExpired ? "已过期" : isAboutToExpire() ? "即将过期" : "活跃中"}
          </Tag>
        </div>
      </div>
      
      <Link to={`/my-nfts/${nft.id}/renew`}>
        <Button type="primary" block danger={isExpired}>续期</Button>
      </Link>
    </Card>
  );
};

export default NFTCard;
 