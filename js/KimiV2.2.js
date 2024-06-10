import fetch from "node-fetch";
import fs from 'fs';

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

let Character_setting = `./plugins/example/Character_setting.txt`; // 角色设定文件路径位置
let cs_switch = false; // 是否使用自设定 (非常吃token！！)
let moonshot_sk = `你的sk`; // Moonshot API Key
let moonshot_url = `https://api.moonshot.cn/v1/chat/completions`; // Moonshot AI API URL
let moonshot_model = `moonshot-v1-8k`; // 模型名称

export class example2 extends plugin {
    constructor() {
        super({
            name: 'Moonshot AI',
            dsc: 'Moonshot AI Assistant',
            event: 'message',
            priority: -500,
            rule: [
                {
                    reg: '^#kimi(.*)$',
                    fnc: 'chat'
                },
                {
                    reg: '^#结束对话$',
                    fnc: "endchat"
                }
            ]
        });
    }

    async endchat(e) {
        // ... 保持不变
    }

    async chat(e) {
        let messages = [];
        try {
            messages = JSON.parse(fs.readFileSync(`./data/${e.user_id}_MS.json`, 'utf-8'));
        } catch {
            messages = [];
        }

        const systemMessage = {
            "role": "system",
            "content": "你是Kimi，由Moonshot AI提供的人工智能助手。"
        };

        if (cs_switch && fs.existsSync(Character_setting)) {
            messages.push(systemMessage, {
                role: 'user',
                content: e.msg.replace(/#kimi/g, ``)
            });
        } else {
            if (messages.length === 0) {
                messages.push(systemMessage);
            }
            messages.push({
                role: 'user',
                content: e.msg.replace(/#kimi/g, ``)
            });
        }

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${moonshot_sk}`
            },
            body: JSON.stringify({
                model: moonshot_model,
                messages: messages,
                temperature: 0.3 // 根据需要调整
            })
        };

        let response;
        try {
            response = await fetch(moonshot_url, options);
            response = await response.json();
        } catch (error) {
            await e.reply([`请求API时出错！请检查网络设置和API地址设置`]);
            return true;
        }

        if (response.error) {
            await e.reply([`出现错误！\n${response.error.message}`]);
            return true;
        }

        const assistantMessage = {
            role: "assistant",
            content: response.choices[0].message.content
        };
        messages.push(assistantMessage);

        fs.writeFileSync(`./data/${e.user_id}_MS.json`, JSON.stringify(messages, null, 3), 'utf-8');
        await e.reply([response.choices[0].message.content], true);
        return true;
    }
}
