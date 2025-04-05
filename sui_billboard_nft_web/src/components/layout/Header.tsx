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
    setIsModalVisible(true);
  };

  // 关闭钱包选择模态框
  const handleCancel = () => {
    setIsModalVisible(false);
  };
  
  // 连接钱包
  const handleConnectWallet = async (walletName?: string) => {
    try {
      // 获取可用的钱包列表
      if (wallets.length > 0) {
        // 如果指定了钱包名称，直接连接该钱包
        if (walletName) {
          const wallet = wallets.find(w => w.name === walletName);
          if (wallet) {
            connectWallet({ wallet });
            message.loading({
              content: '正在连接钱包...',
              key: 'walletConnect'
            });
            setIsModalVisible(false);
          } else {
            message.error('未找到指定的钱包');
          }
        }
        // 如果只有一个钱包且未指定钱包名称，直接选择它
        else if (wallets.length === 1) {
          connectWallet({ wallet: wallets[0] });
          message.loading({
            content: '正在连接钱包...',
            key: 'walletConnect'
          });
          setIsModalVisible(false);
        } else {
          // 如果有多个钱包且未指定钱包名称，显示钱包列表供用户选择
          message.info('请选择要连接的钱包');
          // 这里保持模态框打开，让用户可以看到钱包列表
        }
      } else {
        notification.warning({
          message: '未检测到钱包扩展',
          description: '请安装支持 Sui 的钱包扩展，如 Sui Wallet 或 Ethos Wallet。',
          duration: 10,
          placement: 'topRight'
        });
      }
    } catch (error) {
      message.error('连接钱包失败');
      console.error('连接钱包错误:', error);
    }
  };
  
  // 断开钱包连接
  const handleDisconnect = async () => {
    Modal.confirm({
      title: '断开钱包连接',
      content: '确定要断开钱包连接吗？',
      onOk: () => {
        try {
          disconnectWallet();
          message.success('钱包已断开连接');
        } catch (error) {
          message.error('断开钱包连接失败');
          console.error('断开钱包连接错误:', error);
        }
      }
    });
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
      label: '断开连接',
      onClick: handleDisconnect,
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
            onClick={showModal}
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
          onCancel={handleCancel}
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
                    onClick={() => handleConnectWallet(wallet.name)}
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