import dotenv from 'dotenv';
import path from 'path';

// 添加布尔值解析辅助函数
const parseBoolean = (value: string | undefined) => {
  if (!value) return false;
  return value.toLowerCase() === 'true';
};

// 加载 .env 文件
const envPath = path.resolve(process.cwd(), '.env');
const result = dotenv.config({ path: envPath });

// 定义环境变量类型
type EnvVars = {
  USE_COZE: string;
  OPENAI_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL: string;
  TTS_BASE_URL?: string;
  AZURE_OPENAI_API_KEY?: string;
  AZURE_OPENAI_DEPLOYMENT?: string;
};

// 设置默认环境变量
const defaultEnvs: EnvVars = {
  USE_COZE: 'true',
  OPENAI_BASE_URL: 'https://api.coze.cn/v3'
};

// 合并环境变量
const mergedEnv = {
  ...defaultEnvs,
  ...process.env
} as EnvVars;

// 定义 Coze 配置类型
export interface CozeConfig {
  enabled: boolean;
  model?: string;
  apiKey?: string;
  baseUrl: string;
}

// 导出 Coze 配置
export const cozeConfig: CozeConfig = {
  enabled: parseBoolean(mergedEnv.USE_COZE),
  model: mergedEnv.OPENAI_MODEL,
  apiKey: mergedEnv.OPENAI_API_KEY,
  baseUrl: mergedEnv.OPENAI_BASE_URL
};

export const kEnvs: Partial<{
  MI_USER: string;
  MI_PASS: string;
  MI_DID: string;
  OPENAI_MODEL: string;
  OPENAI_API_KEY: string;
  USE_COZE: string;
  AZURE_OPENAI_API_KEY: string;
  AZURE_OPENAI_DEPLOYMENT: string;
  OPENAI_BASE_URL: string;
  TTS_BASE_URL?: string;
  QWEN_ENABLE_SEARCH: boolean;
}> = {
  ...mergedEnv,
  QWEN_ENABLE_SEARCH: parseBoolean(mergedEnv.QWEN_ENABLE_SEARCH)
};

// 导出布尔值解析函数
export const isCozeEnabled = () => cozeConfig.enabled;
