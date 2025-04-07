import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Typography, Button, Spin, Card, Alert, Divider, Row, Col } from 'antd';
import { ShoppingCartOutlined, InfoCircleOutlined, ReloadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { AdSpace, UserRole } from '../types';
import { getAdSpaceDetails, formatSuiAmount } from '../utils/contract';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import './AdSpaceDetail.scss';

const { Title, Paragraph } = Typography;

const AdSpaceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  
  const [adSpace, setAdSpace] = useState<AdSpace | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.USER);
  
  // 检查用户角色
  useEffect(() => {
    const checkUserRole = async () => {
      if (!account) return;
      
      try {
        // 导入auth.ts中的checkUserRole函数
        const { checkUserRole } = await import('../utils/auth');
        
        // 使用SuiClient和用户地址检查用户角色
        const role = await checkUserRole(suiClient, account.address);
        console.log('当前用户角色:', role);
        setUserRole(role);
      } catch (err) {
        console.error('检查用户角色失败:', err);
      }
    };
    
    checkUserRole();
  }, [account, suiClient]);
  
  const fetchAdSpace = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('正在获取广告位详情, ID:', id);
      const space = await getAdSpaceDetails(id);
      console.log('获取广告位结果:', space);
      
      // 如果存在creator字段，输出详细信息
      if (space && (space as any).creator) {
        console.log('广告位创建者信息:', {
          id: space.id,
          name: space.name,
          creator: (space as any).creator,
          creatorType: typeof (space as any).creator,
        });
      } else {
        console.log('广告位没有creator字段:', space?.id);
      }
      
      setAdSpace(space);
      
      if (!space) {
        setError('未找到广告位或广告位不可用。如果您刚刚创建此广告位，请稍后再试。');
      }
    } catch (err) {
      console.error('获取广告位详情失败:', err);
      setError('获取广告位详情失败，请稍后再试。');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchAdSpace();
  }, [id]);
  
  const handleRefresh = () => {
    fetchAdSpace();
  };
  
  const handleBack = () => {
    navigate('/ad-spaces');
  };
  
  // 判断是否应该显示购买按钮
  const shouldShowPurchase = () => {
    if (!adSpace || !adSpace.available) {
      return false;
    }
    
    // 如果是管理员，不显示购买按钮
    if (userRole === UserRole.ADMIN) {
      console.log('用户是管理员，不显示购买按钮');
      return false;
    }
    
    // 获取creator信息并转换为小写
    const creator = (adSpace as any).creator || null;
    const creatorAddress = creator ? creator.toLowerCase() : null;
    const userAddress = account ? account.address.toLowerCase() : null;
    
    console.log('广告位创建者信息:', {
      creator: creatorAddress,
      userAddress: userAddress,
      isMatch: creatorAddress === userAddress
    });
    
    // 如果是游戏开发者，且是自己创建的广告位，不显示购买按钮
    if (userRole === UserRole.GAME_DEV && 
        creatorAddress && 
        userAddress && 
        creatorAddress === userAddress) {
      console.log('当前用户是开发者且是广告位创建者，不显示购买按钮');
      return false;
    }
    
    return true;
  };
  
  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <p>加载广告位信息...</p>
      </div>
    );
  }
  
  if (error || !adSpace) {
    return (
      <div className="error-container">
        <Alert
          message="广告位加载失败"
          description={error || "未找到广告位信息"}
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
    );
  }

  return (
    <div className="ad-space-detail-page">
      <div className="ad-space-header">
        <Title level={2}>{adSpace.name}</Title>
      </div>
      
      <Card>
        <div className="ad-space-content">
          <div className="ad-space-image">
            <div className="ad-space-detail-placeholder">
              <div className="placeholder-content">
                <Title level={3}>{adSpace.name}</Title>
                <Paragraph>{adSpace.dimension.width} x {adSpace.dimension.height} 像素</Paragraph>
              </div>
            </div>
          </div>
          <div className="ad-space-info">
            <Title level={4}>{adSpace.name}</Title>
            <Paragraph>{adSpace.description}</Paragraph>
            <Paragraph>位置: {adSpace.location}</Paragraph>
            <Paragraph>尺寸: {adSpace.dimension.width} x {adSpace.dimension.height} 像素</Paragraph>
            <Divider />
            
            <div className="price-detail">
              <Title level={5}>价格详情</Title>
              <Paragraph>
                <strong>基础价格:</strong> {formatSuiAmount(adSpace.price)} SUI / 天
              </Paragraph>
              {adSpace.price_description && (
                <Paragraph className="price-description">
                  <InfoCircleOutlined /> {adSpace.price_description}
                </Paragraph>
              )}
            </div>
            
            <Divider />
            
            {adSpace.available ? (
              shouldShowPurchase() ? (
                <div className="purchase-section">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Link to={`/ad-spaces/${adSpace.id}/purchase`}>
                        <Button 
                          type="primary" 
                          icon={<ShoppingCartOutlined />} 
                          size="large"
                          block
                        >
                          立即购买广告位
                        </Button>
                      </Link>
                      <Paragraph className="purchase-note" style={{ marginTop: '8px' }}>
                        点击后可配置租赁天数和广告内容
                      </Paragraph>
                    </Col>
                  </Row>
                </div>
              ) : (
                <Alert
                  message={userRole === UserRole.GAME_DEV ? "这是您创建的广告位" : "无法购买广告位"}
                  description={userRole === UserRole.GAME_DEV ? "开发者不能购买自己创建的广告位" : "管理员不能购买广告位"}
                  type="info"
                  showIcon
                />
              )
            ) : (
              <Alert
                message="此广告位已售出"
                description="该广告位目前不可用，您可以浏览其他可用广告位。"
                type="info"
                showIcon
              />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdSpaceDetailPage;
 