import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

const queryClient = new QueryClient();
const network = NETWORKS[DEFAULT_NETWORK];

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={{
          [DEFAULT_NETWORK]: { url: network.fullNodeUrl }
        }}
        defaultNetwork={DEFAULT_NETWORK}
      >
        <WalletProvider>
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
