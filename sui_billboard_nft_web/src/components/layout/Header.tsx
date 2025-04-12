import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Typography, Space, Modal, message, Dropdown, Avatar, notification } from 'antd';
import { HomeOutlined, AppstoreOutlined, PictureOutlined, UserOutlined, WalletOutlined, LogoutOutlined, CopyOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import { useCurrentAccount, useConnectWallet, useDisconnectWallet, useWallets, useSuiClient } from '@mysten/dapp-kit';
import { UserRole } from '../../types';
import { checkUserRole } from '../../utils/auth';
import './Header.scss';

const { Header } = Layout;
const { Title } = Typography;

const AppHeader: React.FC = () => {
  const location = useLocation();
  const currentAccount = useCurrentAccount();
  const { mutate: connectWallet, isPending: isConnecting } = useConnectWallet();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const wallets = useWallets();
  const suiClient = useSuiClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.USER);
  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  
  // 获取并存储用户角色
  useEffect(() => {
    // 监听账户状态变化并检查用户角色
    const checkRole = async () => {
      if (!currentAccount) {
        localStorage.removeItem('userRole');
        setUserRole(UserRole.USER);
        return;
      }
      
      try {
        const role = await checkUserRole(suiClient, currentAccount.address);
        console.log('当前用户角色:', role);
        
        // 将用户角色存储在localStorage中，以便其他组件可以访问
        localStorage.setItem('userRole', role);
        setUserRole(role);
      } catch (err) {
        console.error('检查用户角色失败:', err);
        localStorage.setItem('userRole', UserRole.USER);
        setUserRole(UserRole.USER);
      }
    };
    
    checkRole();
  }, [currentAccount, suiClient]);
  
  // 显示钱包选择模态框或直接连接
  const connectWalletHandler = () => {
    try {
      // 检查可用钱包
      if (wallets.length === 1) {
        // 只有一个钱包，直接连接
        console.log('只有一个钱包，直接连接:', wallets[0].name);
        connectWithWallet(wallets[0]);
      } else if (wallets.length > 1) {
        // 多个钱包，显示选择模态框
        setIsModalVisible(true);
      } else {
        // 没有钱包，显示警告
        notification.warning({
          message: '未检测到钱包扩展',
          description: '请安装支持 Sui 的钱包扩展，如 Sui Wallet 或 Ethos Wallet。',
          duration: 10,
          placement: 'topRight'
        });
      }
    } catch (error) {
      console.error('处理钱包连接错误:', error);
      message.error('钱包连接操作失败');
    }
  };
  
  // 使用指定钱包连接
  const connectWithWallet = (wallet: any) => {
    console.log('连接钱包:', wallet.name);
    
    connectWallet({ 
      wallet,
      silent: false
    });
    
    message.loading({
      content: '正在连接钱包...',
      key: 'walletConnect'
    });
    
    // 关闭模态窗口
    setIsModalVisible(false);
  };
  
  // 断开钱包连接 - 直接实现不通过Modal
  const directDisconnect = () => {
    try {
      console.log('开始直接断开钱包连接...');
      
      // 先执行断开连接操作
      if (currentAccount) {
        disconnectWallet();
        
        // 显示消息
        message.loading({
          content: '正在断开钱包连接...',
          key: 'walletDisconnect'
        });
      }
      
      // 清除所有钱包相关的存储
      clearAllWalletData();
      
      // 为确保彻底断开，直接刷新页面
      setTimeout(() => {
        message.success({
          content: '钱包已断开连接，页面将刷新',
          key: 'walletDisconnect',
          duration: 1
        });
        
        // 强制刷新整个页面
        window.location.href = window.location.origin + window.location.pathname;
      }, 500);
    } catch (error) {
      console.error('断开钱包连接错误:', error);
      message.error('断开钱包连接失败，请刷新页面重试');
      
      // 出错时也尝试刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };
  
  // 彻底清除所有钱包相关数据
  const clearAllWalletData = () => {
    console.log('彻底清除所有钱包相关数据...');
    
    try {
      // 清除所有localStorage数据
      localStorage.clear();
      
      // 清除所有sessionStorage数据
      sessionStorage.clear();
      
      // 清除所有钱包相关cookie
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=');
        if (name.toLowerCase().includes('wallet') || 
            name.toLowerCase().includes('sui') || 
            name.toLowerCase().includes('dapp')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
      
      console.log('所有钱包数据已清除');
    } catch (error) {
      console.error('清除钱包数据出错:', error);
    }
  };
  
  // 复制钱包地址
  const copyAddress = () => {
    if (currentAccount) {
      navigator.clipboard.writeText(currentAccount.address)
        .then(() => {
          message.success('地址已复制到剪贴板');
        })
        .catch(err => {
          console.error('复制地址失败:', err);
          message.error('复制地址失败');
        });
    }
  };
  
  // 获取钱包地址的缩略显示
  const getShortAddress = (address: string) => {
    return address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '';
  };
  
  // 用户钱包菜单项
  const walletMenuItems = [
    {
      key: 'address',
      icon: <CopyOutlined />,
      label: (
        <div onClick={copyAddress}>
          {currentAccount ? getShortAddress(currentAccount.address) : ''}
        </div>
      ),
    },
    {
      key: 'disconnect',
      icon: <LogoutOutlined />,
      label: <div onClick={directDisconnect}>断开连接</div>,
      onClick: undefined,
    },
  ];
  
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
        className="nav-menu"
        mode="horizontal"
        selectedKeys={[location.pathname]}
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
          // 只有已连接钱包且不是管理员时显示我的NFT
          ...(currentAccount && userRole !== UserRole.ADMIN ? [
          {
            key: '/my-nfts',
            icon: <PictureOutlined />,
            label: <Link to="/my-nfts">我的NFT</Link>,
          }
          ] : []),
          // 只有管理员和游戏开发者才显示管理中心
          ...(userRole === UserRole.ADMIN || userRole === UserRole.GAME_DEV ? [
          {
            key: '/manage',
            icon: <UserOutlined />,
            label: <Link to="/manage">管理中心</Link>,
            }
          ] : []),
        ]}
      />
      
      <div className="connect-wallet">
        {currentAccount ? (
          <Dropdown menu={{ items: walletMenuItems }} placement="bottomRight">
            <div className="wallet-info">
              <span className="wallet-address" onClick={copyAddress}>
                {getShortAddress(currentAccount.address)}
                <CopyOutlined />
              </span>
            </div>
          </Dropdown>
        ) : (
          <Button 
            className="connect-button"
            onClick={connectWalletHandler} 
            loading={isConnecting}
            icon={<WalletOutlined />}
          >
            连接钱包
          </Button>
        )}
      </div>
      
      {/* 添加科技感装饰元素 */}
      <div className="header-decoration"></div>
      
      <Modal
        title="选择钱包"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        centered
      >
        <p>请选择您想要连接的钱包：</p>
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          {wallets.length > 0 ? (
            <div>
              {wallets.map((wallet) => (
                <Button 
                  key={wallet.name}
                  type="primary"
                  onClick={() => connectWithWallet(wallet)}
                  style={{
                    backgroundColor: '#1677ff',
                    color: 'white',
                    borderRadius: '4px',
                    padding: '0 16px',
                    height: '40px',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    width: '200px',
                    margin: '5px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {wallet.name}
                </Button>
              ))}
            </div>
          ) : (
            <div>
              <p>未检测到可用的钱包扩展。</p>
              <p>请安装以下钱包之一：</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                <Button 
                  href="https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil" 
                  target="_blank"
                  style={{ width: '200px', margin: '0 auto' }}
                >
                  安装 Sui Wallet
                </Button>
                <Button 
                  href="https://chrome.google.com/webstore/detail/ethos-sui-wallet/mcbigmjiafegjnnogedioegffbooigli" 
                  target="_blank"
                  style={{ width: '200px', margin: '0 auto' }}
                >
                  安装 Ethos Wallet
                </Button>
              </div>
            </div>
          )}
        </div>
        <p style={{ marginTop: '20px', fontSize: '13px', color: '#888' }}>
          连接钱包后，您可以浏览和购买NFT、管理您的资产，并参与平台生态系统。
        </p>
      </Modal>
    </Header>
  );
};

export default AppHeader;