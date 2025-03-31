import { Client } from '@larksuiteoapi/node-sdk';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

// 飞书应用配置
const client = new Client({
  appId: 'cli_a76fa6a9b070501c',
  appSecret: 'UrtdO4olfoxuQ7vvgMckAhLwsbiokYFy',
  disableTokenCache: false // 启用token缓存
});

// 将数据导出为CSV文件，然后手动导入到飞书
async function exportToCSV() {
  try {
    // 获取所有消息记录
    const messages = await prisma.message.findMany({
      include: {
        sender: true,
        room: true,
      },
      take: 100, // 导出100条测试
    });

    console.log('查询到的消息数量:', messages.length);
    if (messages.length === 0) {
      console.log('数据库中没有消息记录！');
      return;
    }

    // 创建CSV内容
    let csvContent = '消息内容,发送者,房间,发送时间\n';
    
    for (const message of messages) {
      // 处理CSV中的特殊字符
      const text = message.text ? `"${message.text.replace(/"/g, '""')}"` : '';
      const sender = message.sender?.name ? `"${message.sender.name.replace(/"/g, '""')}"` : '"未知"';
      const room = message.room?.name ? `"${message.room.name.replace(/"/g, '""')}"` : '"未知"';
      const time = message.createdAt ? `"${new Date(message.createdAt).toLocaleString()}"` : '';
      
      csvContent += `${text},${sender},${room},${time}\n`;
    }
    
    // 写入CSV文件
    const fileName = `chat_messages_${new Date().toISOString().split('T')[0]}.csv`;
    fs.writeFileSync(fileName, csvContent, 'utf8');
    
    console.log(`数据已导出到文件: ${fileName}`);
    console.log('请手动将此CSV文件导入到飞书多维表格中');
    
  } catch (error) {
    console.error('导出失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// 同步数据库消息记录到飞书多维表格
async function syncMessagesToFeishu() {
  try {
    console.log('开始同步数据库消息到飞书多维表格...');
    
    // 飞书多维表格配置
    const appToken = 'U3UJbQjhkaGgsBsBCCJcFhpwnFc';
    const tableId = 'tbldbDBmO1lpWmiU';
    
    // 获取所有消息记录
    const messages = await prisma.message.findMany({
      include: {
        sender: true,
        room: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100, // 每次同步100条，可以根据需要调整
    });

    console.log(`查询到 ${messages.length} 条消息记录，准备同步到飞书...`);
    if (messages.length === 0) {
      console.log('数据库中没有消息记录！');
      return;
    }
    
    // 同步计数器
    let successCount = 0;
    let failCount = 0;
    
    // 逐条同步消息记录
    for (const message of messages) {
      try {
        // 创建飞书记录对象
        const record = {
          fields: {
            '文本': message.text || '',
            '单选': message.sender?.name || '未知用户',
            '日期': new Date(message.createdAt).getTime() // 毫秒级时间戳
          }
        };
        
        // 发送到飞书
        const response = await client.bitable.v1.appTableRecord.create({
          path: {
            app_token: appToken,
            table_id: tableId
          },
          data: record
        });
        
        successCount++;
        
        // 每10条记录输出一次进度
        if (successCount % 10 === 0) {
          console.log(`已成功同步 ${successCount} 条记录...`);
        }
        
        // 添加延迟，避免请求过快
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`同步消息ID ${message.id} 失败:`, error);
        failCount++;
      }
    }
    
    console.log(`同步完成! 成功: ${successCount} 条, 失败: ${failCount} 条`);
    
  } catch (error) {
    console.error('同步失败:', error);
  }
}

// 执行同步操作
async function main() {
  try {
    console.log('开始执行数据库到飞书的同步操作...');
    await syncMessagesToFeishu();
    console.log('同步操作完成!');
  } catch (error) {
    console.error('执行失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();