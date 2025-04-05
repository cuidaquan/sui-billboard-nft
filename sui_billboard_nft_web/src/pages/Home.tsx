import React from 'react';
import { Typography, Card, Button, Row, Col, Space } from 'antd';
import { Link } from 'react-router-dom';
import { ShoppingOutlined, UserOutlined } from '@ant-design/icons';
import './Home.scss';

const { Title, Paragraph } = Typography;

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <div className="hero-section">
        <Title>Sui 广告位 NFT 平台</Title>
        <Paragraph className="subtitle">
          基于 Sui 区块链的广告位 NFT 交易平台，为您提供去中心化的广告发布服务
        </Paragraph>
        
        <Space size="large">
          <Link to="/ad-spaces">
            <Button type="primary" size="large" icon={<ShoppingOutlined />}>
              浏览广告位
            </Button>
          </Link>
          <Link to="/my-nfts">
            <Button size="large" icon={<UserOutlined />}>
              我的 NFT
            </Button>
          </Link>

        </Space>
      </div>
      
      <div className="features-section">
        <Title level={2} className="section-title">平台特色</Title>
        
        <Row gutter={[32, 32]}>
          <Col xs={24} sm={12} md={8}>
            <Card className="feature-card">
              <Title level={3}>去中心化广告平台</Title>
              <Paragraph>
                利用区块链技术实现广告位的透明交易和管理，无需中介机构参与
              </Paragraph>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={8}>
            <Card className="feature-card">
              <Title level={3}>NFT 形式广告位</Title>
              <Paragraph>
                您购买的广告位以 NFT 形式存储在区块链上，可自由交易和管理
              </Paragraph>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={8}>
            <Card className="feature-card">
              <Title level={3}>灵活的租期管理</Title>
              <Paragraph>
                灵活设置广告位租期，随时续租或更新广告内容
              </Paragraph>
            </Card>
          </Col>
        </Row>
      </div>
      
      <div className="how-it-works">
        <Title level={2} className="section-title">使用步骤</Title>
        
        <div className="step">
          <div className="step-number">1</div>
          <div className="step-content">
            <Title level={4}>连接 Sui 钱包</Title>
            <Paragraph>
              点击右上角的"连接钱包"按钮，连接您的 Sui 钱包
            </Paragraph>
          </div>
        </div>
        
        <div className="step">
          <div className="step-number">2</div>
          <div className="step-content">
            <Title level={4}>浏览广告位</Title>
            <Paragraph>
              浏览可用的广告位，查看详情和价格
            </Paragraph>
          </div>
        </div>
        
        <div className="step">
          <div className="step-number">3</div>
          <div className="step-content">
            <Title level={4}>购买 NFT 广告位</Title>
            <Paragraph>
              选择合适的广告位，支付 Sui 代币购买 NFT
            </Paragraph>
          </div>
        </div>
        
        <div className="step">
          <div className="step-number">4</div>
          <div className="step-content">
            <Title level={4}>管理您的广告</Title>
            <Paragraph>
              在"我的 NFT"页面管理您的广告内容，并可随时更新或续租
            </Paragraph>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;