import React, { useState, useEffect } from 'react';
import { Typography, Card, Row, Col, Empty, Spin, Button } from 'antd';
import { Link } from 'react-router-dom';
import { getAvailableAdSpaces } from '../utils/contract';
import { AdSpace, UserRole } from '../types';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import './AdSpaces.scss';
import AdSpaceCard from '../components/adSpace/AdSpaceCard';

const { Title, Text } = Typography;

const AdSpacesPage: React.FC = () => {
  const [adSpaces, setAdSpaces] = useState<AdSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.USER);
  
  const account = useCurrentAccount();
  const suiClient = useSuiClient();

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

  // 获取广告位数据
  useEffect(() => {
    const fetchAdSpaces = async () => {
      try {
        const spaces = await getAvailableAdSpaces();
        setAdSpaces(spaces);
      } catch (error) {
        console.error('获取广告位失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdSpaces();
  }, []);
  
  return (
    <div className="ad-spaces-page">
      <Title level={2}>可用广告位</Title>
      <Text className="subtitle">浏览以下可用的广告位，点击查看详情或购买</Text>
      
      {loading ? (
        <div className="loading-container">
          <Spin size="large" />
          <p>加载广告位...</p>
        </div>
      ) : adSpaces.length > 0 && adSpaces[0].id !== '0x0' ? (
        <Row gutter={[24, 24]} className="ad-spaces-grid">
          {adSpaces.map(adSpace => (
            <Col xs={24} sm={12} md={8} lg={6} key={adSpace.id}>
              <AdSpaceCard 
                adSpace={adSpace}
                userRole={userRole}
                creatorAddress={(adSpace as any).creator}
              />
            </Col>
          ))}
        </Row>
      ) : (
        <div className="empty-state-container">
          <Empty 
            description={
              <div className="empty-description">
                <p>目前没有可用的广告位</p>
                <p className="empty-subtitle">广告位由游戏开发者创建，请稍后再来查看</p>
              </div>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <div className="empty-actions">
              <Button 
                onClick={() => window.location.reload()}
                type="primary"
              >
                刷新页面
              </Button>
            </div>
          </Empty>
        </div>
      )}
    </div>
  );
};

export default AdSpacesPage; 