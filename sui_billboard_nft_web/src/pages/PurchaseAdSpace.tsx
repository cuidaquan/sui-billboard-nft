import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Spin, Alert } from 'antd';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { AdSpace, PurchaseAdSpaceParams } from '../types';
import AdSpaceForm from '../components/adSpace/AdSpaceForm';
import { getAdSpaceDetails, createPurchaseAdSpaceTx } from '../utils/contract';
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
      
      // 创建并执行交易
      await createPurchaseAdSpaceTx(values);
      
      // 模拟成功，实际项目中应当检查交易结果
      const response = { status: "success" };
      
      // 交易成功
      if (response) {
        // 导航到我的NFT页面
        navigate('/my-nfts');
      }
    } catch (err) {
      console.error('购买广告位失败:', err);
      setError('购买广告位失败，请检查输入并重试。');
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