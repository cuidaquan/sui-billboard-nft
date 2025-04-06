import React, { useState, useEffect } from 'react';
import { Typography, Card, Row, Col, Empty, Spin, Button } from 'antd';
import { Link } from 'react-router-dom';
import { getAvailableAdSpaces } from '../utils/contract';
import { AdSpace } from '../types';
import './AdSpaces.scss';

const { Title, Text } = Typography;

const AdSpacesPage: React.FC = () => {
  const [adSpaces, setAdSpaces] = useState<AdSpace[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取广告位数据
  useEffect(() => {
    const fetchAdSpaces = async () => {
      try {
        const spaces = await getAvailableAdSpaces();
        setAdSpaces(spaces);
      } catch (error) {
        console.error('获取广告位失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdSpaces();
  }, []);
  
  return (
    <div className="ad-spaces-page">
      <Title level={2}>可用广告位</Title>
      <Text className="subtitle">浏览以下可用的广告位，点击查看详情或购买</Text>
      
      {loading ? (
        <div className="loading-container">
          <Spin size="large" />
          <p>加载广告位...</p>
        </div>
      ) : adSpaces.length > 0 && adSpaces[0].id !== '0x0' ? (
        <Row gutter={[24, 24]} className="ad-spaces-grid">
          {adSpaces.map(adSpace => (
            <Col xs={24} sm={12} md={8} lg={6} key={adSpace.id}>
              <Card
                hoverable
                className="ad-space-card"
                cover={
                  <div className="card-cover">
                    <div className="ad-space-image-placeholder">
                      <div className="placeholder-content">
                        <Text strong>{adSpace.name}</Text>
                        <Text>{adSpace.dimension.width} x {adSpace.dimension.height}</Text>
                      </div>
                    </div>
                  </div>
                }
                actions={[
                  <Link to={`/ad-spaces/${adSpace.id}`} key="view">
                    <Button type="link">查看详情</Button>
                  </Link>,
                  <Link to={`/ad-spaces/${adSpace.id}/purchase`} key="purchase">
                    <Button type="primary">立即购买</Button>
                  </Link>
                ]}
              >
                <Card.Meta
                  title={adSpace.name}
                  description={
                    <>
                      <div className="ad-space-info">
                        <Text type="secondary">尺寸: {adSpace.dimension.width} x {adSpace.dimension.height}</Text>
                      </div>
                      <div className="ad-space-info">
                        <Text type="secondary">位置: {adSpace.location}</Text>
                      </div>
                      <div className="ad-space-price">
                        <Text strong>价格: {Number(adSpace.price) / 1000000000} SUI / 天</Text>
                        {adSpace.price_description && (
                          <div className="price-description">
                            <Text type="secondary">{adSpace.price_description}</Text>
                          </div>
                        )}
                      </div>
                    </>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <div className="empty-state-container">
          <Empty 
            description={
              <div className="empty-description">
                <p>目前没有可用的广告位</p>
                <p className="empty-subtitle">广告位由游戏开发者创建，请稍后再来查看</p>
              </div>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <div className="empty-actions">
              <Button 
                onClick={() => window.location.reload()}
                type="primary"
              >
                刷新页面
              </Button>
            </div>
          </Empty>
        </div>
      )}
    </div>
  );
};

export default AdSpacesPage; 