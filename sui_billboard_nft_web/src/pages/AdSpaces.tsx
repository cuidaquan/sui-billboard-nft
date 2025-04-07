import React, { useState, useEffect } from 'react';
import { Typography, Card, Row, Col, Empty, Spin, Button, Input, Select, Tooltip } from 'antd';
import { Link } from 'react-router-dom';
import { getAvailableAdSpaces } from '../utils/contract';
import { AdSpace, UserRole } from '../types';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import './AdSpaces.scss';
import AdSpaceCard from '../components/adSpace/AdSpaceCard';
import { SearchOutlined, AppstoreOutlined, SortAscendingOutlined, BlockOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

// 粒子动画组件
const ParticlesBackground = () => (
  <div className="particles-background">
    <div className="particles"></div>
  </div>
);

const AdSpacesPage: React.FC = () => {
  const [adSpaces, setAdSpaces] = useState<AdSpace[]>([]);
  const [filteredSpaces, setFilteredSpaces] = useState<AdSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.USER);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<string>('default');
  
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
        setFilteredSpaces(spaces);
      } catch (error) {
        console.error('获取广告位失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdSpaces();
  }, []);
  
  // 处理搜索和排序
  useEffect(() => {
    let result = [...adSpaces];
    
    // 应用搜索筛选
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(space => 
        space.name.toLowerCase().includes(query) || 
        space.location.toLowerCase().includes(query)
      );
    }
    
    // 应用排序
    if (sortOrder === 'price-asc') {
      result.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortOrder === 'price-desc') {
      result.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    } else if (sortOrder === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === 'location') {
      result.sort((a, b) => a.location.localeCompare(b.location));
    }
    
    setFilteredSpaces(result);
  }, [adSpaces, searchQuery, sortOrder]);
  
  // 刷新页面数据
  const refreshData = async () => {
    setLoading(true);
    try {
      const spaces = await getAvailableAdSpaces();
      setAdSpaces(spaces);
      setFilteredSpaces(spaces);
    } catch (error) {
      console.error('刷新广告位失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="ad-spaces-page">
      <ParticlesBackground />
      
      <div className="page-header">
        <Title level={2}>可用广告位</Title>
        <Text className="subtitle">浏览以下可用的链上广告位，选择最适合您营销策略的位置，实现区块链上的品牌展示</Text>
      </div>
      
      {/* 过滤器和排序区域 */}
      {!loading && adSpaces.length > 0 && adSpaces[0].id !== '0x0' && (
        <div className="filters-section">
          <div className="search-filter">
            <Input 
              placeholder="搜索广告位名称或位置" 
              prefix={<SearchOutlined />} 
              onChange={(e) => setSearchQuery(e.target.value)}
              value={searchQuery}
              allowClear
            />
          </div>
          
          <div className="sort-filters">
            <Select
              defaultValue="default"
              onChange={(value) => setSortOrder(value)}
              value={sortOrder}
              placeholder="排序方式"
              suffixIcon={<SortAscendingOutlined />}
            >
              <Option value="default">默认排序</Option>
              <Option value="price-asc">价格从低到高</Option>
              <Option value="price-desc">价格从高到低</Option>
              <Option value="name">名称排序</Option>
              <Option value="location">位置排序</Option>
            </Select>
            
            <Tooltip title="刷新数据">
              <Button 
                icon={<ReloadOutlined />} 
                onClick={refreshData}
                loading={loading}
                className="refresh-button"
              />
            </Tooltip>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="loading-container">
          <Spin size="large" />
          <p>加载广告位中...</p>
        </div>
      ) : filteredSpaces.length > 0 && filteredSpaces[0].id !== '0x0' ? (
        <Row gutter={[24, 24]} className="ad-spaces-grid">
          {filteredSpaces.map(adSpace => (
            <Col xs={24} sm={12} md={8} lg={6} key={adSpace.id} className="animate-card">
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
          <BlockOutlined className="empty-icon" />
          <div className="empty-description">
            <p>暂无可用的广告位</p>
            <p className="empty-subtitle">广告位资源由区块链游戏开发者创建，请稍后再来查看或联系平台管理员</p>
          </div>
          <div className="empty-actions">
            <Button 
              onClick={refreshData}
              type="primary"
              icon={<ReloadOutlined />}
            >
              刷新页面
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdSpacesPage; 