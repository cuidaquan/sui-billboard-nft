import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Card, Typography, Alert, Spin, Button, Descriptions, Space, Tag, Modal, Input, Form, Select, message } from 'antd';
import { EditOutlined, ClockCircleOutlined, LinkOutlined } from '@ant-design/icons';
import { BillboardNFT, RenewNFTParams } from '../types';
import { getNFTDetails, calculateLeasePrice, formatSuiAmount, createRenewLeaseTx } from '../utils/contract';
import { formatDate, truncateAddress } from '../utils/format';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import './NFTDetail.scss';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

const NFTDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [nft, setNft] = useState<BillboardNFT | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // 获取钱包和交易执行能力
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  
  // 模态框状态
  const [updateContentVisible, setUpdateContentVisible] = useState<boolean>(false);
  const [renewLeaseVisible, setRenewLeaseVisible] = useState<boolean>(false);
  const [contentUrl, setContentUrl] = useState<string>('');
  const [renewDays, setRenewDays] = useState<number>(30);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [calculatingPrice, setCalculatingPrice] = useState<boolean>(false);
  const [renewPrice, setRenewPrice] = useState<string>('0');

  // 本地日期格式化函数（带时间）
  const formatDateWithTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '无效日期';
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}/${month}/${day} ${hours}:${minutes}`;
    } catch (error) {
      return '无效日期';
    }
  };

  // 检查是否是续期路径
  useEffect(() => {
    if (location.pathname.includes('/renew')) {
      setRenewLeaseVisible(true);
    }
  }, [location.pathname]);

  // 获取NFT详情
  useEffect(() => {
    const fetchNFTDetails = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const nftDetails = await getNFTDetails(id);
        setNft(nftDetails);
        
        if (!nftDetails) {
          setError('未找到NFT详情');
        } else {
          setContentUrl(nftDetails.contentUrl);
        }
      } catch (err) {
        console.error('获取NFT详情失败:', err);
        setError('获取NFT详情失败，请稍后再试。');
      } finally {
        setLoading(false);
      }
    };
    
    fetchNFTDetails();
  }, [id]);

  // 计算续租价格
  useEffect(() => {
    if (!nft || !renewLeaseVisible) return;
    
    const fetchPrice = async () => {
      setCalculatingPrice(true);
      try {
        const price = await calculateLeasePrice(nft.adSpaceId, renewDays);
        setRenewPrice(formatSuiAmount(price));
        
        // 如果有账户，检查余额是否足够
        if (account && suiClient) {
          try {
            // 获取用户余额
            const { totalBalance } = await suiClient.getBalance({
              owner: account.address,
              coinType: '0x2::sui::SUI'
            });
            
            const priceValue = BigInt(price);
            const balanceValue = BigInt(totalBalance);
            
            // 显示余额信息
            console.log('钱包余额:', formatSuiAmount(totalBalance), 'SUI');
            console.log('续租价格:', formatSuiAmount(price), 'SUI');
            
            // 如果余额不足，显示警告
            if (balanceValue < priceValue) {
              message.warning({
                content: `余额不足！需要 ${formatSuiAmount(price)} SUI，但钱包只有 ${formatSuiAmount(totalBalance)} SUI`,
                duration: 5
              });
            }
          } catch (balanceError) {
            console.error('检查余额失败:', balanceError);
          }
        }
      } catch (error) {
        console.error('获取续租价格失败:', error);
        // 默认价格计算方式 (仅作为备用)
        setRenewPrice((0.1 * renewDays).toFixed(6));
      } finally {
        setCalculatingPrice(false);
      }
    };
    
    fetchPrice();
  }, [nft, renewDays, renewLeaseVisible, account, suiClient]);

  // 更新广告内容
  const handleUpdateContent = async () => {
    if (!nft || !account) return;
    
    try {
      setSubmitting(true);
      
      // 创建更新参数
      const params = {
        nftId: nft.id,
        contentUrl: contentUrl
      };
      
      // 显示交易执行中状态
      message.loading({ 
        content: '正在更新广告内容...', 
        key: 'updateContent', 
        duration: 0 
      });
      
      // 导入创建更新广告内容交易的函数
      const { createUpdateAdContentTx } = await import('../utils/contract');
      
      // 创建交易
      const txb = createUpdateAdContentTx(params);
      
      // 执行交易
      await signAndExecute({
        transaction: txb.serialize()
      });
      
      // 交易已提交，显示提交成功消息
      message.success({ 
        content: '更新交易已提交', 
        key: 'updateContent', 
        duration: 2 
      });
      
      message.loading({ 
        content: '等待交易确认...', 
        key: 'confirmUpdate', 
        duration: 0 
      });
      
      // 使用轮询方式检查交易结果，最多尝试5次
      let attempts = 0;
      const maxAttempts = 5;
      let success = false;
      
      while (attempts < maxAttempts && !success) {
        attempts++;
        // 增加等待时间
        const delay = 2000 * attempts;
        console.log(`等待更新确认，尝试 ${attempts}/${maxAttempts}，等待 ${delay}ms...`);
        
        // 等待一段时间再检查
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
          // 从链上获取最新的NFT数据
          const updatedNft = await getNFTDetails(nft.id);
          
          // 检查内容是否已更新
          if (updatedNft && updatedNft.contentUrl === contentUrl) {
            success = true;
            console.log('成功确认广告内容更新');
            
            // 更新本地数据
            setNft(updatedNft);
            
            // 显示成功确认消息
            message.success({ 
              content: '广告内容更新成功！', 
              key: 'confirmUpdate', 
              duration: 2 
            });
            
            // 关闭对话框
            setUpdateContentVisible(false);
          } else {
            console.log('尚未检测到内容更新，将继续重试');
          }
        } catch (err) {
          console.warn(`检查交易结果时出错 (尝试 ${attempts}): `, err);
        }
      }
      
      // 如果无法确认成功，但交易已提交，仍视为部分成功
      if (!success) {
        message.info({
          content: '交易已提交，但无法立即确认结果。请稍后刷新页面查看更新。',
          key: 'confirmUpdate',
          duration: 5
        });
        
        // 关闭更新对话框
        setUpdateContentVisible(false);
      }
    } catch (err) {
      console.error('更新内容失败:', err);
      message.error({ 
        content: '更新广告内容失败，请检查钱包并重试', 
        key: 'updateContent' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 处理关闭续期对话框
  const closeRenewModal = () => {
    setRenewLeaseVisible(false);
    
    // 如果当前路径是续期路径，则返回到NFT详情页
    if (location.pathname.includes('/renew')) {
      window.history.pushState({}, '', `/my-nfts/${id}`);
    }
  };

  // 续租NFT
  const handleRenewLease = async () => {
    if (!nft || !account) return;
    
    // 检查NFT是否已过期
    if (isExpired) {
      message.error('此NFT已过期，根据合约规定，不能对已过期的NFT进行续租。');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // 验证续租条件
      if (!renewDays || renewDays <= 0) {
        message.error('请选择有效的续租天数');
        return;
      }
      
      if (!renewPrice || Number(renewPrice) <= 0) {
        message.error('无效的续租价格，请刷新页面重试');
        return;
      }
      
      // 构建续租参数 - 价格单位直接使用原始单位，由createRenewLeaseTx处理单位转换
      const params: RenewNFTParams = {
        nftId: nft.id,
        adSpaceId: nft.adSpaceId,
        leaseDays: renewDays,
        price: (Number(renewPrice) * 1000000000).toString()
      };
      
      console.log('续租参数:', JSON.stringify(params, null, 2));
      
      // 显示交易执行中状态
      message.loading({ 
        content: '正在续租NFT...', 
        key: 'renewNft', 
        duration: 0 
      });
      
      // 创建交易
      const txb = createRenewLeaseTx(params);
      
      // 执行交易
      try {
        await signAndExecute({
          transaction: txb.serialize()
        });
        
        console.log('续租交易已提交');
        
        // 交易已提交，显示提交成功消息
        message.success({ 
          content: '续租交易已提交', 
          key: 'renewNft', 
          duration: 2 
        });
        
        // 等待交易确认
        await waitForTransactionConfirmation(nft, renewDays);
      } catch (txError) {
        console.error('交易执行失败:', txError);
        throw new Error(`交易执行失败: ${txError instanceof Error ? txError.message : '未知错误'}`);
      }
    } catch (err) {
      console.error('续租失败:', err);
      
      // 解析错误消息
      let errorMsg = '续租失败，请检查钱包并重试';
      
      // 尝试从错误对象中提取更详细的信息
      if (err instanceof Error) {
        if (err.message.includes('余额不足') || err.message.includes('budget')) {
          errorMsg = '续租失败：钱包余额不足，请确保有足够的SUI支付租金';
        } else if (err.message.includes('MoveAbort') && err.message.includes('renew_lease')) {
          if (err.message.includes('6)')) {
            errorMsg = '续租失败：余额不足或价格计算错误';
          } else if (err.message.includes('2)')) {
            errorMsg = '续租失败：NFT验证失败或租期计算错误';
          } else {
            errorMsg = `续租失败：合约执行错误 (${err.message})`;
          }
        } else if (err.message.includes('用户取消了交易')) {
          errorMsg = '您已取消续租操作';
        } else {
          // 提取错误消息的关键部分
          errorMsg = `续租失败: ${err.message.slice(0, 100)}${err.message.length > 100 ? '...' : ''}`;
        }
      }
      
      message.error({ 
        content: errorMsg, 
        key: 'renewNft', 
        duration: 6
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // 等待交易确认的辅助函数
  const waitForTransactionConfirmation = async (originalNft: BillboardNFT, renewDays: number) => {
    message.loading({ 
      content: '等待交易确认...', 
      key: 'confirmRenew', 
      duration: 0 
    });
    
    // 使用轮询方式检查交易结果，最多尝试5次
    let attempts = 0;
    const maxAttempts = 5;
    let success = false;
    
    while (attempts < maxAttempts && !success) {
      attempts++;
      // 增加等待时间
      const delay = 2000 * attempts;
      console.log(`等待续租确认，尝试 ${attempts}/${maxAttempts}，等待 ${delay}ms...`);
      
      // 等待一段时间再检查
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        // 从链上获取最新的NFT数据
        const updatedNft = await getNFTDetails(originalNft.id);
        
        // 检查是否已续期成功 - 比较租期结束时间
        const oldEndTime = new Date(originalNft.leaseEnd).getTime();
        const newEndTime = updatedNft ? new Date(updatedNft.leaseEnd).getTime() : 0;
        
        console.log('原租期结束时间:', new Date(originalNft.leaseEnd).toLocaleString());
        console.log('新租期结束时间:', updatedNft ? new Date(updatedNft.leaseEnd).toLocaleString() : '未获取');
        
        if (updatedNft && newEndTime > oldEndTime) {
          success = true;
          console.log('成功确认NFT续期，租期延长了:', Math.round((newEndTime - oldEndTime) / (24 * 60 * 60 * 1000)), '天');
          
          // 更新本地数据
          setNft(updatedNft);
          
          // 显示成功确认消息
          message.success({ 
            content: 'NFT续租成功！', 
            key: 'confirmRenew', 
            duration: 2 
          });
          
          // 关闭续租对话框
          closeRenewModal();
        } else {
          console.log('尚未检测到续租结果，将继续重试');
        }
      } catch (err) {
        console.warn(`检查交易结果时出错 (尝试 ${attempts}): `, err);
      }
    }
    
    // 如果无法确认成功，但交易已提交，仍视为部分成功
    if (!success) {
      message.info({
        content: '交易已提交，但无法立即确认结果。请稍后刷新页面查看更新。',
        key: 'confirmRenew',
        duration: 5
      });
      
      // 关闭续租对话框
      closeRenewModal();
    }
  };

  // 判断NFT是否已过期
  const isExpired = nft ? new Date(nft.leaseEnd) < new Date() : false;
  
  // 判断NFT状态：待展示、活跃中或已过期
  const getNftStatus = () => {
    if (!nft) return { status: 'unknown', color: 'default' };
    
    const now = new Date();
    const leaseStart = new Date(nft.leaseStart);
    const leaseEnd = new Date(nft.leaseEnd);
    
    if (now < leaseStart) {
      return { status: 'pending', color: 'blue', text: '待展示' };
    } else if (now > leaseEnd || !nft.isActive) {
      return { status: 'expired', color: 'red', text: '已过期' };
    } else {
      return { status: 'active', color: 'green', text: '活跃中' };
    }
  };
  
  // 检查当前用户是否为NFT所有者
  const isOwner = () => {
    if (!nft || !account) return false;
    return nft.owner.toLowerCase() === account.address.toLowerCase();
  };
  
  const nftStatus = getNftStatus();

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <p>加载NFT详情...</p>
      </div>
    );
  }
  
  if (error || !nft) {
    return (
      <Alert
        message="错误"
        description={error || "未找到NFT详情"}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div className="nft-detail-page">
      <div className="nft-header">
        <Title level={2}>{nft.brandName}</Title>
        <div className="status-tag">
          <Tag className={`status ${nftStatus.status}`} color={nftStatus.color}>
            {nftStatus.text}
          </Tag>
        </div>
      </div>
      
      <div className="nft-content">
        <div className="nft-image">
          <img src={nft.contentUrl} alt={nft.brandName} />
        </div>
        
        <div className="nft-details">
          <Card>
            <Descriptions title="NFT详情" bordered column={1}>
              <Descriptions.Item label="NFT ID">{truncateAddress(nft.id)}</Descriptions.Item>
              <Descriptions.Item label="广告位ID">
                <Space>
                  <Text>{truncateAddress(nft.adSpaceId)}</Text>
                  <Link to={`/ad-spaces/${nft.adSpaceId}`}>
                    <Button size="small" type="link" icon={<LinkOutlined />}>查看广告位</Button>
                  </Link>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="所有者">{truncateAddress(nft.owner)}</Descriptions.Item>
              <Descriptions.Item label="品牌名称">{nft.brandName}</Descriptions.Item>
              <Descriptions.Item label="项目网址">
                <a href={nft.projectUrl} target="_blank" rel="noopener noreferrer">
                  {nft.projectUrl}
                </a>
              </Descriptions.Item>
              <Descriptions.Item label="租期">
                <Space direction="vertical" size={4}>
                  <div>
                    <Text type="secondary">开始: </Text>
                    <Text strong>{formatDateWithTime(nft.leaseStart)}</Text>
                  </div>
                  <div>
                    <Text type="secondary">结束: </Text>
                    <Text strong>{formatDateWithTime(nft.leaseEnd)}</Text>
                  </div>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={nftStatus.color}>
                  {nftStatus.text}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            
            <div className="nft-actions">
              <Space size="middle">
                {isOwner() && (
                  <>
                    <Button 
                      type="primary" 
                      icon={<EditOutlined />} 
                      onClick={() => setUpdateContentVisible(true)}
                      disabled={nftStatus.status === 'expired'}
                    >
                      更新广告内容
                    </Button>
                    <Button 
                      type="default" 
                      icon={<ClockCircleOutlined />} 
                      onClick={() => {
                        // 检查NFT是否已过期，由于合约限制，暂时只允许未过期的NFT续租
                        if (nftStatus.status === 'expired') {
                          message.warning({
                            content: '由于合约限制，当前只能对未过期的NFT进行续租。此NFT已过期，请联系管理员。',
                            duration: 5
                          });
                          return;
                        }
                        setRenewLeaseVisible(true);
                      }}
                      danger={nftStatus.status === 'expired'}
                    >
                      {nftStatus.status === 'expired' ? "已过期无法续租" : "续租NFT"}
                    </Button>
                  </>
                )}
              </Space>
              {!isOwner() && (
                <Alert
                  message="仅NFT所有者可以更新内容或续租"
                  type="info"
                  showIcon
                  style={{ marginTop: '16px' }}
                />
              )}
            </div>
          </Card>
        </div>
      </div>
      
      {/* 更新广告内容模态框 */}
      <Modal
        title="更新广告内容"
        open={updateContentVisible}
        onCancel={() => setUpdateContentVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setUpdateContentVisible(false)}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={submitting} 
            onClick={handleUpdateContent}
          >
            更新
          </Button>
        ]}
      >
        <Form layout="vertical">
          <Form.Item 
            label="广告内容URL" 
            required 
            rules={[{ required: true, message: '请输入内容URL' }]}
          >
            <Input 
              placeholder="请输入内容URL" 
              value={contentUrl} 
              onChange={e => setContentUrl(e.target.value)}
            />
          </Form.Item>
          <Paragraph type="secondary">
            请输入新的广告内容URL，该URL应指向图片或其他媒体内容。
          </Paragraph>
        </Form>
      </Modal>
      
      {/* 续租NFT模态框 */}
      <Modal
        title="续租NFT"
        open={renewLeaseVisible}
        onCancel={closeRenewModal}
        footer={[
          <Button key="cancel" onClick={closeRenewModal}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={submitting || calculatingPrice}
            disabled={calculatingPrice}
            onClick={handleRenewLease}
          >
            续租
          </Button>
        ]}
      >
        <Form layout="vertical">
          <Form.Item 
            label="续租天数" 
            required 
          >
            <Select 
              value={renewDays} 
              onChange={(value) => setRenewDays(Number(value))}
              style={{ width: '100%' }}
            >
              <Option value={7}>7天</Option>
              <Option value={15}>15天</Option>
              <Option value={30}>30天</Option>
              <Option value={60}>60天</Option>
              <Option value={90}>90天</Option>
              <Option value={180}>180天</Option>
              <Option value={365}>365天</Option>
            </Select>
          </Form.Item>
          
          <div className="price-summary" style={{ marginBottom: '20px' }}>
            {calculatingPrice ? (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Spin size="small" style={{ marginRight: '10px' }} />
                <Text>计算价格中...</Text>
              </div>
            ) : (
              <div>
                <Text strong>续租价格: </Text>
                <Text>{renewPrice} SUI</Text>
              </div>
            )}
          </div>
          
          <Paragraph type="secondary">
            续租将延长NFT的租赁期限，价格由智能合约根据续租天数动态计算。
          </Paragraph>
        </Form>
      </Modal>
    </div>
  );
};

export default NFTDetailPage; 