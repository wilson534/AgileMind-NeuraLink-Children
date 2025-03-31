import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

async function main() {
  // 加载环境变量
  const envPath = path.resolve(process.cwd(), '.env');
  dotenv.config({ path: envPath, override: true });
  
  const apiKey = process.env.OPENAI_API_KEY;
  const botId = process.env.OPENAI_MODEL;
  const baseUrl = 'https://api.coze.cn/v3';
  
  console.log('开始直接测试 Coze API...');
  console.log('API Key:', apiKey);
  console.log('Bot ID:', botId);
  
  try {
    // 1. 直接发送聊天请求
    console.log('发送聊天请求...');
    const chatResponse = await axios.post(
      `${baseUrl}/chat`,
      {
        bot_id: botId,
        user_id: 'default_user',
        stream: false,
        auto_save_history: true,
        additional_messages: [
          {
            role: 'user',
            content: '你好，请做个自我介绍'
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('聊天响应:', JSON.stringify(chatResponse.data, null, 2));
    
    // 根据错误信息，我们需要使用正确的API端点
    // 尝试使用 /v3/chat/completions 端点获取结果
    if (chatResponse.data.data.id) {
      const chatId = chatResponse.data.data.id;
      console.log('获取到聊天ID:', chatId);
      
      // 2. 轮询检查聊天状态
      for (let i = 0; i < 30; i++) {
        console.log(`第 ${i + 1} 次检查状态...`);
        
        try {
          // 尝试使用不同的端点
          const statusResponse = await axios.get(
            `${baseUrl}/chat/${chatId}`,
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          console.log('状态响应:', JSON.stringify(statusResponse.data, null, 2));
          
          if (statusResponse.data.data.status === 'completed') {
            console.log('Coze 返回内容:', statusResponse.data.data.answer || '无响应');
            break;
          } else if (statusResponse.data.data.status === 'failed') {
            console.error('对话失败:', statusResponse.data.data.last_error?.msg || '未知错误');
            break;
          } else if (i === 29) {
            // 最后一次尝试，直接返回当前状态
            console.log('达到最大尝试次数，当前状态:', statusResponse.data.data.status);
          }
        } catch (statusError) {
          console.error('检查状态失败:', statusError.response?.data || statusError.message);
          
          // 尝试另一个可能的端点
          try {
            const altStatusResponse = await axios.get(
              `${baseUrl}/chat/completions/${chatId}`,
              {
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            console.log('备用端点响应:', JSON.stringify(altStatusResponse.data, null, 2));
          } catch (altError) {
            console.error('备用端点也失败:', altError.response?.data || altError.message);
          }
        }
        
        // 等待2秒后重试
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } else {
      console.error('未获取到聊天ID');
    }
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

main();