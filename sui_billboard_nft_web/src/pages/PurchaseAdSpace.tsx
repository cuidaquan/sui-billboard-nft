import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Spin, Alert, message, Button } from 'antd';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { AdSpace, PurchaseAdSpaceParams, UserRole } from '../types';
import AdSpaceForm from '../components/adSpace/AdSpaceForm';
import { getAdSpaceDetails, createPurchaseAdSpaceTx, getUserNFTs, getNFTDetails } from '../utils/contract';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import './PurchaseAdSpace.scss';

const { Title, Paragraph } = Typography;

const PurchaseAdSpacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  
  const [adSpace, setAdSpace] = useState<AdSpace | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.USER);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(true);
  
  // 检查用户角色
  useEffect(() => {
    const checkUserRole = async () => {
      if (!account) return;
      
      try {
        // 导入auth.ts中的checkUserRole函数
        const { checkUserRole } = await import('../utils/auth');
        
        // 使用SuiClient和用户地址检查用户角色
        const role = await checkUserRole(account.address, suiClient);
        console.log('当前用户角色:', role);
        setUserRole(role);
      } catch (err) {
        console.error('检查用户角色失败:', err);
      }
    };
    
    checkUserRole();
  }, [account, suiClient]);
  
  // 获取广告位详情
  const fetchAdSpace = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('正在获取广告位详情, ID:', id);
      const space = await getAdSpaceDetails(id);
      console.log('获取广告位结果:', space);
      
      setAdSpace(space);
      
      if (!space) {
        setError('未找到广告位或广告位不可用。如果您刚刚创建此广告位，请稍后再试。');
        return;
      } 
      
      if (!space.available) {
        setError('此广告位已被购买，请选择其他可用广告位。');
        return;
      }
      
      // 检查用户是否有权限购买
      if (userRole === UserRole.ADMIN) {
        setError('管理员不能购买广告位');
        setIsAuthorized(false);
        return;
      }
      
      // 获取creator信息并转换为小写
      const creator = (space as any).creator || null;
      const creatorAddress = creator ? creator.toLowerCase() : null;
      const userAddress = account ? account.address.toLowerCase() : null;
      
      console.log('广告位创建者信息:', {
        adSpaceId: space.id,
        creator: creatorAddress,
        userAddress: userAddress,
        isMatch: creatorAddress === userAddress,
        userRole
      });
      
      // 如果是游戏开发者，检查是否是自己创建的广告位
      if (userRole === UserRole.GAME_DEV && 
          creatorAddress && 
          userAddress && 
          creatorAddress === userAddress) {
        console.log('当前用户是开发者且是广告位创建者，不允许购买');
        setError('游戏开发者不能购买自己创建的广告位');
        setIsAuthorized(false);
        return;
      }
      
      // 检查用户是否已经拥有该广告位的NFT
      if (userAddress && space.nft_ids && space.nft_ids.length > 0) {
        console.log('检查用户是否已拥有此广告位的NFT');
        
        let hasActiveOrPendingNFT = false;
        const now = new Date();
        
        // 获取该广告位下所有NFT的详情
        for (const nftId of space.nft_ids) {
          const nftDetails = await getNFTDetails(nftId);
          
          if (nftDetails && nftDetails.owner.toLowerCase() === userAddress) {
            const leaseStart = new Date(nftDetails.leaseStart);
            const leaseEnd = new Date(nftDetails.leaseEnd);
            
            // 检查NFT是否是活跃的或待展示的
            if ((now >= leaseStart && now <= leaseEnd) || // 活跃中
                (now < leaseStart)) { // 待展示
              console.log(`用户已拥有广告位[${space.id}]的NFT[${nftId}]，不允许再次购买`);
              hasActiveOrPendingNFT = true;
              break;
            }
          }
        }
        
        if (hasActiveOrPendingNFT) {
          setError('您已拥有此广告位的活跃或待展示NFT，不能再次购买');
          setIsAuthorized(false);
          return;
        }
      }
    } catch (err) {
      console.error('获取广告位详情失败:', err);
      setError('获取广告位详情失败，请稍后再试。');
    } finally {
      setLoading(false);
    }
  };
  
  // 当用户角色或广告位ID变化时重新获取数据
  useEffect(() => {
    fetchAdSpace();
  }, [id, userRole, account]);
  
  const handleRefresh = () => {
    fetchAdSpace();
  };
  
  const handleBack = () => {
    navigate('/ad-spaces');
  };
  
  // 处理表单提交
  const handleSubmit = async (values: PurchaseAdSpaceParams) => {
    if (!account || !adSpace) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      // 显示交易执行中状态
      message.loading({ content: '正在购买广告位...', key: 'purchaseAdSpace', duration: 0 });
      
      // 创建交易
      const txb = createPurchaseAdSpaceTx(values);
      
      // 执行交易
      await signAndExecute({
        transaction: txb
      });
      
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
        
        <div className="error-actions">
          <Button 
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
          >
            返回广告位列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="purchase-page">
      <div className="section-title">
        <Title level={2}>购买广告位</Title>
        <Paragraph>填写以下信息以购买广告位。</Paragraph>
      </div>
      
      {/* 添加装饰元素 */}
      <div className="decoration-element top-right"></div>
      <div className="decoration-element bottom-left"></div>
      
      {loading ? (
        <div className="loading-container">
          <Spin size="large" />
          <p>加载广告位信息...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <Alert 
            message="广告位加载失败" 
            description={error} 
            type="error" 
            showIcon
          />
          <div className="error-actions">
            <Button 
              type="primary" 
              icon={<ReloadOutlined />} 
              onClick={handleRefresh}
              style={{ marginRight: '10px' }}
            >
              重新加载
            </Button>
            <Button 
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
            >
              返回广告位列表
            </Button>
          </div>
        </div>
      ) : adSpace ? (
        <div className="fade-in">
          <AdSpaceForm 
            adSpace={adSpace}
            onSubmit={handleSubmit}
            isLoading={submitting}
          />
        </div>
      ) : (
        <div className="error-container">
          <Alert 
            message="未找到广告位" 
            description="未找到请求的广告位，可能已被删除或尚未创建。" 
            type="error" 
            showIcon
          />
          <div className="error-actions">
            <Button 
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
            >
              返回广告位列表
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseAdSpacePage; 