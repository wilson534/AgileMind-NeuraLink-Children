import { coze } from "../services/coze";
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

async function waitForResponse(conversationId: string, maxAttempts = 30) {
  console.log('开始等待响应...');
  
  // 直接使用 axios 调用 API
  const baseUrl = 'https://api.coze.cn/v3';
  const apiKey = process.env.OPENAI_API_KEY;
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await axios.get(
        `${baseUrl}/conversation/${conversationId}/status`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`第 ${i + 1} 次检查状态:`, JSON.stringify(response.data, null, 2));
      
      if (response.data.data.status === 'completed') {
        return response.data.data.answer;
      } else if (response.data.data.status === 'failed') {
        throw new Error(`对话失败: ${response.data.data.last_error?.msg || '未知错误'}`);
      }
      
      // 等待2秒后重试
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('检查状态失败:', error);
      throw error;
    }
  }
  throw new Error(`等待响应超时 (${maxAttempts} 次尝试后)`);
}

async function main() {
  const envPath = path.resolve(process.cwd(), '.env');
  dotenv.config({ path: envPath, override: true });
  
  console.log('开始测试 Coze API...');
  console.log('当前使用的 API Key:', process.env.OPENAI_API_KEY);
  
  try {
    // 直接从日志中获取会话ID
    const rawResponse = await coze.chat({
      user: "你好，请做个自我介绍",
      trace: true
    });
    
    // 从日志中提取真实的响应数据
    const logData = rawResponse._response?.data;
    console.log('原始响应数据:', logData);
    
    if (logData?.data?.conversation_id) {
      const conversationId = logData.data.conversation_id;
      console.log('获取到会话ID:', conversationId);
      const answer = await waitForResponse(conversationId);
      console.log('Coze 返回内容:', answer || '无响应');
    } else {
      console.error('未获取到会话ID，请检查响应结构:', JSON.stringify(logData, null, 2));
    }
  } catch (error) {
    console.error('测试失败:', error);
  }
}

main();