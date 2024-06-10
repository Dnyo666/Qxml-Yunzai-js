import fetch from 'node-fetch';
import fs from 'fs';
import common from '../../lib/common/common.js'; // 确保common模块路径正确

/**
 * 作者：浅巷墨黎(2315823357)
 * Gitee主页：https://gitee.com/Dnyo666
 * Github主页：https://github.com/Dnyo666
 * 
 * 该插件所有版本发布于 该仓库(https://gitee.com/qiannqq/yunzai-plugin-JS) 
 * 本插件及该仓库的所有插件均遵循 GPL3.0 开源协议
 * 
 * 请勿使用本插件进行盈利等商业活动行为
 */

// 插件配置信息
const ZHIPUAI_API_KEY = 'API Key'; // 替换为您的实际API Key
const ZHIPUAI_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// 插件类定义
export class ZhipuAIExample extends plugin {
    constructor() {
        super({
            name: 'ZhipuAI Assistant',
            dsc: 'ZhipuAI Assistant for QQ Group',
            event: 'message',
            priority: -500,
            rule: [
                { reg: '^#glm(.*)$', fnc: 'chat' },
                { reg: '^#结束glm对话$', fnc: 'endchat' }
            ]
        });
    }

    // 结束对话的方法
    async endchat(e) {
        await e.reply(['对话结束。']);
        return true;
    }

    // 聊天的方法
    async chat(e) {
        const userMessage = e.msg.replace(/#glm/g, '');
        let messages = [
            {"role": "system", "content": "你是ChatGLM，是一个人工智能助手。"},
            {"role": "assistant", "content": "好的！"},
            {"role": "user", "content": userMessage},
        ];

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${ZHIPUAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "glm-4", // 模型编码
                messages: messages,
                temperature: 0.3, // 采样温度
                max_tokens: 1024 // 最大令牌数
            })
        };

        try {
            const response = await fetch(ZHIPUAI_API_URL, options);
            const data = await response.json();

            if (response.ok) {
                const message = data.choices[0].message.content;
                if (message.length > 8000) {
                    await e.reply(['字数过长！']);
                } else {
                    await this.processAssistantMessage(e, message);
                }
            } else {
                await e.reply([`出现错误！\\\\n${data.error.message}`]);
            }
        } catch (error) {
            console.error('API调用出错：', error);
            await e.reply([`请求API时出错！请检查网络设置和API地址设置`]);
        }

        // 保存最新的消息记录
        fs.writeFileSync(`./data/${e.user_id}_GLM.json`, JSON.stringify(messages, null, 3), 'utf-8');
    }

    // 处理助手消息的方法，包括拆分消息和自动添加序号及说明
    async processAssistantMessage(e, message) {
        const maxLength = 800;
        let messageParts = [];

        if (message.length > maxLength) {
            await e.reply(['字数过长！']);
        } else {
            messageParts.push({
                type: 'text',
                data: { text: message }
            });
        }

        const forwardMessages = messageParts;
        const msg = forwardMessages.map(part => part.data.text);
        await e.reply(msg);
    }
}