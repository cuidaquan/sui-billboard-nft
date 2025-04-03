import React from 'react';
import { Layout, Menu, Button, Typography, Space } from 'antd';
import { LinkOutlined, HomeOutlined, AppstoreOutlined, PictureOutlined, UserOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@mysten/dapp-kit';
import './Header.scss';

const { Header } = Layout;
const { Title } = Typography;

const AppHeader: React.FC = () => {
  const location = useLocation();
  
  return (
    <Header className="app-header">
      <div className="logo">
        <Title level={3}>
          <Link to="/">
            <PictureOutlined /> 链上广告牌
          </Link>
        </Title>
      </div>
      
      <Menu
        theme="dark"
        mode="horizontal"
        selectedKeys={[location.pathname]}
        className="nav-menu"
        items={[
          {
            key: '/',
            icon: <HomeOutlined />,
            label: <Link to="/">首页</Link>,
          },
          {
            key: '/ad-spaces',
            icon: <AppstoreOutlined />,
            label: <Link to="/ad-spaces">广告位</Link>,
          },
          {
            key: '/my-nfts',
            icon: <PictureOutlined />,
            label: <Link to="/my-nfts">我的NFT</Link>,
          },
          {
            key: '/manage',
            icon: <UserOutlined />,
            label: <Link to="/manage">管理中心</Link>,
          },
        ]}
      />
      
      <Space className="connect-wallet">
        <ConnectButton />
      </Space>
    </Header>
  );
};

export default AppHeader; 