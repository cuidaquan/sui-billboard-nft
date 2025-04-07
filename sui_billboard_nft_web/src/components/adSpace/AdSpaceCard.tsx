import React from 'react';
import { Card, Button, Typography, Space, Tag } from 'antd';
import { EnvironmentOutlined, ColumnWidthOutlined, DollarOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { AdSpace, UserRole } from '../../types';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useMemo } from 'react';
import './AdSpaceCard.scss';

const { Title, Text } = Typography;

interface AdSpaceCardProps {
  adSpace: AdSpace;
  userRole?: UserRole;
  creatorAddress?: string;
}

const AdSpaceCard: React.FC<AdSpaceCardProps> = ({ adSpace, userRole, creatorAddress }) => {
  const account = useCurrentAccount();
  
  // 判断是否应该显示购买按钮
  const shouldShowPurchase = useMemo(() => {
    // 如果是管理员，不显示购买按钮
    if (userRole === UserRole.ADMIN) {
      console.log('用户是管理员，不显示购买按钮');
      return false;
    }
    
    // 标准化地址格式用于比较
    const normalizedCreator = creatorAddress ? creatorAddress.toLowerCase() : null;
    const normalizedUser = account ? account.address.toLowerCase() : null;
    
    console.log(`广告位[${adSpace.id}]创建者信息:`, {
      name: adSpace.name,
      creatorAddress: normalizedCreator,
      userAddress: normalizedUser,
      isMatch: normalizedCreator === normalizedUser,
      userRole
    });
    
    // 如果是游戏开发者，且是自己创建的广告位，不显示购买按钮
    if (userRole === UserRole.GAME_DEV && 
        normalizedCreator && 
        normalizedUser && 
        normalizedCreator === normalizedUser) {
      console.log(`广告位[${adSpace.id}]是当前开发者创建的，隐藏购买按钮`);
      return false;
    }
    
    // 其他情况显示购买按钮
    return true;
  }, [userRole, creatorAddress, account, adSpace.id, adSpace.name]);
  
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
        <Button type="primary" key="view">
          <Link to={`/ad-spaces/${adSpace.id}`}>查看详情</Link>
        </Button>,
        shouldShowPurchase ? (
          <Button type="default" key="purchase">
            <Link to={`/ad-spaces/${adSpace.id}/purchase`}>立即购买</Link>
          </Button>
        ) : null
      ].filter(Boolean)}
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
          {adSpace.price_description && (
            <Text type="secondary" className="price-description">{adSpace.price_description}</Text>
          )}
        </div>
      </Space>
      
      <div className="ad-tags">
        <Tag color="blue">{adSpace.location}</Tag>
        {creatorAddress && account && creatorAddress.toLowerCase() === account.address.toLowerCase() && (
          <Tag color="purple">我的广告位</Tag>
        )}
      </div>
    </Card>
  );
};

export default AdSpaceCard; 