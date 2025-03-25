import { coze } from '../services/coze';
import { kEnvs } from '../utils/env';

async function testCozeChat() {

  console.log('开始测试 Coze API...');
  
  const response = await coze.chatStream({
    user: '你好，请做个自我介绍',
    trace: true,
    onStream: (text) => {
      process.stdout.write(text); // 实时打印响应内容
    }
  });

  console.log('\n完整响应:', response);
}

// 运行测试
testCozeChat().catch(error => {
  console.error('测试失败:', error);
});