import React, { useState, useEffect } from 'react';
import { Typography, Card, Row, Col, Empty, Spin } from 'antd';
import { Link } from 'react-router-dom';
import { AdSpace } from '../types';
import './AdSpaces.scss';

const { Title, Text } = Typography;

const AdSpacesPage: React.FC = () => {
  const [adSpaces, setAdSpaces] = useState<AdSpace[]>([]);
  const [loading, setLoading] = useState(true);

  // 模拟获取广告位数据
  useEffect(() => {
    // 模拟API请求延迟
    setTimeout(() => {
      // 模拟数据
      const mockData: AdSpace[] = [
        {
          id: '0x123',
          name: '首页顶部广告位',
          description: '网站首页顶部横幅广告位，高曝光量',
          imageUrl: 'https://example.com/ad-space-1.jpg',
          price: '100000000', // 0.1 SUI
          duration: 30, // 30天
          dimension: {
            width: 1200,
            height: 300,
          },
          owner: null,
          available: true,
          location: '首页顶部',
        },
        {
          id: '0x456',
          name: '侧边栏广告位',
          description: '网站所有页面侧边栏广告位',
          imageUrl: 'https://example.com/ad-space-2.jpg',
          price: '50000000', // 0.05 SUI
          duration: 30, // 30天
          dimension: {
            width: 300,
            height: 600,
          },
          owner: null,
          available: true,
          location: '所有页面侧边栏',
        },
      ];
      
      setAdSpaces(mockData);
      setLoading(false);
    }, 1000);
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
      ) : adSpaces.length > 0 ? (
        <Row gutter={[24, 24]} className="ad-spaces-grid">
          {adSpaces.map(adSpace => (
            <Col xs={24} sm={12} md={8} lg={6} key={adSpace.id}>
              <Link to={`/ad-spaces/${adSpace.id}`}>
                <Card
                  hoverable
                  className="ad-space-card"
                  cover={
                    <div className="card-cover">
                      <img src={adSpace.imageUrl} alt={adSpace.name} />
                    </div>
                  }
                >
                  <Card.Meta
                    title={adSpace.name}
                    description={
                      <>
                        <div className="ad-space-info">
                          <Text type="secondary">尺寸: {adSpace.dimension.width} x {adSpace.dimension.height}</Text>
                        </div>
                        <div className="ad-space-price">
                          <Text strong>价格: {Number(adSpace.price) / 1000000000} SUI / {adSpace.duration}天</Text>
                        </div>
                      </>
                    }
                  />
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="暂无可用广告位" />
      )}
    </div>
  );
};

export default AdSpacesPage; 