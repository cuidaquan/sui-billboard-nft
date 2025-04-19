import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Tag, Spin, Popconfirm, Col } from 'antd';
import { ColumnWidthOutlined, DollarOutlined, DeleteOutlined } from '@ant-design/icons';
import { AdSpace, BillboardNFT } from '../../types';
import { getNFTDetails } from '../../utils/contract';

const { Text } = Typography;

interface AdSpaceItemProps {
  adSpace: AdSpace;
  onUpdatePrice: (adSpace: AdSpace) => void;
  onDeleteAdSpace: (adSpaceId: string) => void;
  deleteLoading: boolean;
}

const AdSpaceItem: React.FC<AdSpaceItemProps> = ({ 
  adSpace, 
  onUpdatePrice, 
  onDeleteAdSpace, 
  deleteLoading 
}) => {
  const [loadingNft, setLoadingNft] = useState(false);
  const [activeNft, setActiveNft] = useState<BillboardNFT | null>(null);

  // 如果这是示例数据，不要显示完整卡片
  if (adSpace.isExample) {
    return (
      <Col xs={24}>
        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f9f9f9', borderRadius: '8px' }}>
          <ColumnWidthOutlined style={{ fontSize: '48px', color: '#4e63ff', marginBottom: '16px' }} />
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>{adSpace.name}</div>
          <div style={{ color: 'rgba(0, 0, 0, 0.45)', marginBottom: '24px' }}>{adSpace.description}</div>
        </div>
      </Col>
    );
  }

  // 获取当前活跃的NFT
  useEffect(() => {
    const getActiveNft = async () => {
      if (!adSpace.nft_ids || adSpace.nft_ids.length === 0) {
        return;
      }

      try {
        setLoadingNft(true);
        
        // 尝试获取每个NFT详情，找到活跃的
        for (const nftId of adSpace.nft_ids) {
          const nft = await getNFTDetails(nftId);
          if (nft && nft.isActive) {
            setActiveNft(nft);
            break;
          }
        }
      } catch (error) {
        console.error('获取活跃NFT失败:', error);
      } finally {
        setLoadingNft(false);
      }
    };

    getActiveNft();
  }, [adSpace.nft_ids]);

  return (
    <Col xs={24} sm={12} md={8}>
      <Card className="ad-space-card">
        <div className="card-cover">
          {loadingNft ? (
            <div className="loading-container">
              <Spin />
            </div>
          ) : activeNft && activeNft.contentUrl ? (
            <div className="active-nft-cover">
              <img 
                src={activeNft.contentUrl} 
                alt={activeNft.brandName || '广告内容'} 
                className="ad-space-image"
                onError={(e) => {
                  console.error(`NFT图片加载失败:`, activeNft.contentUrl);
                  // 图片加载失败时，显示占位符
                  (e.target as HTMLImageElement).src = `https://via.placeholder.com/${adSpace.dimension.width}x${adSpace.dimension.height}?text=广告内容`;
                }}
              />
              <Tag className="active-tag" color="green">活跃中</Tag>
            </div>
          ) : (
            <div className="empty-ad-space-placeholder">
              <ColumnWidthOutlined />
              <Text>{adSpace.dimension.width} x {adSpace.dimension.height}</Text>
              <Text>等待广告内容</Text>
            </div>
          )}
          <div className="availability-badge">
            <span className={adSpace.available ? "available" : "unavailable"}>
              {adSpace.available ? "可购买" : "已占用"}
            </span>
          </div>
        </div>
        <Card.Meta
          title={adSpace.name}
          className="ad-space-meta"
        />
        <div className="ad-space-info">
          <div className="info-item">
            <span className="label">位置:</span>
            <span className="value">{adSpace.location}</span>
          </div>
          <div className="info-item">
            <span className="label">尺寸:</span>
            <span className="value">{`${adSpace.dimension.width}x${adSpace.dimension.height}`}</span>
          </div>
          <div className="info-item">
            <span className="label">价格:</span>
            <span className="value price">
              {parseFloat((Number(adSpace.price) / 1000000000).toFixed(9))} SUI/天
            </span>
          </div>
        </div>
        <div className="action-buttons">
          <Button 
            className="edit-button"
            onClick={() => onUpdatePrice(adSpace)}
            icon={<DollarOutlined />}
          >
            更改价格
          </Button>
          <Popconfirm
            title="确定要删除此广告位吗?"
            description="删除后无法恢复，如有活跃NFT将无法删除"
            onConfirm={() => onDeleteAdSpace(adSpace.id)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ loading: deleteLoading }}
          >
            <Button
              className="delete-button"
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </div>
      </Card>
    </Col>
  );
};

export default AdSpaceItem; 