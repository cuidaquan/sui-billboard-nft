import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Typography, Space, Modal, message } from 'antd';
import { HomeOutlined, AppstoreOutlined, PictureOutlined, UserOutlined } from '@ant-design/icons';
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
  
  useEffect(() => {
    // 监听账户状态变化并检查用户角色
    const checkRole = async () => {
      if (!currentAccount) {
        localStorage.removeItem('userRole');
        return;
      }
      
      try {
        const role = await checkUserRole(suiClient, currentAccount.address);
        console.log('当前用户角色:', role);
        
        // 将用户角色存储在localStorage中，以便其他组件可以访问
        localStorage.setItem('userRole', role);
      } catch (err) {
        console.error('检查用户角色失败:', err);
        localStorage.setItem('userRole', UserRole.USER);
      }
    };
    
    checkRole();
  }, [currentAccount, suiClient]);
  
  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };
  
  const handleConnectWallet = async (walletName?: string) => {
    try {
      // 获取可用的钱包列表
      if (wallets.length > 0) {
        // 如果指定了钱包名称，直接连接该钱包
        if (walletName) {
          const wallet = wallets.find(w => w.name === walletName);
          if (wallet) {
            connectWallet({ wallet });
            message.success('正在连接钱包...');
            setIsModalVisible(false);
          } else {
            message.error('未找到指定的钱包');
          }
        }
        // 如果只有一个钱包且未指定钱包名称，直接选择它
        else if (wallets.length === 1) {
          connectWallet({ wallet: wallets[0] });
          message.success('正在连接钱包...');
          setIsModalVisible(false);
        } else {
          // 如果有多个钱包且未指定钱包名称，显示钱包列表供用户选择
          message.info('请选择要连接的钱包');
          // 这里保持模态框打开，让用户可以看到钱包列表
        }
      } else {
        message.error('未检测到钱包扩展，请确保已安装Sui钱包');
      }
    } catch (error) {
      message.error('连接钱包失败');
    }
  };
  
  const handleDisconnect = async () => {
    try {
      disconnectWallet();
      message.success('钱包已断开连接');
    } catch (error) {
      message.error('断开钱包连接失败');
    }
  };
  
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
        {currentAccount ? (
          <Button 
            type="primary"
            onClick={handleDisconnect}
            style={{
              backgroundColor: '#1677ff',
              color: 'white',
              borderRadius: '4px',
              padding: '0 16px',
              height: '32px',
              fontWeight: 'bold',
              border: 'none'
            }}
          >
            已连接
          </Button>
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
          <p>请安装并连接 Sui 钱包以继续：</p>
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
                    }}
                  >
                    {wallet.name}
                  </Button>
                ))}
              </div>
            ) : (
              <Button 
                type="primary"
                onClick={() => handleConnectWallet()}
                loading={isConnecting}
                style={{
                  backgroundColor: '#1677ff',
                  color: 'white',
                  borderRadius: '4px',
                  padding: '0 16px',
                  height: '40px',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  width: '200px',
                }}
              >
                连接钱包
              </Button>
            )}
          </div>
          <p>
            如果您还没有安装 Sui 钱包，可以从 
            <a href="https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil" target="_blank" rel="noopener noreferrer">
              Chrome 应用商店
            </a> 
            下载安装。
          </p>
        </Modal>
      </Space>
    </Header>
  );
};

export default AppHeader;