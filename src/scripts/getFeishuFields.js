import { Client } from '@larksuiteoapi/node-sdk';

// 飞书应用配置
const client = new Client({
  appId: 'cli_a76fa6a9b070501c',
  appSecret: 'UrtdO4olfoxuQ7vvgMckAhLwsbiokYFy',
  disableTokenCache: false
});

async function getTableFields() {
  try {
    console.log('获取飞书多维表格字段信息...');
    
    // 飞书多维表格配置
    const appToken = 'U3UJbQjhkaGgsBsBCCJcFhpwnFc';
    const tableId = 'tbldbDBmO1lpWmiU';
    
    // 获取表格字段信息
    const response = await client.bitable.v1.appTableField.list({
      path: {
        app_token: appToken,
        table_id: tableId
      }
    });
    
    console.log('表格字段信息:');
    console.log(JSON.stringify(response.data.items, null, 2));
    
    // 提取字段名称列表
    if (response.data && response.data.items && response.data.items.length > 0) {
      console.log('\n字段名称列表:');
      response.data.items.forEach(field => {
        console.log(`- ${field.field_name} (${field.type})`);
      });
    }
    
  } catch (error) {
    console.error('获取字段失败:', error);
  }
}

getTableFields();