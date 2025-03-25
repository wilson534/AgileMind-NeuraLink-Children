import { kEnvs, isCozeEnabled } from '../utils/env';
import dotenv from 'dotenv';
import path from 'path';

// 直接加载环境变量
const envPath = path.resolve(process.cwd(), '.env');
const result = dotenv.config({ path: envPath });

console.log('===== 环境变量测试 =====');
console.log('ENV 文件路径:', envPath);
console.log('ENV 加载结果:', result);

// 检查原始环境变量
console.log('\n原始环境变量:');
console.log('process.env.USE_COZE =', process.env.USE_COZE);
console.log('process.env.OPENAI_MODEL =', process.env.OPENAI_MODEL);
console.log('process.env.OPENAI_BASE_URL =', process.env.OPENAI_BASE_URL);

// 检查 kEnvs 中的环境变量
console.log('\nkEnvs 中的环境变量:');
console.log('kEnvs.USE_COZE =', kEnvs.USE_COZE);
console.log('kEnvs.OPENAI_MODEL =', kEnvs.OPENAI_MODEL);
console.log('kEnvs.OPENAI_BASE_URL =', kEnvs.OPENAI_BASE_URL);

// 检查 isCozeEnabled 函数
console.log('\nisCozeEnabled() =', isCozeEnabled());

// 检查环境变量类型
console.log('\n环境变量类型:');
console.log('typeof process.env.USE_COZE =', typeof process.env.USE_COZE);
console.log('typeof kEnvs.USE_COZE =', typeof kEnvs.USE_COZE);