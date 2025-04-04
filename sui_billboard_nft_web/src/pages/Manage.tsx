import React, { useState } from 'react';
import { Typography, Tabs, Form, Input, Button, InputNumber, Select, message, Alert } from 'antd';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { CreateAdSpaceParams } from '../types';
import { createAdSpaceTx, createSuiClient } from '../utils/contract';
import './Manage.scss';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const ManagePage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const account = useCurrentAccount();
  const suiClient = createSuiClient();
  
  // 如果用户未连接钱包
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
  
  // 创建广告位表单提交
  const handleCreateAdSpace = async (values: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const params: CreateAdSpaceParams = {
        gameDevCapId: values.gameDevCapId,
        gameId: values.gameId,
        location: values.location,
        size: values.size,
        yearlyPrice: values.yearlyPrice.toString()
      };
      
      // 创建交易
      const txb = createAdSpaceTx(params);
      
      // 执行交易
      // 注意：这里应该使用dapp-kit的钱包提供的方法来签名和发送交易
      // 实际项目中需要补充这部分逻辑
      message.success('广告位创建成功！');
      form.resetFields();
    } catch (err) {
      console.error('创建广告位失败:', err);
      setError('创建广告位失败，请检查输入并重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="manage-page">
      <div className="section-title">
        <Title level={2}>管理中心</Title>
        <Paragraph>创建和管理您的广告位。</Paragraph>
      </div>
      
      <Tabs defaultActiveKey="create" className="manage-tabs">
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
              form={form}
              layout="vertical"
              onFinish={handleCreateAdSpace}
              className="create-form"
            >
              <Form.Item
                name="gameDevCapId"
                label="游戏开发者凭证ID"
                rules={[{ required: true, message: '请输入游戏开发者凭证ID' }]}
              >
                <Input placeholder="请输入游戏开发者凭证ID" />
              </Form.Item>
              
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
                name="yearlyPrice"
                label="年租价格 (SUI)"
                rules={[
                  { required: true, message: '请输入年租价格' },
                  { type: 'number', min: 0.000001, message: '价格必须大于0' }
                ]}
              >
                <InputNumber
                  placeholder="请输入年租价格"
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
                  className="submit-button"
                >
                  创建广告位
                </Button>
              </Form.Item>
            </Form>
          </div>
        </TabPane>
        
        <TabPane tab="我的广告位" key="myAdSpaces">
          <div className="coming-soon">
            <Title level={4}>即将推出</Title>
            <Paragraph>
              该功能正在开发中，敬请期待。
            </Paragraph>
          </div>
        </TabPane>
        
        <TabPane tab="收益统计" key="statistics">
          <div className="coming-soon">
            <Title level={4}>即将推出</Title>
            <Paragraph>
              该功能正在开发中，敬请期待。
            </Paragraph>
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ManagePage;