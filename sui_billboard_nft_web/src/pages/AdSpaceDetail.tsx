import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Typography, Button, Spin, Card, Alert, Divider, Row, Col } from 'antd';
import { ShoppingCartOutlined, InfoCircleOutlined, ReloadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { AdSpace } from '../types';
import { getAdSpaceDetails, formatSuiAmount } from '../utils/contract';
import './AdSpaceDetail.scss';

const { Title, Paragraph } = Typography;

const AdSpaceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [adSpace, setAdSpace] = useState<AdSpace | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchAdSpace = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('正在获取广告位详情, ID:', id);
      const space = await getAdSpaceDetails(id);
      console.log('获取广告位结果:', space);
      
      setAdSpace(space);
      
      if (!space) {
        setError('未找到广告位或广告位不可用。如果您刚刚创建此广告位，请稍后再试。');
      }
    } catch (err) {
      console.error('获取广告位详情失败:', err);
      setError('获取广告位详情失败，请稍后再试。');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchAdSpace();
  }, [id]);
  
  const handleRefresh = () => {
    fetchAdSpace();
  };
  
  const handleBack = () => {
    navigate('/ad-spaces');
  };
  
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
      <div className="error-container">
        <Alert
          message="广告位加载失败"
          description={error || "未找到广告位信息"}
          type="error"
          showIcon
        />
        <div className="error-actions">
          <Button 
            type="primary" 
            icon={<ReloadOutlined />} 
            onClick={handleRefresh}
            style={{ marginRight: '10px' }}
          >
            重新加载
          </Button>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBack}
          >
            返回广告位列表
          </Button>
        </div>
      </div>
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
            <div className="ad-space-detail-placeholder">
              <div className="placeholder-content">
                <Title level={3}>{adSpace.name}</Title>
                <Paragraph>{adSpace.dimension.width} x {adSpace.dimension.height} 像素</Paragraph>
              </div>
            </div>
          </div>
          <div className="ad-space-info">
            <Title level={4}>{adSpace.name}</Title>
            <Paragraph>{adSpace.description}</Paragraph>
            <Paragraph>位置: {adSpace.location}</Paragraph>
            <Paragraph>尺寸: {adSpace.dimension.width} x {adSpace.dimension.height} 像素</Paragraph>
            <Divider />
            
            <div className="price-detail">
              <Title level={5}>价格详情</Title>
              <Paragraph>
                <strong>基础价格:</strong> {formatSuiAmount(adSpace.price)} SUI / 天
              </Paragraph>
              {adSpace.price_description && (
                <Paragraph className="price-description">
                  <InfoCircleOutlined /> {adSpace.price_description}
                </Paragraph>
              )}
            </div>
            
            <Divider />
            
            {adSpace.available ? (
              <div className="purchase-section">
                <Row gutter={16}>
                  <Col span={12}>
                    <Link to={`/ad-spaces/${adSpace.id}/purchase`}>
                      <Button 
                        type="primary" 
                        icon={<ShoppingCartOutlined />} 
                        size="large"
                        block
                      >
                        立即购买广告位
                      </Button>
                    </Link>
                    <Paragraph className="purchase-note" style={{ marginTop: '8px' }}>
                      点击后可配置租赁天数和广告内容
                    </Paragraph>
                  </Col>
                </Row>
              </div>
            ) : (
              <Alert
                message="此广告位已售出"
                description="该广告位目前不可用，您可以浏览其他可用广告位。"
                type="info"
                showIcon
              />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdSpaceDetailPage;
 