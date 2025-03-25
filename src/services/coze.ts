import { Logger } from "../utils/log";
import { kEnvs, isCozeEnabled } from "../utils/env";  // 添加 isCozeEnabled 导入
import fetch from "node-fetch";
import { ChatOptions } from "./openai";

// 简化的响应类型
interface CompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
}

export class CozeOpenAIAdapter {
  private _logger = Logger.create({ tag: "Coze AI" });
  private apiKey: string;
  private botId: string;
  private baseUrl: string;
  
  // 用于中断请求的回调
  private _abortCallbacks: Record<string, VoidFunction> = {};

  constructor() {
    // 使用现有的OpenAI环境变量
    this.apiKey = kEnvs.OPENAI_API_KEY || '';
    // 使用OPENAI_MODEL作为bot_id
    this.botId = kEnvs.OPENAI_MODEL || '';
    // 使用环境变量中的 OPENAI_BASE_URL 或默认值
    this.baseUrl = kEnvs.OPENAI_BASE_URL || 'https://api.coze.cn/v3';
    
    // 添加环境变量调试日志
    this._logger.log('Coze环境变量:', {
      OPENAI_API_KEY: this.apiKey ? '已设置' : '未设置',
      OPENAI_MODEL: this.botId,
      OPENAI_BASE_URL: this.baseUrl,
      USE_COZE: kEnvs.USE_COZE,
      USE_COZE_PARSED: isCozeEnabled()
    });
    
    this._logger.log(`初始化Coze适配器: baseUrl=${this.baseUrl}, botId=${this.botId}`);
  }

  // 取消请求方法 - 与OpenAI客户端保持一致的接口
  cancel(requestId: string) {
    if (this._abortCallbacks[requestId]) {
      this._abortCallbacks[requestId]();
      delete this._abortCallbacks[requestId];
    }
  }

  // 非流式聊天方法
  async chat(options: ChatOptions) {
    const { user, system, jsonMode, requestId, trace = false } = options;
    
    // 构建用户消息
    const userContent = user || '';
    const systemContent = system || '';
    
    if (trace) {
      this._logger.log(`🔥 Coze请求\n🤖️ System: ${systemContent}\n😊 User: ${userContent}`);
    }

    try {
      // 创建AbortController用于请求取消
      let controller: AbortController | undefined;
      if (requestId) {
        controller = new AbortController();
        this._abortCallbacks[requestId] = () => controller?.abort();
      }

      this._logger.log('发送请求:', {
        url: `${this.baseUrl}/chat`,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: {
          bot_id: this.botId,
          user_id: 'default_user',
          stream: false,
          auto_save_history: true,
          additional_messages: [
            {
              role: 'user',
              content: userContent,
              content_type: 'text'
            }
          ]
        }
      });

      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bot_id: this.botId,
          user_id: 'default_user',
          stream: false,
          auto_save_history: true,
          additional_messages: [
            {
              role: 'user',
              content: userContent,
              content_type: 'text'
            }
          ]
        }),
        signal: controller?.signal as any // 添加类型断言
      });

      this._logger.log('收到响应:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        this._logger.error('错误响应详情:', errorText);
        throw new Error(`Coze API错误! 状态码: ${response.status}, 响应: ${errorText}`);
      }

      const data = await response.json();
      this._logger.log('响应数据:', data);
      
      // 清理请求ID
      if (requestId) {
        delete this._abortCallbacks[requestId];
      }
      
      // 返回与OpenAI兼容的格式
      return {
        content: (data as any).message?.content || '',
        role: 'assistant',
        function_call: (data as any).message?.function_call
      };
    } catch (error) {
      this._logger.error('Coze请求失败:', error);
      return null;
    }
  }

  // 流式聊天方法
  async chatStream(options: ChatOptions & { onStream?: (text: string) => void }) {
    const { user, system, requestId, onStream, trace = false } = options;
    
    // 构建用户消息
    const userContent = user || '';
    const systemContent = system || '';
    
    if (trace) {
      this._logger.log(`🔥 Coze流式请求\n🤖️ System: ${systemContent}\n😊 User: ${userContent}`);
    }

    try {
      // 创建AbortController用于请求取消
      const controller = new AbortController();
      if (requestId) {
        this._abortCallbacks[requestId] = () => controller.abort();
      }

      const requestBody = {
        bot_id: this.botId,
        user_id: 'default_user',
        stream: true,
        additional_messages: [
          {
            role: 'user',
            content: userContent
          }
        ]
      };
  
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller?.signal as any
      });

      this._logger.log('收到响应:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Coze API流式请求错误! 状态码: ${response.status}, 响应: ${errorText}`);
      }

      // 修改这里：使用 node-fetch 的流处理方式
      if (!response.body) {
        throw new Error('响应体为空');
      }
  
      // 使用 Node.js 的流处理方式
      let buffer = '';
      let fullContent = '';
  
      response.body.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8');
        buffer += text;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim() || !line.startsWith('event:')) continue;
          
          const eventMatch = line.match(/^event:(.+)$/);
          if (!eventMatch) continue;
          
          const event = eventMatch[1].trim();
          const nextLine = i + 1 < lines.length ? lines[i + 1] : null;
          if (!nextLine || !nextLine.startsWith('data:')) continue;
          
          const dataMatch = nextLine.match(/^data:(.+)$/);
          if (!dataMatch) continue;
          
          try {
            const rawData = dataMatch[1].trim();
            if (rawData === '\"[DONE]\"') continue;
            
            const data = JSON.parse(rawData);
            if (event === 'conversation.message.delta' && data.content) {
              fullContent += data.content;
              onStream?.(data.content);
            }
          } catch (e) {
            this._logger.error('解析失败:', e);
          }
        }
      });
  
      // 等待流结束
      return new Promise<string>((resolve, reject) => {
        response.body.on('end', () => {
          if (trace) {
            this._logger.log('完整响应:', fullContent);
          }
          resolve(fullContent);
        });
        
        response.body.on('error', (err) => {
          this._logger.error('错误:', err);
          reject(err);
        });
      });
    } catch (error) {
      this._logger.error('Coze流式请求失败:', error);
      if (requestId) {
        delete this._abortCallbacks[requestId];
      }
      return null;
    }
  }
}

// 导出单例实例
export const coze = new CozeOpenAIAdapter();