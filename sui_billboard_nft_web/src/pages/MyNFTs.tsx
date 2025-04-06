import React, { useState, useEffect } from 'react';
import { Typography, Tabs, Empty, Spin, Alert, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { BillboardNFT } from '../types';
import NFTCard from '../components/nft/NFTCard';
import { getUserNFTs } from '../utils/contract';
import './MyNFTs.scss';

const { Title, Paragraph } = Typography;

const MyNFTsPage: React.FC = () => {
  const [nfts, setNfts] = useState<BillboardNFT[]>([]);
  const [activeNfts, setActiveNfts] = useState<BillboardNFT[]>([]);
  const [expiredNfts, setExpiredNfts] = useState<BillboardNFT[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const account = useCurrentAccount();
  
  // 加载用户的NFT
  useEffect(() => {
    const fetchNFTs = async () => {
      if (!account) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const userNfts = await getUserNFTs(account.address);
        setNfts(userNfts);
        
        // 分离活跃和过期的NFT
        const active = userNfts.filter(nft => nft.isActive);
        const expired = userNfts.filter(nft => !nft.isActive);
        
        setActiveNfts(active);
        setExpiredNfts(expired);
      } catch (err) {
        console.error('获取NFT失败:', err);
        setError('获取NFT数据失败，请稍后再试。');
      } finally {
        setLoading(false);
      }
    };
    
    fetchNFTs();
  }, [account]);
  
  // 创建标签页内容
  const getTabItems = () => {
    return [
      {
        key: 'active',
        label: `活跃NFT (${activeNfts.length})`,
        children: activeNfts.length === 0 ? (
          <Empty description="没有活跃的NFT" />
        ) : (
          <div className="grid">
            {activeNfts.map(nft => (
              <NFTCard key={nft.id} nft={nft} />
            ))}
          </div>
        )
      },
      {
        key: 'expired',
        label: `过期NFT (${expiredNfts.length})`,
        children: expiredNfts.length === 0 ? (
          <Empty description="没有过期的NFT" />
        ) : (
          <div className="grid">
            {expiredNfts.map(nft => (
              <NFTCard key={nft.id} nft={nft} />
            ))}
          </div>
        )
      }
    ];
  };
  
  // 如果用户未连接钱包
  if (!account) {
    return (
      <div className="my-nfts-page">
        <div className="section-title">
          <Title level={2}>我的广告牌NFT</Title>
          <Paragraph>查看并管理您拥有的广告牌NFT。</Paragraph>
        </div>
        
        <div className="connect-wallet-prompt">
          <Alert
            message="请连接钱包"
            description="您需要连接钱包才能查看您的NFT。"
            type="info"
            showIcon
          />
        </div>
      </div>
    );
  }

  return (
    <div className="my-nfts-page">
      <div className="section-title">
        <Title level={2}>我的广告牌NFT</Title>
        <Paragraph>查看并管理您拥有的广告牌NFT。</Paragraph>
      </div>
      
      {loading ? (
        <div className="loading-container">
          <Spin size="large" />
          <p>加载您的NFT...</p>
        </div>
      ) : error ? (
        <Alert 
          message="错误" 
          description={error} 
          type="error" 
          showIcon 
          className="error-alert"
        />
      ) : nfts.length === 0 ? (
        <div className="empty-state">
          <Empty 
            description="您还没有拥有任何广告牌NFT" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
          <div className="empty-actions">
            <Button type="primary" icon={<PlusOutlined />}>
              <Link to="/ad-spaces">浏览广告位</Link>
            </Button>
          </div>
        </div>
      ) : (
        <Tabs 
          defaultActiveKey="active" 
          className="nft-tabs"
          items={getTabItems()}
        />
      )}
    </div>
  );
};

export default MyNFTsPage;