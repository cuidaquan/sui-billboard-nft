# Walrus集成开发任务提示词

## 任务背景

我需要在该项目集成Walrus去中心化存储解决方案，使用户能够直接上传广告内容文件，并确保内容与NFT租期同步。

Walrus是一个专门为大型二进制文件设计的去中心化存储和数据可用性协议，非常适合存储广告图片等内容。

## 核心需求

1. 允许用户在购买/更新NFT时可以选择直接填写内容URL或上传文件到Walrus存储
2. 上传到Walrus的文件应获取HTTP的URL并回填到NFT的content_url字段
3. 在NFT元数据中记录Walrus中的blob ID
4. 文件的存储时长应至少到NFT租期结束时间
5. 用户续租NFT时，需要自动延长对应Walrus文件的存储时长

## 技术说明

1. **Walrus SDK**：我们将使用`@mysten/walrus`进行Walrus集成
2. **数据模型**：需扩展NFT结构，添加`blob_id`字段
3. **技术架构**：前端上传 -> Walrus服务 -> 存储到Walrus -> 获取HTTP URL -> 更新NFT
4. **智能合约**：需要修改NFT创建和更新函数，添加blob_id参数

## 开发任务

请帮我实现以下开发任务：

1. **Walrus服务封装**
   - 创建`WalrusService`类
   - 实现文件上传功能
   - 实现存储时间延长功能
   - 实现Blob存在性检查

2. **前端上传组件**
   - 实现带有存储选择的上传组件
   - 支持外部URL和Walrus上传两种模式
   - 显示上传进度和预览
   - 传递blob_id给上层组件

3. **合约代码扩展**
   - 修改NFT结构添加blob_id字段
   - 更新NFT创建函数
   - 更新内容更新函数
   - 添加相关getter函数

4. **购买流程整合**
   - 在购买表单中集成上传组件
   - 处理Walrus相关参数传递

5. **NFT内容更新功能**
   - 实现NFT内容更新界面组件
   - 支持从外部URL切换到Walrus存储，反之亦然
   - 处理旧Walrus内容的过期设置
   - 在更新内容时传递blob_id参数

6. **续租流程扩展**
   - 添加检查NFT blob_id的逻辑
   - 实现自动延长存储时间的功能

## 重要注意事项

1. Walrus存储有效期应通过`validUntil`参数设置，单位为秒级Unix时间戳
2. 文件大小应限制在合理范围内（建议5MB以内）
3. 仅支持图片文件类型
4. 应提供优雅的错误处理和用户反馈
5. 环境配置应支持测试网和主网切换

## 技术参考

使用Walrus SDK上传文件的核心代码示例：

```typescript
// 上传文件到Walrus
const blobId = await walrusClient.uploadBlob({
  content: new Uint8Array(buffer),  // 文件内容
  validUntil: Math.floor(Date.now() / 1000) + duration,  // 过期时间(Unix时间戳)
});

// 获取HTTP访问URL
const url = walrusClient.getBlobUrl(blobId);

// 延长存储时间
await walrusClient.extendValidity(blobId, newExpiryTimestamp);
```

## 开发环境

- 前端框架：React + TypeScript
- UI库：Ant Design
- 区块链：Sui
- 存储：Walrus
 