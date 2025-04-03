import React, { useState } from 'react';
import { Form, Input, Button, Typography, Card, Divider, Select, Space } from 'antd';
import { AdSpace, PurchaseAdSpaceParams } from '../../types';
import './AdSpaceForm.scss';

const { Title, Text } = Typography;
const { Option } = Select;

interface AdSpaceFormProps {
  adSpace: AdSpace;
  onSubmit: (values: PurchaseAdSpaceParams) => void;
  isLoading: boolean;
}

const AdSpaceForm: React.FC<AdSpaceFormProps> = ({ 
  adSpace,
  onSubmit,
  isLoading
}) => {
  const [form] = Form.useForm();
  const [duration, setDuration] = useState<number>(30);
  
  // 计算总价格
  const calculatePrice = (days: number): string => {
    const pricePerDay = Number(adSpace.price) / adSpace.duration;
    return ((pricePerDay * days) / 1000000000).toFixed(6);
  };
  
  const totalPrice = calculatePrice(duration);
  
  const handleSubmit = (values: any) => {
    const params: PurchaseAdSpaceParams = {
      adSpaceId: adSpace.id,
      contentUrl: values.contentUrl,
      duration: values.duration
    };
    
    onSubmit(params);
  };
  
  return (
    <Card className="ad-space-form">
      <Title level={3}>购买广告位</Title>
      <Divider />
      
      <div className="ad-space-info">
        <Text strong>名称：</Text> <Text>{adSpace.name}</Text><br />
        <Text strong>位置：</Text> <Text>{adSpace.location}</Text><br />
        <Text strong>尺寸：</Text> <Text>{adSpace.dimension.width} x {adSpace.dimension.height}</Text><br />
        <Text strong>价格：</Text> <Text>{Number(adSpace.price) / 1000000000} SUI / {adSpace.duration}天</Text>
      </div>
      
      <Divider />
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          duration: 30
        }}
      >
        <Form.Item
          name="contentUrl"
          label="广告内容URL"
          rules={[
            { required: true, message: '请输入广告内容URL' },
            { type: 'url', message: '请输入有效的URL' }
          ]}
        >
          <Input placeholder="请输入广告内容URL" />
        </Form.Item>
        
        <Form.Item
          name="duration"
          label="租赁天数"
          rules={[{ required: true, message: '请选择租赁天数' }]}
        >
          <Select onChange={(value) => setDuration(Number(value))}>
            <Option value={7}>7天</Option>
            <Option value={15}>15天</Option>
            <Option value={30}>30天</Option>
            <Option value={60}>60天</Option>
            <Option value={90}>90天</Option>
            <Option value={180}>180天</Option>
            <Option value={365}>365天</Option>
          </Select>
        </Form.Item>
        
        <Divider />
        
        <div className="price-summary">
          <Space direction="vertical">
            <Text>默认周期: {adSpace.duration} 天</Text>
            <Text>租赁天数: {duration} 天</Text>
            <Title level={4}>总价: {totalPrice} SUI</Title>
          </Space>
        </div>
        
        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={isLoading}
            className="submit-button"
          >
            确认购买
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default AdSpaceForm; 