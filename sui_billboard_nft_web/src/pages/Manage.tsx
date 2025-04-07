import React, { useState, useEffect } from 'react';
import { Typography, Tabs, Form, Input, Button, InputNumber, Select, message, Alert, Card, List, Empty, Modal, Popconfirm, Row, Col, Spin, Tooltip } from 'antd';
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { CreateAdSpaceParams, UserRole, RegisterGameDevParams, RemoveGameDevParams, AdSpace } from '../types';
import { createAdSpaceTx, registerGameDevTx, removeGameDevTx, getCreatedAdSpaces, updateAdSpacePriceTx, deleteAdSpaceTx, getAdSpaceById } from '../utils/contract';
import { CONTRACT_CONFIG } from '../config/config';
import './Manage.scss';
import { ReloadOutlined } from '@ant-design/icons';

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
  const [priceModalVisible, setPriceModalVisible] = useState<boolean>(false);
  const [currentAdSpace, setCurrentAdSpace] = useState<AdSpace | null>(null);
  const [newPrice, setNewPrice] = useState<number | null>(null);
  const [priceUpdateLoading, setPriceUpdateLoading] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  
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
        
        // 设置默认标签页: 管理员显示开发者管理, 开发者显示创建广告位
        if (role === UserRole.ADMIN) {
          setActiveKey("devManage");
          const { getGameDevsFromFactory } = await import('../utils/contract');
          const devs = await getGameDevsFromFactory(CONTRACT_CONFIG.FACTORY_OBJECT_ID);
          setRegisteredDevs(devs);
        } else if (role === UserRole.GAME_DEV) {
          setActiveKey("create");
          loadMyAdSpaces();
        }
      } catch (err) {
        console.error('检查用户角色失败:', err);
        message.error('检查用户角色失败');
      }
    };
    
    checkUserRole();
  }, [account, suiClient]);

  // 监听activeKey变化，当显示"我的广告位"标签时自动加载数据
  useEffect(() => {
    if (activeKey === 'myAdSpaces' && account && userRole === UserRole.GAME_DEV) {
      message.loading({ content: '正在加载广告位数据...', key: 'loadAdSpaces', duration: 0 });
      loadMyAdSpaces()
        .then(() => {
          message.success({ content: '广告位数据已加载', key: 'loadAdSpaces', duration: 2 });
        })
        .catch((error) => {
          console.error('加载广告位数据失败:', error);
          message.error({ content: '加载广告位数据失败', key: 'loadAdSpaces', duration: 2 });
        });
    }
  }, [activeKey, account, userRole]);

  // 加载开发者创建的广告位
  const loadMyAdSpaces = async () => {
    if (!account) {
      console.log('无法加载广告位：账户未连接');
      return;
    }
    
    try {
      setLoadingAdSpaces(true);
      console.log('开始加载开发者创建的广告位，开发者地址:', account.address);
      
      // 先检查是否为游戏开发者
      const { checkIsGameDev } = await import('../utils/auth');
      const isGameDev = await checkIsGameDev(account.address);
      console.log('游戏开发者验证结果:', isGameDev);
      
      if (!isGameDev) {
        console.warn('当前用户不是游戏开发者，无法加载广告位');
        message.warning('您不是注册的游戏开发者，无法查看广告位');
        setMyAdSpaces([]);
        return;
      }
      
      // 加载广告位前，清空当前缓存的广告位数据
      setMyAdSpaces([]);
      
      // 禁用缓存，直接从区块链获取最新数据
      console.log('正在从区块链获取最新广告位数据...');
      const { getCreatedAdSpaces } = await import('../utils/contract');
      
      // 记录获取广告位的时间
      const startTime = new Date().getTime();
      const adSpaces = await getCreatedAdSpaces(account.address);
      const endTime = new Date().getTime();
      console.log(`成功加载广告位数据 (耗时: ${endTime - startTime}ms):`, adSpaces);
      
      // 过滤掉示例广告位数据
      const realAdSpaces = adSpaces.filter(adSpace => !adSpace.isExample);
      console.log('过滤后的实际广告位数据:', realAdSpaces);
      
      if (realAdSpaces.length > 0) {
        // 有真实广告位数据时，显示真实数据
        setMyAdSpaces(realAdSpaces);
      } else if (adSpaces.length > 0 && adSpaces.some(ad => ad.isExample)) {
        // 只有示例数据时，也显示示例数据来指导用户
        setMyAdSpaces(adSpaces);
      } else {
        // 无数据时，显示空状态
        setMyAdSpaces([]);
      }
    } catch (err) {
      console.error('获取开发者广告位失败:', err);
      message.error('获取广告位列表失败');
      setMyAdSpaces([]);
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
      
      // 在创建交易前，先获取当前用户的广告位数量
      let currentAdSpaces = [];
      if (account) {
        currentAdSpaces = await getCreatedAdSpaces(account.address);
        currentAdSpaces = currentAdSpaces.filter(adSpace => !adSpace.isExample);
      }
      const currentAdSpaceCount = currentAdSpaces.length;
      console.log('创建前广告位数量:', currentAdSpaceCount);
      
      // 创建交易
      const txb = createAdSpaceTx(params);
      
      console.log('交易创建成功，准备执行');
      
      // 显示交易执行中状态
      message.loading({ content: '正在创建广告位...', key: 'createAdSpace', duration: 0 });
      
      // 执行交易
      await signAndExecute({
        transaction: txb.serialize()
      });
      
      console.log('交易执行成功，已提交到区块链');
      
      // 交易已提交，显示提交成功消息
      message.success({ content: '广告位创建交易已提交', key: 'createAdSpace', duration: 2 });
      message.loading({ content: '等待交易确认...', key: 'confirmAdSpace', duration: 0 });
      
      // 使用轮询方式检查交易结果，最多尝试5次
      let attempts = 0;
      const maxAttempts = 5;
      let success = false;
      
      console.log(`等待广告位数量增加，确认交易成功...`);
      
      while (attempts < maxAttempts && !success) {
        attempts++;
        // 延迟时间随尝试次数增加
        const delay = 2000 * attempts;
        console.log(`尝试第 ${attempts}/${maxAttempts} 次获取广告位数据，等待 ${delay}ms...`);
        
        // 等待一段时间再获取数据，确保链上数据已更新
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
          // 确保account存在
          if (!account) {
            console.error('执行期间账户状态发生变化');
            break;
          }
          
          // 直接从合约获取最新数据
          const latestAdSpaces = await getCreatedAdSpaces(account.address);
          const newAdSpaces = latestAdSpaces.filter(adSpace => !adSpace.isExample);
          const newAdSpaceCount = newAdSpaces.length;
          
          console.log('当前广告位数量:', newAdSpaceCount, '原广告位数量:', currentAdSpaceCount);
          
          // 判断广告位数量是否增加
          if (newAdSpaceCount > currentAdSpaceCount) {
            success = true;
            console.log('广告位数量增加，创建成功');
            
            // 成功找到后，更新React状态，保存最新数据
            setMyAdSpaces(newAdSpaces);
            
            // 显示成功确认消息
            message.success({ 
              content: '广告位创建成功！数据已确认', 
              key: 'confirmAdSpace', 
              duration: 2 
            });
            
            // 重置表单
            adSpaceForm.resetFields();
            
            // 关闭创建模态框
            // TODO: 如果有创建模态框，在此处关闭
            
            // 切换到广告位展示页面
            setActiveKey('myAdSpaces');
          } else {
            console.log('广告位数量未增加，继续轮询');
          }
        } catch (error) {
          console.error(`第 ${attempts} 次获取广告位数据失败:`, error);
        }
      }
      
      // 如果多次尝试后仍未找到，显示提示信息
      if (!success) {
        message.info({ 
          content: '新创建的广告位可能需要一段时间才能显示，请稍后手动刷新', 
          key: 'confirmAdSpace', 
          duration: 4 
        });
        
        // 切换到广告位展示页面并尝试重新加载
        setActiveKey('myAdSpaces');
        loadMyAdSpaces();
      }
    } catch (err) {
      console.error('创建广告位失败:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      
      // 检查特定错误类型并提供更具体的错误信息
      if (errorMsg.includes('ENotGameDev')) {
        setError(`交易执行失败: 您不是注册的游戏开发者`);
      } else if (errorMsg.includes('InsufficientGas')) {
        setError(`交易执行失败: gas 费不足，请确保您的钱包中有足够的 SUI`);
      } else if (errorMsg.includes('InvalidParams') || errorMsg.includes('Invalid params')) {
        setError(`交易执行失败: 提供给智能合约的参数无效，请检查游戏ID、位置和尺寸格式是否符合要求`);
      } else {
        setError(`创建广告位失败: ${errorMsg}`);
      }
      
      message.error({ content: '广告位创建失败', key: 'createAdSpace', duration: 2 });
    } finally {
      setLoading(false);
    }
  };
  
  // 处理标签页切换
  const handleTabChange = (key: string) => {
    setActiveKey(key);
    // useEffect会自动处理当切换到'myAdSpaces'标签时的数据加载
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

  // 处理调价的模态框
  const handleUpdatePrice = (adSpace: AdSpace) => {
    setCurrentAdSpace(adSpace);
    // 将价格从MIST转换为SUI
    setNewPrice(Number(adSpace.price) / 1000000000);
    setPriceModalVisible(true);
  };
  
  // 提交调价
  const handlePriceUpdateSubmit = async () => {
    if (!currentAdSpace || newPrice === null || newPrice <= 0) {
      message.error('请输入有效的价格');
      return;
    }
    
    try {
      setPriceUpdateLoading(true);
      setError(null);
      
      // 转换为MIST
      const priceInMist = BigInt(Math.floor(newPrice * 1000000000));
      
      // 构建交易
      const txb = updateAdSpacePriceTx({
        adSpaceId: currentAdSpace.id,
        price: priceInMist.toString()
      });
      
      // 显示交易执行中状态
      message.loading({ content: '正在更新价格...', key: 'updatePrice', duration: 0 });
      
      // 执行交易
      await signAndExecute({
        transaction: txb.serialize()
      });
      
      // 交易已提交
      message.loading({ content: '交易已提交，等待确认...', key: 'updatePrice', duration: 0 });
      
      // 使用轮询方式检查交易结果，最多尝试5次
      let attempts = 0;
      const maxAttempts = 5;
      let success = false;
      
      while (attempts < maxAttempts && !success) {
        attempts++;
        // 增加等待时间
        const delay = 2000 * attempts;
        console.log(`等待交易确认，尝试 ${attempts}/${maxAttempts}，等待 ${delay}ms...`);
        
        // 等待一段时间再检查
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
          // 尝试从区块链获取最新的广告位数据
          const latestAdSpace = await getAdSpaceById(currentAdSpace.id);
          
          // 检查价格是否已更新
          if (latestAdSpace && Number(latestAdSpace.price) === Number(priceInMist.toString())) {
            success = true;
            console.log('价格更新已成功确认');
          } else {
            console.log('价格尚未更新，继续等待...');
          }
        } catch (err) {
          console.warn(`检查交易结果时出错 (尝试 ${attempts}): `, err);
        }
      }
      
      // 无论是否成功确认，都显示成功消息（交易已提交到链上）
      message.success({ content: '广告位价格更新成功', key: 'updatePrice', duration: 2 });
      
      // 关闭模态框
      setPriceModalVisible(false);
      
      // 刷新广告位列表
      try {
        console.log('开始刷新广告位列表');
        await loadMyAdSpaces();
        console.log('广告位列表刷新成功');
      } catch (err) {
        console.error('刷新广告位列表失败:', err);
        message.error('刷新广告位列表失败，请手动刷新页面');
      }
    } catch (err) {
      console.error('更新价格失败:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`更新价格失败: ${errorMsg}`);
      message.error({ content: '价格更新失败', key: 'updatePrice', duration: 2 });
    } finally {
      setPriceUpdateLoading(false);
    }
  };
  
  // 处理删除广告位
  const handleDeleteAdSpace = async (adSpaceId: string) => {
    try {
      setDeleteLoading(true);
      setError(null);
      
      // 构建交易
      const txb = deleteAdSpaceTx({
        factoryId: CONTRACT_CONFIG.FACTORY_OBJECT_ID,
        adSpaceId
      });
      
      // 显示交易执行中状态
      message.loading({ content: '正在删除广告位...', key: 'deleteAdSpace', duration: 0 });
      
      // 执行交易
      await signAndExecute({
        transaction: txb.serialize()
      });
      
      // 交易已提交
      message.loading({ content: '交易已提交，等待确认...', key: 'deleteAdSpace', duration: 0 });
      
      // 使用轮询方式检查交易结果，最多尝试5次
      let attempts = 0;
      const maxAttempts = 5;
      let success = false;
      
      while (attempts < maxAttempts && !success) {
        attempts++;
        // 增加等待时间
        const delay = 2000 * attempts;
        console.log(`等待删除确认，尝试 ${attempts}/${maxAttempts}，等待 ${delay}ms...`);
        
        // 等待一段时间再检查
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
          // 尝试从区块链获取广告位数据
          // 如果广告位已删除，应该返回null
          const latestAdSpace = await getAdSpaceById(adSpaceId);
          
          if (!latestAdSpace) {
            success = true;
            console.log('广告位删除已成功确认');
          } else {
            console.log('广告位尚未删除，继续等待...');
          }
        } catch (err) {
          // 如果返回404错误，也表示广告位已被删除
          console.warn(`检查交易结果时出错 (尝试 ${attempts}): `, err);
          if (String(err).includes('not found') || String(err).includes('404')) {
            success = true;
            console.log('通过错误确认广告位已删除');
          }
        }
      }
      
      // 显示成功消息
      message.success({ content: '广告位删除成功', key: 'deleteAdSpace', duration: 2 });
      
      // 刷新广告位列表
      try {
        console.log('开始刷新广告位列表');
        await loadMyAdSpaces();
        console.log('广告位列表刷新成功');
      } catch (err) {
        console.error('刷新广告位列表失败:', err);
        message.error('刷新广告位列表失败，请手动刷新页面');
      }
    } catch (err) {
      console.error('删除广告位失败:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`删除广告位失败: ${errorMsg}`);
      message.error({ content: '删除广告位失败', key: 'deleteAdSpace', duration: 2 });
    } finally {
      setDeleteLoading(false);
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
                          <Tooltip title={dev} placement="topLeft">
                            <Text className="address-text">
                              {dev.substring(0, 10)}...{dev.substring(dev.length - 8)}
                            </Text>
                          </Tooltip>
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
                    precision={9}
                    min={0.000001}
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
            <div className="ad-spaces-container">
              <div className="ad-spaces-header">
                <Title level={4}>我创建的广告位</Title>
              </div>
              
              {loadingAdSpaces ? (
                <div className="loading-container">
                  <Spin size="large" />
                  <p className="loading-text">加载广告位数据中...</p>
                </div>
              ) : myAdSpaces.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="您还没有创建任何广告位"
                  className="empty-ad-spaces"
                >
                  <Button 
                    type="primary" 
                    onClick={() => setActiveKey('create')}
                  >
                    创建第一个广告位
                  </Button>
                </Empty>
              ) : (
                <List
                  grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 4, xxl: 4 }}
                  dataSource={myAdSpaces}
                  renderItem={adSpace => (
                    <List.Item>
                      <Card
                        hoverable
                        cover={
                          <div className="ad-space-image-placeholder">
                            <div className="placeholder-content">
                              <Typography.Title level={5}>{adSpace.name}</Typography.Title>
                              <Typography.Text>{adSpace.dimension.width}x{adSpace.dimension.height}</Typography.Text>
                            </div>
                          </div>
                        }
                        className={adSpace.isExample ? 'example-ad-space' : ''}
                      >
                        <Card.Meta
                          title={adSpace.name}
                          description={adSpace.description}
                        />
                        <div className="card-details">
                          <div className="detail-item">
                            <Typography.Text type="secondary">位置:</Typography.Text>
                            <Typography.Text>{adSpace.location}</Typography.Text>
                          </div>
                          <div className="detail-item">
                            <Typography.Text type="secondary">价格:</Typography.Text>
                            <Typography.Text>{Number(adSpace.price) / 1000000000} SUI/天</Typography.Text>
                          </div>
                          {adSpace.price_description && (
                            <div className="detail-item price-description">
                              <Typography.Text type="secondary">{adSpace.price_description}</Typography.Text>
                            </div>
                          )}
                          <div className="detail-item">
                            <Typography.Text type="secondary">尺寸:</Typography.Text>
                            <Typography.Text>{adSpace.dimension.width}x{adSpace.dimension.height}</Typography.Text>
                          </div>
                          <div className="detail-item">
                            <Typography.Text type="secondary">状态:</Typography.Text>
                            <Typography.Text>{adSpace.available ? '可用' : '已租用'}</Typography.Text>
                          </div>
                        </div>
                        {!adSpace.isExample && (
                          <div className="card-actions">
                            <Button 
                              type="primary" 
                              className="action-button"
                              onClick={() => handleUpdatePrice(adSpace)}
                            >
                              调价
                            </Button>
                            <Popconfirm
                              title="确定要删除这个广告位吗？"
                              description="删除后无法恢复，且当前所有关联的NFT将无法访问。"
                              onConfirm={() => handleDeleteAdSpace(adSpace.id)}
                              okText="确定"
                              cancelText="取消"
                            >
                              <Button danger className="action-button">删除</Button>
                            </Popconfirm>
                          </div>
                        )}
                        {adSpace.isExample && (
                          <div className="card-actions">
                            <Button 
                              type="primary" 
                              className="action-button"
                              onClick={() => setActiveKey('create')}
                            >
                              创建第一个广告位
                            </Button>
                          </div>
                        )}
                      </Card>
                    </List.Item>
                  )}
                />
              )}
            </div>
          </TabPane>
        )}
      </Tabs>

      {/* 价格更新模态框 */}
      <Modal
        title="调整广告位价格"
        open={priceModalVisible}
        onCancel={() => setPriceModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setPriceModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={priceUpdateLoading} 
            onClick={handlePriceUpdateSubmit}
          >
            确认
          </Button>
        ]}
      >
        <Form layout="vertical">
          <Form.Item
            label="广告位"
            name="adSpaceName"
          >
            <Input 
              value={currentAdSpace?.name} 
              disabled 
              placeholder={currentAdSpace?.name || '广告位'}
            />
          </Form.Item>
          <Form.Item
            label="当前价格 (SUI/天)"
            name="currentPrice"
          >
            <Input 
              value={currentAdSpace ? Number(currentAdSpace.price) / 1000000000 : 0} 
              disabled 
              placeholder={currentAdSpace ? (Number(currentAdSpace.price) / 1000000000).toString() : '0'}
            />
          </Form.Item>
          <Form.Item
            label="新价格 (SUI/天)"
            name="newPrice"
            rules={[
              { required: true, message: '请输入新价格' },
              { type: 'number', min: 0.000001, message: '价格必须大于0' }
            ]}
          >
            <InputNumber
              value={newPrice}
              onChange={setNewPrice}
              precision={9}
              min={0.000001}
              step={0.1}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ManagePage;