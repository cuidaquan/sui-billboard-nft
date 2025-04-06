import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Spin, Alert, message } from 'antd';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { AdSpace, PurchaseAdSpaceParams } from '../types';
import AdSpaceForm from '../components/adSpace/AdSpaceForm';
import { getAdSpaceDetails, createPurchaseAdSpaceTx, getUserNFTs } from '../utils/contract';
import './PurchaseAdSpace.scss';

const { Title, Paragraph } = Typography;

const PurchaseAdSpacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const account = useCurrentAccount();
  
  const [adSpace, setAdSpace] = useState<AdSpace | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // 获取广告位详情
  useEffect(() => {
    const fetchAdSpace = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const space = await getAdSpaceDetails(id);
        setAdSpace(space);
        
        if (!space) {
          setError('未找到广告位或广告位不可用');
        }
      } catch (err) {
        console.error('获取广告位详情失败:', err);
        setError('获取广告位详情失败，请稍后再试。');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAdSpace();
  }, [id]);
  
  // 处理表单提交
  const handleSubmit = async (values: PurchaseAdSpaceParams) => {
    if (!account || !adSpace) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      // 显示交易执行中状态
      message.loading({ content: '正在购买广告位...', key: 'purchaseAdSpace', duration: 0 });
      
      // 创建并执行交易
      await createPurchaseAdSpaceTx(values);
      
      // 交易已提交，显示提交成功消息
      message.success({ content: '广告位购买交易已提交', key: 'purchaseAdSpace', duration: 2 });
      message.loading({ content: '等待交易确认...', key: 'confirmPurchase', duration: 0 });
      
      // 使用轮询方式检查交易结果，最多尝试5次
      let attempts = 0;
      const maxAttempts = 5;
      let success = false;
      
      while (attempts < maxAttempts && !success) {
        attempts++;
        // 增加等待时间
        const delay = 2000 * attempts;
        console.log(`等待购买确认，尝试 ${attempts}/${maxAttempts}，等待 ${delay}ms...`);
        
        // 等待一段时间再检查
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
          // 从链上获取最新的NFT数据
          const userNfts = await getUserNFTs(account.address);
          
          // 检查是否已包含新购买的NFT
          const foundNewNFT = userNfts.some(nft => 
            nft.adSpaceId === adSpace.id && nft.isActive);
          
          if (foundNewNFT) {
            success = true;
            console.log('成功确认广告位购买');
            
            // 显示成功确认消息
            message.success({ 
              content: '广告位购买成功！', 
              key: 'confirmPurchase', 
              duration: 2 
            });
          } else {
            console.log('尚未检测到新购买的NFT，将继续重试');
          }
        } catch (err) {
          console.warn(`检查交易结果时出错 (尝试 ${attempts}): `, err);
        }
      }
      
      // 无论是否成功确认，都导航到我的NFT页面
      navigate('/my-nfts');
    } catch (err) {
      console.error('购买广告位失败:', err);
      setError('购买广告位失败，请检查输入并重试。');
      message.error({ content: '广告位购买失败', key: 'purchaseAdSpace', duration: 2 });
    } finally {
      setSubmitting(false);
    }
  };
  
  // 检查用户是否已连接钱包
  if (!account) {
    return (
      <div className="purchase-page">
        <div className="section-title">
          <Title level={2}>购买广告位</Title>
          <Paragraph>请先连接钱包以购买广告位。</Paragraph>
        </div>
        
        <Alert 
          message="请连接钱包" 
          description="您需要连接钱包才能购买广告位。" 
          type="info" 
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="purchase-page">
      <div className="section-title">
        <Title level={2}>购买广告位</Title>
        <Paragraph>填写以下信息以购买广告位。</Paragraph>
      </div>
      
      {loading ? (
        <div className="loading-container">
          <Spin size="large" />
          <p>加载广告位信息...</p>
        </div>
      ) : error ? (
        <Alert 
          message="错误" 
          description={error} 
          type="error" 
          showIcon
        />
      ) : adSpace ? (
        <AdSpaceForm 
          adSpace={adSpace}
          onSubmit={handleSubmit}
          isLoading={submitting}
        />
      ) : (
        <Alert 
          message="未找到" 
          description="未找到请求的广告位。" 
          type="error" 
          showIcon
        />
      )}
    </div>
  );
};

export default PurchaseAdSpacePage; 