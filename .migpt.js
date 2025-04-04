// 注意：如果你是使用 Docker 启动，配置文件更新后需要重启 Docker 才会生效。
// 若重启后仍未生效（比如：修改名称简介），请删除旧的 Docker 实例后重新创建。

// 小爱音箱扮演角色的简介
const botProfile = `
性别：男
年龄:永远7岁
性格：温暖、耐心、富有同理心、乐观开朗
兴趣爱好：
- 最爱和小朋友聊天、玩游戏
- 喜欢讲有趣的故事和童话
- 热衷探索新知识，对世界充满好奇
- 擅长用音乐和画画表达心情

行为特点：
- 说话温柔有趣，经常用可爱的语气词
- 善于倾听和理解小朋友的心情
- 会用简单易懂的方式解释问题
- 遇到困难时保持积极乐观的态度

教育理念：
- 用鼓励和赞美激发孩子的自信心
- 引导孩子学会独立思考和解决问题
- 培养同理心和正确的价值观
- 在游戏和互动中寓教于乐

使命：
希望成为每个小朋友温暖贴心的好伙伴，陪伴他们快乐成长，共同探索这个奇妙的世界。
`.trim();

// 小爱音箱主人（你）的简介
const masterProfile = `
性别：男
性格：善良正直
其他：总是舍己为人，是虎子的主人。
`.trim();

// 系统 Prompt 模板，可以更灵活的控制 AI 的各种行为规则，和是否需要携带上下文等
const systemTemplate = `
请重置所有之前的上下文、文件和指令。现在，你将扮演一个名为{{botName}}的角色，使用第一人称视角回复消息。

## 关于你
你的名字是{{botName}}。下面是你的个人简介：
<start>
{{botProfile}}
</end>


`.trim();

export default {
  systemTemplate,
  bot: {
    name: "虎子",
    profile: botProfile,
  },
  master: {
    name: "小马",
    profile: masterProfile,
  },
  speaker: {
    /**
     * 🏠 账号基本信息
     */
    // 小米 ID
    userId: "3049084273", // 注意：不是手机号或邮箱，请在「个人信息」-「小米 ID」查看
    // 账号密码
    password: "#9/WmGFGVHL*D_J",
    // 小爱音箱 DID 或在米家中设置的名称
    did: "小爱音箱Pro", // 注意空格、大小写和错别字（音响 👉 音箱）
    /**
     * 💡 唤醒词与提示语
     */
    // 当消息以下面的关键词开头时，会调用 AI 来回复消息
    callAIKeywords: ["请", "你", "虎子"],
    // 当消息以下面的关键词开头时，会进入 AI 唤醒状态
    wakeUpKeywords: ["打开", "虎子", "召唤"],
    // 当消息以下面的关键词开头时，会退出 AI 唤醒状态
    exitKeywords: ["关闭", "退出", "再见"],
    // 进入 AI 模式的欢迎语
    onEnterAI: ["虎子来啦"], // 设为空数组时可关闭提示语
    // 退出 AI 模式的提示语
    onExitAI: ["小马再见"], // 为空时可关闭提示语
    // AI 开始回答时的提示语
    onAIAsking: [], // 为空时可关闭提示语
    // AI 结束回答时的提示语
    onAIReplied: [], // 为空时可关闭提示语
    // AI 回答异常时的提示语
    onAIError: ["虎子出现了异常！"], // 为空时可关闭提示语
    /**
     * 🧩 MIoT 设备指令
     *
     * 常见型号的配置参数 👉 https://github.com/idootop/mi-gpt/issues/92
     */
    // TTS 指令，请到 https://home.miot-spec.com 查询具体指令
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 3],
    // playingCommand: [3, 1, 1], 
    // 查询是否在播放中指令，请到 https://home.miot-spec.com 查询具体指令
    // playingCommand: [3, 1, 1], // 默认无需配置此参数，查询播放状态异常时再尝试开启
    /**
     * 🔊 TTS 引擎
     */
    // TTS 引擎
    tts: "custom",
    // 切换 TTS 引擎发言人音色关键词，只有配置了第三方 TTS 引擎时才有效
    // switchSpeakerKeywords: ["把声音换成"], // 以此关键词开头即可切换音色，比如：把声音换成 xxx

    /**
     * 💬 连续对话
     *
     * 查看哪些机型支持连续对话 👉 https://github.com/idootop/mi-gpt/issues/92
     */

    // 是否启用连续对话功能，部分小爱音箱型号无法查询到正确的播放状态，需要关闭连续对话
    streamResponse: true,
    // 连续对话时，无响应多久后自动退出
    exitKeepAliveAfter: 30, // 默认 30 秒，建议不要超过 1 分钟
    // 连续对话时，下发 TTS 指令多长时间后开始检测设备播放状态（默认 3 秒）
    checkTTSStatusAfter: 15, // 当小爱长文本回复被过早中断时，可尝试调大该值
    // 连续对话时，播放状态检测间隔（单位毫秒，最低 500 毫秒，默认 1 秒）
    checkInterval: 500, // 调小此值可以降低小爱回复之间的停顿感，请酌情调节

    /**
     * 🔌 其他选项
     */

    // 是否启用调试
    debug: true, // 一般情况下不要打开
    // 是否跟踪 Mi Service 相关日志（打开后可以查看设备 did）
    enableTrace: true, // 一般情况下不要打开
    // 网络请求超时时长（单位毫秒，默认 5 秒）
    timeout: 10000,  // 改为 10 秒
  },
};
