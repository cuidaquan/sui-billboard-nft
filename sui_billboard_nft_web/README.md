# 链上广告牌NFT - 前端应用

这是一个基于Sui区块链的广告牌NFT系统的前端应用。它允许用户浏览、购买和管理广告位NFT，以及更新广告内容。

## 功能特点

- 浏览可用广告位
- 购买广告位并获得NFT
- 管理您的NFT集合
- 更新NFT广告内容
- 延长NFT租约时间

## 技术栈

- React 18
- TypeScript
- Ant Design UI库
- @mysten/sui.js - Sui区块链交互库
- @mysten/dapp-kit - Sui钱包集成
- React Router - 页面路由

## 项目设置

### 先决条件

- Node.js 16+
- NPM 8+
- Sui钱包 (如Sui Wallet浏览器扩展)

### 安装

```bash
# 安装依赖
npm install
```

### 开发

```bash
# 启动开发服务器
npm start
```

这将在 [http://localhost:3000](http://localhost:3000) 启动开发服务器。

### 环境变量配置

项目支持通过环境变量配置关键参数，您可以在项目根目录创建 `.env` 文件来设置这些变量：

```
# 合约配置
REACT_APP_CONTRACT_PACKAGE_ID=0x... # 您的合约包ID
REACT_APP_CONTRACT_MODULE_NAME=billboard_nft # 合约模块名
REACT_APP_FACTORY_OBJECT_ID=0x... # 工厂对象ID

# 可选：默认网络配置
REACT_APP_DEFAULT_NETWORK=testnet # 可选值: mainnet, testnet, devnet, localnet
```

### 构建

```bash
# 为生产环境构建应用
npm run build
```

构建完成后，所有文件将被生成到 `build` 目录，可以部署到任意静态网站托管服务。

## 使用方法

1. 连接您的Sui钱包
2. 浏览可用的广告位
3. 选择合适的广告位，填写广告内容并完成购买
4. 在"我的NFT"页面管理您的NFT
5. 根据需要更新广告内容或续租

## 配置详情

### 网络配置

应用支持连接到多个Sui网络。在 `src/config/config.ts` 中定义了以下网络选项:

- **mainnet**: Sui主网
- **testnet**: Sui测试网
- **devnet**: Sui开发网
- **localnet**: 本地开发网络

每个网络配置包含以下属性：
- `name`: 网络显示名称
- `fullNodeUrl`: 全节点RPC URL
- `faucetUrl`: 水龙头URL（适用于测试网和开发网）
- `explorerUrl`: 区块浏览器URL

默认网络设置为 `testnet`，可通过环境变量 `REACT_APP_DEFAULT_NETWORK` 修改。

### 合约配置

合约配置包含以下关键参数：

- **PACKAGE_ID**: 合约包ID
- **MODULE_NAME**: 合约模块名称
- **FACTORY_OBJECT_ID**: 广告位工厂对象ID

这些参数可以在 `src/config/config.ts` 中直接修改，或通过环境变量进行配置。

### 模拟数据

当前版本使用模拟数据演示应用功能，真实项目部署时需要修改 `src/utils/contract.ts` 文件，实现与Sui链上合约的实际交互。

## 项目结构

```
src/
  ├── components/        # 通用组件
  │   ├── adSpace/       # 广告位相关组件
  │   ├── nft/           # NFT相关组件
  │   └── layout/        # 布局组件
  ├── config/            # 配置文件
  ├── hooks/             # 自定义Hooks
  ├── pages/             # 页面组件
  ├── types/             # TypeScript类型定义
  ├── utils/             # 工具函数
  └── assets/            # 静态资源
```

## 扩展开发

### 添加新的广告位类型

1. 在 `src/types/index.ts` 中扩展 `AdSpace` 接口
2. 更新广告位展示组件
3. 在 `utils/contract.ts` 中更新相关API

### 实现真实合约交互

1. 使用 `@mysten/sui.js` 库中的API替换模拟数据
2. 实现交易签名和发送功能
3. 添加交易状态监控和回调处理

## 许可证

[MIT](LICENSE)
