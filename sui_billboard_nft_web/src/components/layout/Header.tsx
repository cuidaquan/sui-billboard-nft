import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography } from 'antd';
import { HomeOutlined, AppstoreOutlined, PictureOutlined, SettingOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { UserRole } from '../../types';
import { checkUserRole } from '../../utils/auth';
import ConnectWallet from '../common/ConnectWallet';
import './Header.scss';

const { Header } = Layout;
const { Title } = Typography;

const AppHeader: React.FC = () => {
  const location = useLocation();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const [userRole, setUserRole] = useState<UserRole>(UserRole.USER);
  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  
  // 当账户变化时检查用户角色
  useEffect(() => {
    if (currentAccount) {
      checkUserRole(currentAccount.address, suiClient)
        .then(role => {
          setUserRole(role);
        })
        .catch(error => {
          console.error('检查用户角色失败:', error);
          setUserRole(UserRole.USER);
        });
    } else {
      setUserRole(UserRole.USER);
    }
  }, [currentAccount, suiClient, forceUpdateKey]);
  
  const menuItems = [
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
  ];
  
  // 管理员角色显示管理菜单
  if (userRole === UserRole.ADMIN || userRole === UserRole.OWNER || userRole === UserRole.GAME_DEV) {
    menuItems.push({
      key: '/manage',
      icon: <SettingOutlined />,
      label: <Link to="/manage">管理</Link>,
    });
  }
  
  return (
    <Header className="app-header">
      <div className="logo">
        <Title level={3}>
          <Link to="/">
            <PictureOutlined />
            链上广告牌
          </Link>
        </Title>
      </div>
      
      <Menu
        theme="dark"
        mode="horizontal"
        selectedKeys={[location.pathname]}
        items={menuItems}
        className="header-menu"
      />
      
      <div className="header-right">
        <ConnectWallet />
      </div>
      
      {/* 添加科技感装饰元素 */}
      <div className="header-decoration"></div>
    </Header>
  );
};

export default AppHeader;