import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client';
import { NETWORKS, DEFAULT_NETWORK } from './config/config';

// 布局
import MainLayout from './components/layout/MainLayout';

// 页面
import HomePage from './pages/Home';
import AdSpacesPage from './pages/AdSpaces';
import AdSpaceDetailPage from './pages/AdSpaceDetail';
import PurchaseAdSpacePage from './pages/PurchaseAdSpace';
import MyNFTsPage from './pages/MyNFTs';
import NFTDetailPage from './pages/NFTDetail';
import ManagePage from './pages/Manage';
import NotFoundPage from './pages/NotFound';

// 全局样式
import './App.scss';

// 创建查询客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: 1000,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// 获取网络配置
const network = NETWORKS[DEFAULT_NETWORK];

function App() {
  // 添加调试信息
  useEffect(() => {
    console.log('应用初始化');
    console.log('网络配置:', network);
    
    // 检查是否存在钱包对象
    if (typeof window !== 'undefined') {
      const walletDetectionInterval = setInterval(() => {
        if ((window as any).suiWallet) {
          console.log('检测到Sui钱包扩展!');
          clearInterval(walletDetectionInterval);
        }
      }, 1000);
      
      // 5秒后清除检测
      setTimeout(() => clearInterval(walletDetectionInterval), 5000);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={{
          [DEFAULT_NETWORK]: { url: network.fullNodeUrl }
        }}
        defaultNetwork={DEFAULT_NETWORK}
      >
        <WalletProvider 
          autoConnect={true}
          preferredWallets={['Sui Wallet', 'Sui Wallet (Extension)']}
        >
          <Router>
            <MainLayout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/ad-spaces" element={<AdSpacesPage />} />
                <Route path="/ad-spaces/:id" element={<AdSpaceDetailPage />} />
                <Route path="/ad-spaces/:id/purchase" element={<PurchaseAdSpacePage />} />
                <Route path="/my-nfts" element={<MyNFTsPage />} />
                <Route path="/my-nfts/:id" element={<NFTDetailPage />} />
                <Route path="/manage" element={<ManagePage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </MainLayout>
          </Router>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;
