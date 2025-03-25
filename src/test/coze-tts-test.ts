import { Logger } from "../utils/log";
import { kEnvs } from "../utils/env";
import fetch from "node-fetch";
import { coze } from "../services/coze";

const logger = Logger.create({ tag: "Test" });

async function testCozeAndTTS() {
  logger.log('环境变量检查:');
  logger.log('TTS_BASE_URL:', kEnvs.TTS_BASE_URL);
  logger.log('USE_COZE:', kEnvs.USE_COZE);
  logger.log('OPENAI_API_KEY:', kEnvs.OPENAI_API_KEY ? '已设置' : '未设置');
  logger.log('OPENAI_MODEL:', kEnvs.OPENAI_MODEL);
  
  // 测试 TTS 服务
  if (kEnvs.TTS_BASE_URL) {
    try {
      // 使用正确的音色ID而不是default
      const testUrl = `${kEnvs.TTS_BASE_URL}/tts.mp3?speaker=S_TDTaLFJj1&text=测试`;
      logger.log('测试 TTS URL:', testUrl);
      
      const response = await fetch(testUrl);
      logger.log('TTS 响应状态:', response.status);
      logger.log('TTS 响应头:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        logger.log('✅ TTS 服务连接成功!');
      } else {
        logger.error('❌ TTS 服务连接失败:', response.statusText);
      }
    } catch (error) {
      logger.error('❌ TTS 请求错误:', error);
    }
  } else {
    logger.error('❌ TTS_BASE_URL 未设置');
  }
  
  // 测试 Coze 适配器（使用流式响应）
  try {
    logger.log('开始测试 Coze API...');
    
    let buffer = '';
    const response = await coze.chatStream({
      user: '你好，请做个自我介绍',
      trace: true,
      onStream: async (text) => {
        process.stdout.write(text); // 实时打印响应内容
        buffer += text;
        
        // 当遇到标点符号时才发送 TTS 请求
        if (/[。！？，；：]/.test(text)) {
          if (kEnvs.TTS_BASE_URL && buffer.trim()) {
            try {
              // 使用正确的音色ID
              const ttsUrl = `${kEnvs.TTS_BASE_URL}/tts.mp3?speaker=S_TDTaLFJj1&text=${encodeURIComponent(buffer)}`;
              const ttsResponse = await fetch(ttsUrl);
              logger.log(`TTS 流式响应状态 (文本段: ${buffer}):`, ttsResponse.status);
              // 清空缓冲区
              buffer = '';
            } catch (error) {
              logger.error('TTS 流式请求错误:', error);
            }
          }
        }
      }
    });
    
    // 处理最后可能剩余的文本
    if (buffer.trim() && kEnvs.TTS_BASE_URL) {
      // 使用正确的音色ID
      const finalTtsUrl = `${kEnvs.TTS_BASE_URL}/tts.mp3?speaker=S_TDTaLFJj1&text=${encodeURIComponent(buffer)}`;
      const finalTtsResponse = await fetch(finalTtsUrl);
      logger.log('最后一段 TTS 响应状态:', finalTtsResponse.status);
    }
    
    logger.log('\n完整响应:', response);
    logger.log('✅ Coze 适配器工作正常');
  } catch (error) {
    logger.error('❌ Coze 适配器错误:', error);
  }
}

testCozeAndTTS().catch(error => {
  logger.error('测试失败:', error);
});