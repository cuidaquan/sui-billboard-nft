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
  const [pendingNfts, setPendingNfts] = useState<BillboardNFT[]>([]);
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
        
        // 当前时间
        const now = new Date();
        
        // 分离活跃、待展示和过期的NFT
        const active: BillboardNFT[] = [];
        const pending: BillboardNFT[] = [];
        const expired: BillboardNFT[] = [];
        
        userNfts.forEach(nft => {
          const leaseStart = new Date(nft.leaseStart);
          const leaseEnd = new Date(nft.leaseEnd);
          
          if (now < leaseStart) {
            // 当前时间早于开始时间的为待展示
            pending.push(nft);
          } else if (now > leaseEnd || !nft.isActive) {
            // 当前时间晚于结束时间或状态为非活跃的为过期
            expired.push(nft);
          } else {
            // 当前时间在租期内且状态为活跃的为活跃
            active.push(nft);
          }
        });
        
        setActiveNfts(active);
        setPendingNfts(pending);
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
        key: 'pending',
        label: `待展示 (${pendingNfts.length})`,
        children: pendingNfts.length === 0 ? (
          <Empty description="没有待展示的NFT" />
        ) : (
          <div className="grid">
            {pendingNfts.map(nft => (
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