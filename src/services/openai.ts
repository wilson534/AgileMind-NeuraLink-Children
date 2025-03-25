import OpenAI, { AzureOpenAI } from "openai";
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources";

import { kEnvs, cozeConfig } from "../utils/env"; 
import { withDefault } from "../utils/base";
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions";
import { Logger } from "../utils/log";
import { kProxyAgent } from "./proxy";
import { isNotEmpty } from "../utils/is";

export interface ChatOptions {
  user?: string;  // 修改为可选
  system?: string;
  jsonMode?: boolean;
  requestId?: string;
  trace?: boolean;
  onStream?: (text: string) => void;  // 确保这个参数在接口中定义
  tools?: ChatCompletionTool[];
  model?: string;
  enableSearch?: boolean;
}

class OpenAIClient {
  traceInput = false;
  traceOutput = true;
  private _logger = Logger.create({ tag: "Open AI" });

  deployment?: string;

  private _client?: OpenAI;
  private _init() {
    this.deployment = kEnvs.AZURE_OPENAI_DEPLOYMENT;
    if (!this._client) {
      this._logger.log('初始化 OpenAI 客户端:', {
        model: kEnvs.OPENAI_MODEL,
        baseURL: kEnvs.OPENAI_BASE_URL,
        useCoze: cozeConfig.enabled
      });
      
      // 如果启用了 Coze，创建一个基本的客户端实例
      if (cozeConfig.enabled) {
        this._client = new OpenAI({ 
          httpAgent: kProxyAgent,
          baseURL: cozeConfig.baseUrl
        });
        return;
      }

      this._client = kEnvs.AZURE_OPENAI_API_KEY
        ? new AzureOpenAI({
            httpAgent: kProxyAgent,
            deployment: this.deployment,
          })
        : new OpenAI({ 
            httpAgent: kProxyAgent,
            baseURL: kEnvs.OPENAI_BASE_URL
          });
    }
  }

  private _abortCallbacks: Record<string, VoidFunction> = {
    // requestId: abortStreamCallback
  };

  cancel(requestId: string) {
    this._init();
    if (this._abortCallbacks[requestId]) {
      this._abortCallbacks[requestId]();
      delete this._abortCallbacks[requestId];
    }
  }

  async chat(options: ChatOptions) {
    this._init();
    
    // 如果启用了 Coze，使用 Coze 适配器
    if (cozeConfig.enabled) {
      try {
        // 使用 coze 单例实例，而不是创建新实例
        const { coze } = require('./coze');
        this._logger.log('使用 Coze 适配器处理请求');
        return await coze.chat(options);
      } catch (error) {
        this._logger.error('Coze 适配器错误:', error);
        return null;
      }
    }
    let {
      user,
      system,
      tools,
      jsonMode,
      requestId,
      trace = false,
      model = this.deployment ?? kEnvs.OPENAI_MODEL ?? "gpt-4o",
    } = options;
    if (trace && this.traceInput) {
      this._logger.log(
        `🔥 onAskAI\n🤖️ System: ${system ?? "None"}\n😊 User: ${user}`.trim()
      );
    }
    const systemMsg: ChatCompletionMessageParam[] = isNotEmpty(system)
      ? [{ role: "system", content: system! }]
      : [];
    let signal: AbortSignal | undefined;
    if (requestId) {
      const controller = new AbortController();
      this._abortCallbacks[requestId] = () => controller.abort();
      signal = controller.signal;
    }
    const chatCompletion = await this._client!.chat.completions.create(
      {
        model,
        tools,
        messages: [...systemMsg, { role: "user", content: user || '' }], // 修复：添加默认空字符串
        response_format: jsonMode ? { type: "json_object" } : undefined,
      },
      { signal }
    ).catch((e) => {
      this._logger.error("LLM 响应异常", e);
      return null;
    });
    if (requestId) {
      delete this._abortCallbacks[requestId];
    }
    const message = chatCompletion?.choices?.[0]?.message;
    if (trace && this.traceOutput) {
      this._logger.log(`✅ Answer: ${message?.content ?? "None"}`.trim());
    }
    return message;
  }

  async chatStream(options: ChatOptions) {
    this._init();
    
    // 如果启用了 Coze，使用 Coze 适配器的流式响应
    if (cozeConfig.enabled) {
      try {
        // 直接导入 coze 单例
        const { coze } = require('./coze');
        this._logger.log('使用 Coze 适配器处理流式请求');
        
        // 确保 onStream 回调函数能够正确处理文本分段
        const originalOnStream = options.onStream;
        let buffer = '';
        
        // 创建新的 onStream 处理函数，实现类似测试文件中的文本分段逻辑
        options.onStream = (text) => {
          buffer += text;
          
          // 当遇到句子结束符号时才调用原始的 onStream
          if (/[。！？]/.test(text) && buffer.trim()) {
            if (originalOnStream) {
              originalOnStream(buffer);
            }
            buffer = '';
          }
        };
        
        // 调用 coze 的流式响应方法
        const result = await coze.chatStream(options);
        
        // 处理可能剩余的文本
        if (buffer.trim() && originalOnStream) {
          originalOnStream(buffer);
        }
        
        return result;
      } catch (error) {
        this._logger.error('Coze 适配器流式请求错误:', error);
        return null;
      }
    }
    
    // 原生 OpenAI 处理逻辑保持不变
    let {
      user,
      system,
      tools,
      jsonMode,
      requestId,
      onStream,
      trace = false,
      model = this.deployment ?? kEnvs.OPENAI_MODEL ?? "gpt-4o",
      enableSearch = kEnvs.QWEN_ENABLE_SEARCH,
    } = options;
    
    if (trace && this.traceInput) {
      this._logger.log(
        `🔥 onAskAI\n🤖️ System: ${system ?? "None"}\n😊 User: ${user}`.trim()
      );
    }
    const systemMsg: ChatCompletionMessageParam[] = isNotEmpty(system)
      ? [{ role: "system", content: system! }]
      : [];
    const stream = await this._client!.chat.completions
      .create({
        model,
        tools,
        stream: true,
        messages: [...systemMsg, { role: "user", content: user || '' }], // 修复 undefined 问题
        response_format: jsonMode ? { type: "json_object" } : undefined,
        ...(enableSearch && { enable_search: true })
      })
      .catch((e) => {
        this._logger.error("LLM 响应异常", e);
        return null;
      });
    if (!stream) {
      return;
    }
    if (requestId) {
      this._abortCallbacks[requestId] = () => stream.controller.abort();
    }
    let content = "";
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      const aborted =
        requestId && !Object.keys(this._abortCallbacks).includes(requestId);
      if (aborted) {
        content = "";
        break;
      }
      if (text) {
        onStream?.(text);
        content += text;
      }
    }
    if (requestId) {
      delete this._abortCallbacks[requestId];
    }
    if (trace && this.traceOutput) {
      this._logger.log(`✅ Answer: ${content ?? "None"}`.trim());
    }
    return withDefault(content, undefined);
  }
}

export const openai = new OpenAIClient();
