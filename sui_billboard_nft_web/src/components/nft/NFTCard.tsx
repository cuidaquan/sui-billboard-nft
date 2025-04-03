import React from 'react';
import { Card, Button, Typography, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { BillboardNFT } from '../../types';
import './NFTCard.scss';

const { Text, Title } = Typography;

interface NFTCardProps {
  nft: BillboardNFT;
}

const NFTCard: React.FC<NFTCardProps> = ({ nft }) => {
  // 计算是否过期
  const isExpired = new Date(nft.leaseEnd) < new Date();

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
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
          <Text>{nft.adSpaceId.substring(0, 8)}...</Text>
        </div>
        
        <div className="info-row">
          <Text type="secondary">租期:</Text>
          <Text>{formatDate(nft.leaseStart)} - {formatDate(nft.leaseEnd)}</Text>
        </div>
        
        <div className="nft-status">
          <Tag color={isExpired ? "red" : "green"}>
            {isExpired ? "已过期" : "活跃中"}
          </Tag>
        </div>
      </div>
      
      <Link to={`/my-nfts/${nft.id}`}>
        <Button type="primary" block>查看详情</Button>
      </Link>
    </Card>
  );
};

export default NFTCard;
 