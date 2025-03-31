# 心灵纽带NeuraLink - 孩子端AI玩偶

## 项目简介

心灵纽带NeuraLink是一个通过软硬件协同的智能AI服务，链接孩子与家长之间心灵纽带的创新项目。本仓库包含孩子端AI玩偶的核心代码和技术文档，旨在为0-12岁孩子提供全方位的情绪陪伴与教育支持。

通过AI玩偶陪伴孩子，我们能实时掌握孩子的内心动态，同时在家长端提供可视化情绪监控、智能分析和育儿建议，让家长更好地了解孩子，提高亲子沟通和心理健康管理的效率。

> 注意：本项目仅包含孩子端AI玩偶部分，家长端APP及其他组件在另外的项目中。

## 技术架构

### 硬件与软件一体化架构

心灵纽带NeuraLink孩子端AI硬件小熊采用了先进的硬件与软件一体化架构，通过嵌入式系统与云端AI服务相结合，打造了一个智能、安全且富有情感的陪伴型智能硬件。



#### 嵌入式软件技术栈


- **核心框架**：Node.js + TypeScript + C++
- **语音处理**：自研轻量级语音识别引擎 + 火山引擎语音合成
- **设备管理**：MQTT协议 + WebSocket
- **安全框架**：TLS 1.3 + 数据加密存储


#### 云端技术栈

- **核心框架**：Node.js + TypeScript + Express
- **API设计**：RESTful API + GraphQL
- **AI服务**：OpenAI API + Coze智能体 + 自研情感分析模型
- **数据存储**：MongoDB + Redis


#### 数据流架构

我们设计了一套高效的数据流架构，实现了设备端与云端的无缝协作：

1. **设备端数据采集层**：负责收集语音、触摸、环境等传感器数据
2. **边缘计算层**：在设备端进行初步的数据处理和AI推理
3. **云端处理层**：处理复杂AI任务和数据持久化
4. **双向同步层**：确保设备端与云端数据的实时同步

## 核心功能

### 1. 陪伴式聊天与情感引导

- 专为孩子设计的一对一"TALK"功能，实现日常谈心与心理疏导
- 小熊内部集成情感分析模块，通过语音和话语内容推断孩子的情绪并给予温暖回应

### 2. 感情升温与个性化学习

- 小熊能够根据与孩子的长期对话记录，逐步学习孩子的语言习惯和兴趣偏好，形成个性化、持续"情感升温"的交互体验
- 提供唱歌、讲故事、猜谜语及成语、英语等学习互动，将娱乐与学习有机融合

### 3. 远程交流

- 当孩子想念家长或需要家长关注时，小熊可自动发送信息给家长端APP，提醒家长及时了解孩子状态或进行二次互动

## 技术亮点

### 1. 低延迟语音交互系统

- **混合式语音识别**：结合本地轻量级语音识别和云端高精度识别
- **声纹识别**：能够识别不同家庭成员的声音特征
- **情感语调分析**：通过语音特征提取识别情绪变化

### 2. 情感表达与反馈系统

- **多模态情感表达**：结合LED矩阵、显示屏和语音合成
- **触觉反馈**：通过触摸传感器实现自然的互动体验
- **情境感知**：根据环境和互动调整表达方式



## 快速开始

### 安装

#### 使用Docker（推荐）

```bash
docker run -d --name neuralink-children \
  -v /path/to/your/config:/app/config \
  -e TZ=Asia/Shanghai \
  --restart unless-stopped \
  neuralink-children:latest
```

#### 本地安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/neuralink_children.git
cd neuralink_children

# 安装依赖
pnpm install

# 运行
pnpm start
```

### 配置

在项目根目录创建 `.env` 或 `.config.json` 文件进行配置：

```javascript
module.exports = {
  // AI服务配置
  aiService: {
    openai: {
      apiKey: '你的OpenAI API Key'
    },
    coze: {
      apiKey: '你的Coze API Key',
      botId: '你的Coze Bot ID'
    }
  },
  
  // 火山引擎TTS配置
  tts: {
    apiKey: '你的火山引擎API Key',
    apiSecret: '你的火山引擎API Secret',
    voice: 'zh_child_friendly' // 儿童友好音色
  },
  
  // 设备配置
  device: {
    name: '小熊AI玩偶',
    id: '设备唯一ID'
  },
  
  // 家长端连接配置
  parentApp: {
    apiEndpoint: 'https://api.neuralink-parent.com',
    wsEndpoint: 'wss://ws.neuralink-parent.com'
  },
  
  // 调试模式
  debug: false
}
```

## 支持的设备

目前，心灵纽带NeuraLink孩子端AI玩偶支持以下硬件平台：

- Raspberry Pi 4B/CM4系列
- 支持Linux的ARM开发板
- 小米IoT设备（通过mi-gpt-coze适配）

## 项目结构

```
├── src/                  # 源代码目录
│   ├── ai/               # AI服务和模型
│   ├── communication/    # 通信模块
│   ├── interaction/      # 交互逻辑
│   ├── security/         # 安全与隐私保护
│   ├── sensors/          # 传感器管理
│   ├── system/           # 系统管理
│   ├── user/             # 用户配置文件
│   └── utils/            # 工具函数
├── prisma/               # 数据库模型
├── docs/                 # 文档
├── tests/                # 测试
└── mi-gpt-coze/          # 小米设备适配
```

## 贡献指南

我们欢迎各种形式的贡献，包括但不限于：

- 提交问题和功能请求
- 提交代码改进
- 改进文档
- 分享使用经验

请确保您的代码符合我们的编码规范，并通过所有测试。

## 许可证

本项目采用MIT许可证。详情请参阅LICENSE文件。

## 联系我们

如有任何问题或建议，请通过以下方式联系我们：

- 项目负责人：彭智炜
- 技术支持：朱一鸣
- 心理学顾问：李春蕾

## 致谢

- 感谢原[MiGPT](https://github.com/idootop/mi-gpt)项目提供的基础框架
- 感谢火山引擎提供的TTS服务
- 感谢OpenAI和Coze提供的AI模型支持
- 感谢所有为本项目做出贡献的开发者
