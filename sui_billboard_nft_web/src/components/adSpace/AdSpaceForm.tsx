import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Card, Divider, Select, Space, Spin, Row, Col, Tooltip, Slider, InputNumber, DatePicker, Switch } from 'antd';
import { InfoCircleOutlined, ShoppingCartOutlined, QuestionCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { AdSpace, PurchaseAdSpaceParams } from '../../types';
import { calculateLeasePrice, formatSuiAmount } from '../../utils/contract';
// 已移除 WalrusUpload 导入
import dayjs from 'dayjs';
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
  const [useCustomStartTime, setUseCustomStartTime] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<dayjs.Dayjs | null>(null);
  
  useEffect(() => {
    const fetchPrice = async () => {
      setCalculating(true);
      try {
        console.log('正在获取广告位价格', adSpace.id, leaseDays);
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
  
  const handleContentUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContentUrl(e.target.value);
  };
  
  const handleSubmit = (values: any) => {
    if (totalPrice === 'NaN' || !totalPrice) {
      console.error('价格无效，无法提交');
      return;
    }
    
    const priceInMist = (Number(totalPrice) * 1000000000).toString();
    console.log('提交的价格 (MIST):', priceInMist);
    
    const params: PurchaseAdSpaceParams = {
      adSpaceId: adSpace.id,
      contentUrl: contentUrl,
      brandName: values.brandName,
      projectUrl: values.projectUrl,
      leaseDays: values.leaseDays,
      price: priceInMist,
    };
    
    if (useCustomStartTime && startTime) {
      params.startTime = Math.floor(startTime.valueOf() / 1000); 
      console.log('使用自定义开始时间:', new Date(params.startTime * 1000).toLocaleString(), '时间戳:', params.startTime);
    } else {
      console.log('使用当前时间作为开始时间');
    }
    
    onSubmit(params);
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
          leaseDays: 30,
          useCustomStartTime: false
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
            <div className="form-section-title">租期设置</div>
          </Col>
          <Col span={12}>
            <Form.Item
              name="useCustomStartTime"
              label="自定义开始时间"
              valuePropName="checked"
            >
              <Switch
                checkedChildren="启用"
                unCheckedChildren="默认"
                onChange={(checked) => setUseCustomStartTime(checked)}
              />
            </Form.Item>
            <Text type="secondary" style={{ display: 'block', marginTop: '-15px', marginBottom: '10px' }}>
              默认使用交易确认时的当前时间
            </Text>
          </Col>
          <Col span={12}>
            <Form.Item
              name="startTime"
              label="广告开始时间"
              dependencies={['useCustomStartTime']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!getFieldValue('useCustomStartTime') || value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('请选择开始时间'));
                  },
                }),
              ]}
            >
              <DatePicker
                showTime
                disabled={!useCustomStartTime}
                style={{ width: '100%' }}
                placeholder="选择开始时间"
                onChange={(date) => setStartTime(date)}
                disabledDate={(current) => {
                  return current && current < dayjs().startOf('day');
                }}
                format="YYYY-MM-DD HH:mm:ss"
              />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={24}>
            <div className="form-section-title">广告内容</div>
          </Col>
          <Col span={24}>
            <Form.Item
              label="内容 URL"
              rules={[
                { required: true, message: '请输入内容URL' }
              ]}
              extra={`推荐尺寸为 ${adSpace.dimension.width} x ${adSpace.dimension.height}`}
            >
              <Input 
                placeholder="请输入图片URL" 
                value={contentUrl}
                onChange={handleContentUrlChange}
              />
            </Form.Item>
            {contentUrl && (
              <Form.Item label="预览">
                <img 
                  src={contentUrl} 
                  alt="内容预览" 
                  style={{ maxWidth: '100%', maxHeight: '200px' }}
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </Form.Item>
            )}
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
        
        <Divider />
        
        <div className="price-summary">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div className="price-breakdown">
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