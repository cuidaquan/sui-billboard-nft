import React from 'react';
import { Card, Button, Typography, Space, Tag } from 'antd';
import { ShopOutlined, EnvironmentOutlined, ColumnWidthOutlined, DollarOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { AdSpace } from '../../types';
import './AdSpaceCard.scss';

const { Title, Text } = Typography;

interface AdSpaceCardProps {
  adSpace: AdSpace;
}

const AdSpaceCard: React.FC<AdSpaceCardProps> = ({ adSpace }) => {
  return (
    <Card 
      className="ad-space-card"
      hoverable
      cover={
        <div className="card-cover">
          <div className="ad-space-placeholder">
            <ColumnWidthOutlined />
            <Text>{adSpace.dimension.width} x {adSpace.dimension.height}</Text>
          </div>
        </div>
      }
      actions={[
        <Button type="primary">
          <Link to={`/ad-spaces/${adSpace.id}`}>查看详情</Link>
        </Button>,
        <Button type="default">
          <Link to={`/ad-spaces/${adSpace.id}/purchase`}>立即购买</Link>
        </Button>
      ]}
    >
      <Title level={4} className="ad-title">{adSpace.name}</Title>
      
      <Space direction="vertical" className="ad-info">
        <div className="info-item">
          <EnvironmentOutlined />
          <Text>位置: {adSpace.location}</Text>
        </div>
        
        <div className="info-item">
          <ColumnWidthOutlined />
          <Text>尺寸: {adSpace.dimension.width} x {adSpace.dimension.height}</Text>
        </div>
        
        <div className="info-item">
          <DollarOutlined />
          <Text>价格: {Number(adSpace.price) / 1000000000} SUI / {adSpace.duration}天</Text>
        </div>
        
        <div className="info-item">
          <ShopOutlined />
          <Text>状态: {adSpace.available ? '可用' : '已租用'}</Text>
        </div>
      </Space>
      
      <div className="ad-tags">
        <Tag color={adSpace.available ? "green" : "red"}>
          {adSpace.available ? '可用' : '已租用'}
        </Tag>
        <Tag color="blue">{adSpace.location}</Tag>
      </div>
    </Card>
  );
};

export default AdSpaceCard; 