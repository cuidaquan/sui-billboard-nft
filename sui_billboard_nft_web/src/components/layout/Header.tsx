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
  
  // 显示钱包选择模态框
  const showModal = () => {
    // 先强制断开任何现有连接，然后再显示模态框
    forceDisconnectWallet(() => {
      // 在断开连接回调后显示模态框
      setIsModalVisible(true);
    });
  };
  
  // 强制断开钱包并清除所有缓存
  const forceDisconnectWallet = (callback?: () => void) => {
    try {
      console.log('强制断开钱包连接开始...');
      
      // 执行断开连接操作
      if (currentAccount) {
        disconnectWallet();
      }
      
      console.log('清除缓存...');
      // 彻底清除所有缓存
      clearWalletCache();
      
      // 重置状态
      setUserRole(UserRole.USER);
      setForceUpdateKey(prev => prev + 1);
      
      console.log('强制断开钱包完成');
      
      // 延迟执行回调，确保断开操作已完成
      setTimeout(() => {
        callback && callback();
      }, 300);
    } catch (error) {
      console.error('强制断开钱包错误:', error);
      // 即使出错也尝试调用回调
      callback && callback();
    }
  };
  
  // 清除钱包缓存的函数
  const clearWalletCache = () => {
    console.log('开始清除钱包缓存...');
    
    try {
      // 定义可能与钱包相关的键名部分
      const walletRelatedKeys = ['wallet', 'sui', 'dapp', 'connect', 'account', 'adapter', 'role'];
      
      // 清除localStorage中的所有钱包相关数据
      localStorage.removeItem('userRole');
      
      // 尝试清除localStorage中所有可能的钱包相关键
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const lowerKey = key.toLowerCase();
          if (walletRelatedKeys.some(wk => lowerKey.includes(wk))) {
            console.log('清除localStorage键:', key);
            localStorage.removeItem(key);
            // 重新检查索引，因为我们删除了一个项目
            i--;
          }
        }
      }
      
      // 同样清除sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          const lowerKey = key.toLowerCase();
          if (walletRelatedKeys.some(wk => lowerKey.includes(wk))) {
            console.log('清除sessionStorage键:', key);
            sessionStorage.removeItem(key);
            // 重新检查索引，因为我们删除了一个项目
            i--;
          }
        }
      }
      
      console.log('钱包缓存清除完成');
    } catch (error) {
      console.error('清除钱包缓存错误:', error);
    }
  };
  
  // 显示钱包选择模态框或直接连接
  const connectWalletHandler = () => {
    try {
      // 强制断开当前连接
      forceDisconnectWallet(() => {
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
      });
    } catch (error) {
      console.error('处理钱包连接错误:', error);
      message.error('钱包连接操作失败');
    }
  };
  
  // 使用指定钱包连接
  const connectWithWallet = (wallet: any) => {
    console.log('连接钱包:', wallet.name);
    
    // 强制弹出钱包选择窗口
    connectWallet({ 
      wallet,
      silent: false // 设置silent为false，确保每次都弹出钱包窗口
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
      
      <Space className="connect-wallet">
        {currentAccount ? (
          <Dropdown menu={{ items: walletMenuItems }} placement="bottomRight">
            <Button 
              type="primary"
              style={{
                backgroundColor: '#1677ff',
                color: 'white',
                borderRadius: '4px',
                padding: '0 16px',
                height: '32px',
                fontWeight: 'bold',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Avatar size="small" icon={<WalletOutlined />} style={{ backgroundColor: '#096dd9' }} />
              {getShortAddress(currentAccount.address)}
            </Button>
          </Dropdown>
        ) : (
          <Button 
            type="primary"
            onClick={connectWalletHandler}
            loading={isConnecting}
            style={{
              backgroundColor: '#1677ff',
              color: 'white',
              borderRadius: '4px',
              padding: '0 16px',
              height: '32px',
              fontWeight: 'bold',
              border: 'none'
            }}
            icon={<WalletOutlined />}
          >
            连接钱包
          </Button>
        )}
        
        <Modal
          title="连接钱包"
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
      </Space>
    </Header>
  );
};

export default AppHeader;