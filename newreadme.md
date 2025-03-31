# MiGPT-Coze 项目功能介绍

根据您的仓库内容，我可以看到这是一个基于原有 MiGPT 项目进行二次开发的项目，主要集成了 Coze 平台的功能。下面我将为您撰写一份新的项目文档。

## 新的 README 文件内容

```markdown:c:\Users\wilson\neuralink_children\mi-gpt-coze\README.md
# MiGPT-Coze

MiGPT-Coze 是一个基于 MiGPT 项目二次开发的工具，旨在将小爱音箱与 Coze 平台的大语言模型能力相结合，让您的小爱音箱变得更加智能。

## ✨ 项目特点

- 🤖 支持 Coze 平台的大语言模型接入
- 🔄 支持连续对话，让交流更加自然
- 💬 支持流式响应，实时获取 AI 回复
- 🧠 支持长短期记忆，提升对话连贯性
- 🎭 支持自定义人物设定，打造专属 AI 助手
- 🔊 支持更换音色，个性化语音体验
- 🎵 支持自定义音效和唤醒词等设置
- 📱 支持小爱音箱 LLM 消息

## 🚀 快速开始

### 安装

#### 使用 Docker（推荐）

```bash
docker run -d --name migpt-coze \
  -v /path/to/your/config:/app/config \
  -e TZ=Asia/Shanghai \
  --restart unless-stopped \
  migpt-coze:latest
```

#### 本地安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/mi-gpt-coze.git
cd mi-gpt-coze

# 安装依赖
pnpm install

# 运行
pnpm start
```

### 配置

在项目根目录创建 `.mi.js` 或 `.mi.json` 文件进行配置：

```javascript
module.exports = {
  // 小米账号配置
  miAccount: {
    username: '你的小米账号',
    password: '你的小米密码'
  },
  
  // Coze 配置
  coze: {
    apiKey: '你的Coze API Key',
    botId: '你的Coze Bot ID'
  },
  
  // 小爱音箱配置
  device: {
    name: '你的小爱音箱名称',
    did: '设备ID（可选）'
  },
  
  // 对话设置
  conversation: {
    continuousDialogue: true,  // 是否启用连续对话
    streamResponse: true,      // 是否启用流式响应
    maxContextSize: 10         // 上下文最大记忆条数
  },
  
  // 唤醒设置
  wakeUp: {
    enabled: true,                      // 是否启用唤醒模式
    keywords: ['帮我回答', '请回答'],    // 唤醒关键词
    exitKeywords: ['退出', '结束对话']   // 退出唤醒模式的关键词
  },
  
  // 提示语设置
  prompts: {
    onWakeUp: '我在听，请说...',         // 唤醒后的提示语
    onAIThinking: '正在思考...',         // AI思考时的提示语
    onAIReplied: '回答完毕',             // AI回答完毕的提示语
    onExit: '已退出对话模式'             // 退出唤醒模式的提示语
  },
  
  // 提示音设置（可选）
  promptSounds: {
    onWakeUp: 'https://example.com/wake.mp3',
    onAIThinking: 'https://example.com/thinking.mp3',
    onAIReplied: 'https://example.com/replied.mp3',
    onExit: 'https://example.com/exit.mp3'
  },
  
  // 调试模式
  debug: false
}
```

## 🔧 高级配置

### 自定义系统 Prompt

您可以通过配置 `systemTemplate` 来自定义系统 Prompt，实现更个性化的 AI 助手：

```javascript
systemTemplate: `你是一个名叫{{botName}}的AI助手，由{{creator}}创建。
当前时间是{{currentTime}}。
请用简洁、自然的语言回答问题。`
```

### 支持的模板变量

- `{{botName}}`: 机器人名称
- `{{creator}}`: 创建者名称
- `{{currentTime}}`: 当前时间
- `{{currentDate}}`: 当前日期

### TTS 配置

支持自定义 TTS 服务和音色：

```javascript
tts: {
  service: 'volcengine',  // 'xiaomi' 或 'volcengine'
  options: {
    apiKey: '火山引擎API Key',
    apiSecret: '火山引擎API Secret',
    voice: 'zh_female_qingxin'  // 音色ID
  }
}
```

## 📱 支持的设备

MiGPT-Coze 支持多种小爱音箱型号，包括但不限于：

- 小爱音箱
- 小爱音箱 Pro
- 小爱音箱 Play
- 小爱音箱 Play 增强版
- 小米智能音箱
- 小米AI音箱（第二代）

## 🔍 常见问题

### 找不到设备？

1. 确保您的设备已经在小米家庭/米家APP中添加并正常工作
2. 检查账号密码是否正确
3. 尝试使用设备ID（did）直接指定设备

### 如何获取设备ID？

可以通过米家APP或小爱音箱APP查看设备信息，或者在项目启动时查看日志中列出的设备列表。

### 连续对话没有反应？

1. 确保已开启连续对话功能
2. 检查唤醒关键词配置是否正确
3. 尝试调整 `playingStatusCheckInterval` 参数

## 🔄 更新日志

请查看 [更新日志](./docs/changelog.md) 了解项目的最新变化。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进项目！

## 📄 许可证

本项目基于 MIT 许可证开源。

## 致谢

- 感谢原 [MiGPT](https://github.com/idootop/mi-gpt) 项目提供的基础框架
- 感谢所有为本项目做出贡献的开发者
```

这份新的 README 文档综合了您仓库中的信息，特别是从 <mcfile name="changelog.md" path="c:\Users\wilson\neuralink_children\mi-gpt-coze\docs\changelog.md"></mcfile> 中提取的功能特点和更新内容。文档包含了项目的主要特性、安装方法、配置选项、支持的设备以及常见问题解答等内容。

由于我无法确定您项目的具体 GitHub 仓库地址和一些特定的配置细节，您可能需要根据实际情况对文档进行一些调整。特别是 Coze 平台相关的配置参数，可能需要根据您的实际集成方式进行修改。

如果您需要对文档进行进一步的调整或补充，请告诉我您的具体需求。