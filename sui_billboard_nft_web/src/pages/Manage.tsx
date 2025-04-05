import React, { useState, useEffect } from 'react';
import { Typography, Tabs, Form, Input, Button, InputNumber, Select, message, Alert, Card, List, Empty, Modal, Popconfirm, Row, Col, Spin } from 'antd';
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { CreateAdSpaceParams, UserRole, RegisterGameDevParams, RemoveGameDevParams, AdSpace } from '../types';
import { createAdSpaceTx, registerGameDevTx, removeGameDevTx, getCreatedAdSpaces } from '../utils/contract';
import { CONTRACT_CONFIG } from '../config/config';
import './Manage.scss';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const ManagePage: React.FC = () => {
  const [adSpaceForm] = Form.useForm();
  const [devRegisterForm] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.USER);
  const [registeredDevs, setRegisteredDevs] = useState<string[]>([]);
  const [activeKey, setActiveKey] = useState<string>("create");
  const [myAdSpaces, setMyAdSpaces] = useState<AdSpace[]>([]);
  const [loadingAdSpaces, setLoadingAdSpaces] = useState<boolean>(false);
  
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  
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
        
        // 如果是管理员，获取已注册的开发者列表
        if (role === UserRole.ADMIN) {
          const { getGameDevsFromFactory } = await import('../utils/contract');
          const devs = await getGameDevsFromFactory(CONTRACT_CONFIG.FACTORY_OBJECT_ID);
          setRegisteredDevs(devs);
        }
        
        // 如果是游戏开发者，获取其创建的广告位
        if (role === UserRole.GAME_DEV) {
          loadMyAdSpaces();
        }
      } catch (err) {
        console.error('检查用户角色失败:', err);
        message.error('检查用户角色失败');
      }
    };
    
    checkUserRole();
  }, [account, suiClient]);

  // 加载开发者创建的广告位
  const loadMyAdSpaces = async () => {
    if (!account) return;
    
    try {
      setLoadingAdSpaces(true);
      const adSpaces = await getCreatedAdSpaces(account.address);
      setMyAdSpaces(adSpaces);
    } catch (err) {
      console.error('获取开发者广告位失败:', err);
      message.error('获取广告位列表失败');
    } finally {
      setLoadingAdSpaces(false);
    }
  };

  // 创建广告位表单提交
  const handleCreateAdSpace = async (values: any) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('创建广告位，输入参数:', values);
      
      // 验证必填字段
      if (!values.gameId || !values.location || !values.size || !values.price) {
        throw new Error('请完整填写所有必填字段');
      }
      
      // 尺寸验证 - 确保格式符合要求
      if (values.size !== '小' && values.size !== '中' && values.size !== '大' && values.size !== '超大') {
        throw new Error('尺寸格式无效，请选择有效的尺寸选项');
      }
      
      // 价格验证 - 确保价格大于0
      if (Number(values.price) <= 0) {
        throw new Error('价格必须大于0');
      }
      
      // 将价格转换为整数（以MIST为单位，1 SUI = 10^9 MIST）
      const priceInMist = BigInt(Math.floor(Number(values.price) * 1000000000));
      
      console.log('转换后的价格(MIST):', priceInMist.toString());
      
      // 检查合约配置
      if (!CONTRACT_CONFIG.FACTORY_OBJECT_ID || !CONTRACT_CONFIG.PACKAGE_ID || !CONTRACT_CONFIG.MODULE_NAME || !CONTRACT_CONFIG.CLOCK_ID) {
        console.error('合约配置不完整:', CONTRACT_CONFIG);
        throw new Error('系统配置错误: 合约参数不完整');
      }
      
      const params: CreateAdSpaceParams = {
        factoryId: CONTRACT_CONFIG.FACTORY_OBJECT_ID,
        gameId: values.gameId,
        location: values.location,
        size: values.size,
        price: priceInMist.toString(),
        clockId: CONTRACT_CONFIG.CLOCK_ID
      };
      
      console.log('准备创建广告位，参数:', params);
      
      // 创建交易
      const txb = createAdSpaceTx(params);
      
      console.log('交易创建成功，准备执行');
      
      // 执行交易
      try {
        // 序列化交易
        const serializedTx = txb.serialize();
        console.log('交易序列化成功:', JSON.stringify(serializedTx));
        
        // 显示交易执行中状态
        message.loading({ content: '正在创建广告位...', key: 'createAdSpace', duration: 0 });
        
        // 执行交易
        const txResponse = await signAndExecute({
          transaction: serializedTx
        });
        
        console.log('交易执行成功，响应:', txResponse);
        
        // 交易成功后，显示成功消息
        message.success({ content: '广告位创建成功！', key: 'createAdSpace', duration: 2 });
        
        // 等待一段时间刷新广告位列表
        setTimeout(async () => {
          try {
            await loadMyAdSpaces();
            // 切换到我的广告位标签页
            setActiveKey('myAdSpaces');
          } catch (loadErr) {
            console.error('刷新广告位列表失败:', loadErr);
          }
        }, 1000);
      } catch (txError) {
        console.error('交易执行失败:', txError);
        const errorMsg = txError instanceof Error ? txError.message : String(txError);
        // 检查特定错误类型并提供更具体的错误信息
        if (errorMsg.includes('ENotGameDev')) {
          setError(`交易执行失败: 您不是注册的游戏开发者`);
        } else if (errorMsg.includes('InsufficientGas')) {
          setError(`交易执行失败: gas 费不足，请确保您的钱包中有足够的 SUI`);
        } else if (errorMsg.includes('InvalidParams') || errorMsg.includes('Invalid params')) {
          setError(`交易执行失败: 提供给智能合约的参数无效，请检查游戏ID、位置和尺寸格式是否符合要求`);
          console.error('交易参数:', params);
        } else {
          setError(`交易执行失败: ${errorMsg}`);
        }
        
        message.error({ content: '广告位创建失败，请稍后重试', key: 'createAdSpace', duration: 2 });
      }
    } catch (err) {
      console.error('创建广告位失败:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`创建广告位失败: ${errorMsg}`);
      message.error('创建广告位失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理标签页切换
  const handleTabChange = (key: string) => {
    setActiveKey(key);
    
    // 如果切换到"我的广告位"标签页，重新加载广告位列表
    if (key === 'myAdSpaces') {
      loadMyAdSpaces();
    }
  };
  
  // 注册游戏开发者
  const handleRegisterGameDev = async (values: any) => {
    try {
      setLoading(true);
      setError(null);
      
      // 规范化地址格式，确保统一格式用于比较
      const normalizedAddress = values.devAddress.toLowerCase();
      
      // 验证地址格式
      if (!normalizedAddress.startsWith('0x') || normalizedAddress.length !== 66) {
        setError('开发者地址格式无效，请输入有效的Sui钱包地址');
        setLoading(false);
        return;
      }
      
      // 检查开发者是否已经注册
      const isDevAlreadyRegistered = registeredDevs.some(
        dev => dev.toLowerCase() === normalizedAddress
      );
      
      if (isDevAlreadyRegistered) {
        setError('该地址已经注册为游戏开发者');
        setLoading(false);
        return;
      }

      // 创建交易
      const params: RegisterGameDevParams = {
        factoryId: CONTRACT_CONFIG.FACTORY_OBJECT_ID,
        developer: normalizedAddress
      };

      const txb = registerGameDevTx(params);
      
      // 显示交易执行中状态
      message.loading({
        content: '正在执行交易...',
        key: 'registerDev',
        duration: 0 // 不自动关闭
      });
      
      try {
        // 执行交易并等待结果
        const result = await signAndExecute({
          transaction: txb.serialize()
        });
        
        console.log('交易执行成功:', result);
        
        // 重置表单
        devRegisterForm.resetFields();
        
        // 显示成功消息
        message.success({
          content: '游戏开发者注册成功！',
          key: 'registerDev',
          duration: 2
        });
        
        // 显示刷新状态
        message.loading({
          content: '正在刷新开发者列表...',
          key: 'refreshDevs',
          duration: 0 // 不自动关闭
        });
        
        // 等待交易确认并更新开发者列表
        try {
          // 获取最新的开发者列表
          const { getGameDevsFromFactory } = await import('../utils/contract');
          
          // 尝试最多3次获取最新列表，每次间隔增加
          let updatedDevs: string[] = [];
          let attempts = 0;
          const maxAttempts = 3;
          let success = false;
          
          while (attempts < maxAttempts && !success) {
            attempts++;
            // 等待时间随尝试次数增加
            const delay = 2000 * attempts;
            
            // 等待一段时间再获取数据，确保链上数据已更新
            await new Promise(resolve => setTimeout(resolve, delay));
            
            try {
              updatedDevs = await getGameDevsFromFactory(CONTRACT_CONFIG.FACTORY_OBJECT_ID);
              
              // 检查新地址是否在列表中
              if (updatedDevs.some(dev => dev.toLowerCase() === normalizedAddress)) {
                success = true;
                console.log(`成功获取更新的开发者列表，尝试次数: ${attempts}`);
              } else {
                console.log(`开发者地址未出现在列表中，等待更长时间，尝试次数: ${attempts}`);
              }
            } catch (error) {
              console.error(`尝试第 ${attempts} 次获取开发者列表失败:`, error);
            }
          }
          
          if (success) {
            // 成功获取到包含新开发者的列表
            setRegisteredDevs(updatedDevs);
            message.success({
              content: '开发者列表已更新',
              key: 'refreshDevs',
              duration: 2
            });
          } else {
            // 多次尝试后仍未获取到最新列表，手动更新UI
            console.warn('无法从区块链获取最新数据，手动更新UI');
            setRegisteredDevs(prevDevs => {
              // 检查是否已存在，避免重复添加
              if (!prevDevs.some(dev => dev.toLowerCase() === normalizedAddress)) {
                return [...prevDevs, normalizedAddress];
              }
              return prevDevs;
            });
            message.info({
              content: '已手动添加开发者到列表',
              key: 'refreshDevs',
              duration: 2
            });
          }
        } catch (fetchError) {
          console.error('更新开发者列表失败:', fetchError);
          // 交易已成功但获取列表失败，手动更新UI
          setRegisteredDevs(prevDevs => {
            if (!prevDevs.some(dev => dev.toLowerCase() === normalizedAddress)) {
              return [...prevDevs, normalizedAddress];
            }
            return prevDevs;
          });
          message.warning({
            content: '无法从合约获取最新列表，已手动更新',
            key: 'refreshDevs',
            duration: 2
          });
        }
      } catch (txError) {
        console.error('交易执行失败:', txError);
        const errorMsg = txError instanceof Error ? txError.message : String(txError);
        setError(`交易执行失败: ${errorMsg}`);
        message.error({
          content: '游戏开发者注册失败',
          key: 'registerDev',
          duration: 2
        });
      }
    } catch (err) {
      console.error('注册游戏开发者失败:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`注册游戏开发者失败: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // 移除游戏开发者
  const handleRemoveGameDev = async (developerAddress: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // 规范化地址格式
      const normalizedAddress = developerAddress.toLowerCase();
      
      // 确认开发者存在于列表中
      if (!registeredDevs.some(dev => dev.toLowerCase() === normalizedAddress)) {
        setError('要移除的开发者不在列表中');
        setLoading(false);
        return;
      }
      
      // 创建交易参数
      const params: RemoveGameDevParams = {
        factoryId: CONTRACT_CONFIG.FACTORY_OBJECT_ID,
        developer: normalizedAddress
      };
      
      // 显示交易执行中状态
      message.loading({
        content: '正在执行移除操作...',
        key: 'removeDev',
        duration: 0 // 不自动关闭
      });
      
      try {
        // 执行交易并等待结果
        const txb = removeGameDevTx(params);
        const result = await signAndExecute({
          transaction: txb.serialize()
        });
        
        console.log('移除开发者交易执行成功:', result);
        
        // 显示成功消息
        message.success({
          content: '游戏开发者移除成功！',
          key: 'removeDev',
          duration: 2
        });
        
        // 显示刷新状态
        message.loading({
          content: '正在刷新开发者列表...',
          key: 'refreshDevs',
          duration: 0 // 不自动关闭
        });
        
        // 等待交易确认并更新开发者列表
        try {
          // 获取最新的开发者列表
          const { getGameDevsFromFactory } = await import('../utils/contract');
          
          // 尝试最多3次获取最新列表，每次间隔增加
          let updatedDevs: string[] = [];
          let attempts = 0;
          const maxAttempts = 3;
          let success = false;
          
          while (attempts < maxAttempts && !success) {
            attempts++;
            // 等待时间随尝试次数增加
            const delay = 2000 * attempts;
            
            // 等待一段时间再获取数据，确保链上数据已更新
            await new Promise(resolve => setTimeout(resolve, delay));
            
            try {
              updatedDevs = await getGameDevsFromFactory(CONTRACT_CONFIG.FACTORY_OBJECT_ID);
              
              // 检查开发者地址是否已从列表中移除
              if (!updatedDevs.some(dev => dev.toLowerCase() === normalizedAddress)) {
                success = true;
                console.log(`成功获取更新的开发者列表，已确认开发者被移除，尝试次数: ${attempts}`);
              } else {
                console.log(`开发者地址仍在列表中，等待更长时间，尝试次数: ${attempts}`);
              }
            } catch (error) {
              console.error(`尝试第 ${attempts} 次获取开发者列表失败:`, error);
            }
          }
          
          if (success) {
            // 成功获取到已移除开发者的列表
            setRegisteredDevs(updatedDevs);
            message.success({
              content: '开发者列表已更新',
              key: 'refreshDevs',
              duration: 2
            });
          } else {
            // 多次尝试后仍未获取到最新列表，手动更新UI
            console.warn('无法从区块链获取最新数据，手动更新UI');
            setRegisteredDevs(prevDevs => 
              prevDevs.filter(dev => dev.toLowerCase() !== normalizedAddress)
            );
            message.info({
              content: '已手动从列表中移除开发者',
              key: 'refreshDevs',
              duration: 2
            });
          }
        } catch (fetchError) {
          console.error('更新开发者列表失败:', fetchError);
          // 交易已成功但获取列表失败，手动更新UI
          setRegisteredDevs(prevDevs => 
            prevDevs.filter(dev => dev.toLowerCase() !== normalizedAddress)
          );
          message.warning({
            content: '无法从合约获取最新列表，已手动更新',
            key: 'refreshDevs',
            duration: 2
          });
        }
      } catch (txError) {
        console.error('移除开发者交易执行失败:', txError);
        const errorMsg = txError instanceof Error ? txError.message : String(txError);
        setError(`移除开发者失败: ${errorMsg}`);
        message.error({
          content: '游戏开发者移除失败',
          key: 'removeDev',
          duration: 2
        });
      }
    } catch (err) {
      console.error('移除游戏开发者失败:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`移除游戏开发者失败: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // 如果用户未连接钱包，显示提示信息
  if (!account) {
    return (
      <div className="manage-page">
        <div className="section-title">
          <Title level={2}>管理中心</Title>
          <Paragraph>创建和管理您的广告位。</Paragraph>
        </div>
        
        <div className="connect-wallet-prompt">
          <Alert
            message="请连接钱包"
            description="您需要连接钱包才能使用管理功能。"
            type="info"
            showIcon
          />
        </div>
      </div>
    );
  }

  return (
    <div className="manage-page">
      <div className="section-title">
        <Title level={2}>管理中心</Title>
        <Paragraph>创建和管理您的广告位。</Paragraph>
      </div>
      
      <Tabs activeKey={activeKey} onChange={handleTabChange} className="manage-tabs">
        {userRole === UserRole.ADMIN && (
          <TabPane tab="开发者管理" key="devManage">
            <div className="form-container">
              <Title level={4}>游戏开发者管理</Title>
              <Paragraph>
                作为平台管理员，您可以在此注册新的游戏开发者。
              </Paragraph>
              
              {error && (
                <Alert 
                  message="错误" 
                  description={error} 
                  type="error" 
                  showIcon 
                  className="error-alert"
                  closable
                  onClose={() => setError(null)}
                />
              )}
              
              <Card title="注册新开发者" className="register-dev-card">
                <Form
                  form={devRegisterForm}
                  layout="vertical"
                  onFinish={handleRegisterGameDev}
                  className="register-form"
                >
                  <Form.Item
                    name="devAddress"
                    label="开发者钱包地址"
                    rules={[{ required: true, message: '请输入开发者钱包地址' }]}
                  >
                    <Input placeholder="请输入开发者的SUI钱包地址" />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      loading={loading}
                      className="submit-button"
                    >
                      注册开发者
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
              
              <div className="registered-devs-section">
                <Title level={4}>已注册开发者</Title>
                {registeredDevs.length > 0 ? (
                  <List
                    dataSource={registeredDevs}
                    renderItem={(dev) => (
                      <List.Item className="dev-address-item">
                        <div className="address-content">
                          <Text className="address-text">{dev}</Text>
                          <div className="button-group">
                            <Button
                              type="link"
                              size="small"
                              onClick={() => {
                                navigator.clipboard.writeText(dev);
                                message.success('地址已复制');
                              }}
                            >
                              复制
                            </Button>
                            <Popconfirm
                              title="移除开发者"
                              description="确定要移除此开发者吗？此操作不可撤销。"
                              onConfirm={() => handleRemoveGameDev(dev)}
                              okText="确认"
                              cancelText="取消"
                              okButtonProps={{ danger: true }}
                            >
                              <Button
                                type="link"
                                size="small"
                                danger
                                loading={loading}
                              >
                                移除
                              </Button>
                            </Popconfirm>
                          </div>
                        </div>
                      </List.Item>
                    )}
                    bordered
                    className="registered-devs-list"
                  />
                ) : (
                  <Empty description="暂无已注册的开发者" />
                )}
              </div>
            </div>
          </TabPane>
        )}
        
        {userRole === UserRole.GAME_DEV && (
          <TabPane tab="创建广告位" key="create">
            <div className="form-container">
              <Title level={4}>新建广告位</Title>
              <Paragraph>
                在此创建新的广告位。创建后，广告位将可供用户购买。
              </Paragraph>
              
              {error && (
                <Alert 
                  message="错误" 
                  description={error} 
                  type="error" 
                  showIcon 
                  className="error-alert"
                  closable
                  onClose={() => setError(null)}
                />
              )}
              
              <Form
                form={adSpaceForm}
                layout="vertical"
                onFinish={handleCreateAdSpace}
                className="create-form"
              >
                <Form.Item
                  name="gameId"
                  label="游戏ID"
                  rules={[{ required: true, message: '请输入游戏ID' }]}
                >
                  <Input placeholder="请输入游戏ID" />
                </Form.Item>
                
                <Form.Item
                  name="location"
                  label="位置"
                  rules={[{ required: true, message: '请输入位置' }]}
                >
                  <Input placeholder="请输入位置，如'大厅门口'、'竞技场中心'等" />
                </Form.Item>
                
                <Form.Item
                  name="size"
                  label="尺寸"
                  rules={[{ required: true, message: '请选择尺寸' }]}
                >
                  <Select placeholder="请选择尺寸">
                    <Option value="小">小 (128x128)</Option>
                    <Option value="中">中 (256x256)</Option>
                    <Option value="大">大 (512x512)</Option>
                    <Option value="超大">超大 (1024x512)</Option>
                  </Select>
                </Form.Item>
                
                <Form.Item
                  name="price"
                  label="价格 (SUI)"
                  rules={[
                    { required: true, message: '请输入价格' },
                    { type: 'number', min: 0.000001, message: '价格必须大于0' }
                  ]}
                >
                  <InputNumber
                    placeholder="请输入价格"
                    step={0.1}
                    precision={6}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
                
                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={loading}
                    disabled={loading}
                    className="submit-button"
                  >
                    创建广告位
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </TabPane>
        )}
        
        {userRole === UserRole.GAME_DEV && (
          <TabPane tab="我的广告位" key="myAdSpaces">
            <div className="my-ad-spaces-container">
              <Title level={4}>我创建的广告位</Title>
              <Paragraph>
                您可以在这里查看和管理您创建的所有广告位。
              </Paragraph>
              
              {loadingAdSpaces ? (
                <div className="loading-container">
                  <Spin size="large" />
                  <p>加载广告位中...</p>
                </div>
              ) : myAdSpaces.length > 0 ? (
                <Row gutter={[24, 24]} className="ad-spaces-grid">
                  {myAdSpaces.map(adSpace => (
                    <Col xs={24} sm={12} md={8} lg={6} key={adSpace.id}>
                      <Card
                        hoverable
                        className="ad-space-card"
                        cover={
                          <div className="card-cover">
                            <img 
                              src={adSpace.imageUrl || 'https://via.placeholder.com/300x200?text=广告位'}
                              alt={adSpace.name} 
                              className="ad-space-image"
                            />
                            <div className="availability-badge">
                              {adSpace.available ? (
                                <span className="available">可购买</span>
                              ) : (
                                <span className="unavailable">已售出</span>
                              )}
                            </div>
                          </div>
                        }
                      >
                        <Card.Meta
                          title={adSpace.name}
                          description={
                            <>
                              <div className="ad-space-info">
                                <Text type="secondary">位置: {adSpace.location}</Text>
                                <br />
                                <Text type="secondary">尺寸: {adSpace.dimension.width} x {adSpace.dimension.height}</Text>
                                <br />
                                <Text type="secondary">价格: {Number(adSpace.price) / 1000000000} SUI / {adSpace.duration}天</Text>
                              </div>
                              <div className="ad-space-actions">
                                <Button 
                                  type="primary" 
                                  size="small" 
                                  className="action-button"
                                  onClick={() => {
                                    // 查看详情功能
                                    message.info('查看广告位详情功能即将上线');
                                  }}
                                >
                                  查看详情
                                </Button>
                                {adSpace.available && (
                                  <Button 
                                    type="default" 
                                    size="small"
                                    className="action-button"
                                    onClick={() => {
                                      // 修改价格功能
                                      message.info('修改价格功能即将上线');
                                    }}
                                  >
                                    修改价格
                                  </Button>
                                )}
                              </div>
                            </>
                          }
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>
              ) : (
                <Empty 
                  description="您还没有创建任何广告位" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                  <Button 
                    type="primary" 
                    onClick={() => setActiveKey('create')}
                  >
                    创建第一个广告位
                  </Button>
                </Empty>
              )}
            </div>
          </TabPane>
        )}
      </Tabs>
    </div>
  );
};

export default ManagePage;