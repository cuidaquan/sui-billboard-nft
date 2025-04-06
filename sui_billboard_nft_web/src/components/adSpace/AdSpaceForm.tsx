import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Card, Divider, Select, Space, Spin, Row, Col, Tooltip, Slider, InputNumber } from 'antd';
import { InfoCircleOutlined, ShoppingCartOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { AdSpace, PurchaseAdSpaceParams } from '../../types';
import { calculateLeasePrice, formatSuiAmount } from '../../utils/contract';
import './AdSpaceForm.scss';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

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
  const [leaseDays, setLeaseDays] = useState<number>(30);
  const [totalPrice, setTotalPrice] = useState<string>("0");
  const [calculating, setCalculating] = useState<boolean>(false);
  const [contentUrl, setContentUrl] = useState<string>("");
  
  // 获取租赁价格
  useEffect(() => {
    const fetchPrice = async () => {
      setCalculating(true);
      try {
        console.log('正在获取广告位价格', adSpace.id, leaseDays);
        // 直接调用contract.ts中的calculateLeasePrice函数
        const price = await calculateLeasePrice(adSpace.id, leaseDays);
        console.log('获取到的价格 (原始):', price);
        const formattedPrice = formatSuiAmount(price);
        console.log('格式化后的价格:', formattedPrice);
        
        if (formattedPrice === 'NaN' || !formattedPrice) {
          throw new Error('获取到的价格无效');
        }
        
        setTotalPrice(formattedPrice);
      } catch (error) {
        console.error('获取价格失败:', error);
        setTotalPrice('');
      } finally {
        setCalculating(false);
      }
    };
    
    fetchPrice();
  }, [adSpace.id, leaseDays, adSpace.price]);
  
  const handleSubmit = (values: any) => {
    // 如果价格无效，不允许提交
    if (totalPrice === 'NaN' || !totalPrice) {
      console.error('价格无效，无法提交');
      return;
    }
    
    const priceInMist = (Number(totalPrice) * 1000000000).toString();
    console.log('提交的价格 (MIST):', priceInMist);
    
    const params: PurchaseAdSpaceParams = {
      adSpaceId: adSpace.id,
      contentUrl: values.contentUrl,
      brandName: values.brandName,
      projectUrl: values.projectUrl,
      leaseDays: values.leaseDays,
      price: priceInMist
    };
    
    onSubmit(params);
  };

  const handleContentUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContentUrl(e.target.value);
  };
  
  return (
    <Card className="ad-space-form">
      <Title level={3}>购买广告位</Title>
      <Divider />
      
      <div className="ad-space-info">
        <Row>
          <Col span={12}>
            <Text strong>名称：</Text> <Text>{adSpace.name}</Text><br />
            <Text strong>位置：</Text> <Text>{adSpace.location}</Text><br />
            <Text strong>尺寸：</Text> <Text>{adSpace.dimension.width} x {adSpace.dimension.height}</Text><br />
          </Col>
          <Col span={12}>
            <Text strong>基础价格：</Text> <Text>{Number(adSpace.price) / 1000000000} SUI / 天</Text>
            <Tooltip title="价格随租期按比例计算，租期越长越划算">
              <QuestionCircleOutlined style={{ marginLeft: 8 }} />
            </Tooltip>
          </Col>
        </Row>
      </div>
      
      <Divider>
        <Text type="secondary">填写广告信息</Text>
      </Divider>
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          leaseDays: 30
        }}
      >
        <Row gutter={16}>
          <Col span={24}>
            <div className="form-section-title">基本信息</div>
          </Col>
          <Col span={12}>
            <Form.Item
              name="brandName"
              label="品牌名称"
              rules={[
                { required: true, message: '请输入品牌名称' }
              ]}
            >
              <Input placeholder="请输入品牌名称" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="leaseDays"
              label="租赁天数"
              rules={[{ required: true, message: '请选择租赁天数' }]}
            >
              <Row gutter={8}>
                <Col span={16}>
                  <Slider
                    min={1}
                    max={365}
                    onChange={(value) => {
                      setLeaseDays(Number(value));
                      form.setFieldsValue({ leaseDays: value });
                    }}
                    value={leaseDays}
                    tooltip={{ formatter: (value) => `${value} 天` }}
                  />
                </Col>
                <Col span={8}>
                  <InputNumber
                    min={1}
                    max={365}
                    value={leaseDays}
                    onChange={(value) => {
                      const days = Number(value);
                      if (!isNaN(days) && days >= 1 && days <= 365) {
                        setLeaseDays(days);
                        form.setFieldsValue({ leaseDays: days });
                      }
                    }}
                    addonAfter="天"
                    style={{ width: '100%' }}
                  />
                </Col>
              </Row>
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={24}>
            <div className="form-section-title">广告内容</div>
          </Col>
          <Col span={24}>
            <Form.Item
              name="contentUrl"
              label="广告内容URL"
              rules={[
                { required: true, message: '请输入广告内容URL' },
                { type: 'url', message: '请输入有效的URL' }
              ]}
              extra={`输入图片地址，推荐尺寸为 ${adSpace.dimension.width} x ${adSpace.dimension.height}`}
            >
              <Input 
                placeholder="请输入图片URL地址" 
                onChange={handleContentUrlChange}
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name="projectUrl"
              label="项目网站URL"
              rules={[
                { required: true, message: '请输入项目网站URL' },
                { type: 'url', message: '请输入有效的URL' }
              ]}
              extra="用户点击广告时将跳转到此链接"
            >
              <Input placeholder="https://example.com" />
            </Form.Item>
          </Col>
        </Row>
        
        {contentUrl && (
          <div className="preview-section">
            <div className="preview-title">广告内容预览</div>
            <img 
              src={contentUrl} 
              alt="广告预览" 
              className="preview-image"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>
        )}
        
        <Divider />
        
        <div className="price-summary">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div className="price-breakdown">
              <div className="price-breakdown-item">
                <Text>基础套餐:</Text>
                <Text>365 天</Text>
              </div>
              <div className="price-breakdown-item">
                <Text>您选择的租期:</Text>
                <Text>{leaseDays} 天</Text>
              </div>
            </div>
            
            {calculating ? (
              <div className="price-loading">
                <Spin size="small" />
                <Text style={{ marginLeft: 8 }}>计算价格中...</Text>
              </div>
            ) : (
              <div className="total-price">
                <Row justify="space-between" align="middle">
                  <Col>总价:</Col>
                  <Col>
                    {totalPrice === 'NaN' || !totalPrice ? (
                      <Text type="danger">价格计算失败，请重试</Text>
                    ) : (
                      <Text>{totalPrice} SUI</Text>
                    )}
                  </Col>
                </Row>
              </div>
            )}
          </Space>
        </div>
        
        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={isLoading || calculating}
            disabled={calculating || totalPrice === 'NaN' || !totalPrice}
            className="submit-button"
            icon={<ShoppingCartOutlined />}
          >
            确认购买
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default AdSpaceForm; 