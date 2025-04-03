import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Typography, Button, Spin, Card, Alert } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import { AdSpace } from '../types';
import { getAdSpaceDetails, createSuiClient } from '../utils/contract';
import { formatSuiAmount } from '../utils/format';
import './AdSpaceDetail.scss';

const { Title, Paragraph } = Typography;

const AdSpaceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const suiClient = createSuiClient();
  
  const [adSpace, setAdSpace] = useState<AdSpace | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchAdSpace = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const space = await getAdSpaceDetails(id);
        setAdSpace(space);
        
        if (!space) {
          setError('未找到广告位或广告位不可用');
        }
      } catch (err) {
        console.error('获取广告位详情失败:', err);
        setError('获取广告位详情失败，请稍后再试。');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAdSpace();
  }, [id]);
  
  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <p>加载广告位信息...</p>
      </div>
    );
  }
  
  if (error || !adSpace) {
    return (
      <Alert
        message="错误"
        description={error || "未找到广告位信息"}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div className="ad-space-detail-page">
      <div className="ad-space-header">
        <Title level={2}>{adSpace.name}</Title>
      </div>
      
      <Card>
        <div className="ad-space-content">
          <div className="ad-space-image">
            <img src={adSpace.imageUrl} alt={adSpace.name} />
          </div>
          <div className="ad-space-info">
            <Title level={4}>{adSpace.name}</Title>
            <Paragraph>{adSpace.description}</Paragraph>
            <Paragraph>位置: {adSpace.location}</Paragraph>
            <Paragraph>尺寸: {adSpace.dimension.width} x {adSpace.dimension.height} 像素</Paragraph>
            <Paragraph>价格: {formatSuiAmount(adSpace.price)} SUI / {adSpace.duration}天</Paragraph>
            
            {adSpace.available ? (
              <Link to={`/ad-spaces/${adSpace.id}/purchase`}>
                <Button 
                  type="primary" 
                  icon={<ShoppingCartOutlined />} 
                  size="large"
                >
                  购买此广告位
                </Button>
              </Link>
            ) : (
              <Button 
                type="default"
                disabled
                icon={<ShoppingCartOutlined />}
                size="large"
              >
                已售出
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdSpaceDetailPage;
 