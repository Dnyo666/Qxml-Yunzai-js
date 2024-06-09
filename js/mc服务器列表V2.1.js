import plugin from '../../lib/plugins/plugin.js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * 作者：浅巷墨黎
 * 鸣谢：Motd插件
 * Gitee：https://gitee.com/Dnyo666
 * Github:https://github.com/Dnyo666
 * 个人博客：blog.qxml.ltd
 * 交流群：303104111
 * 
 * 插件发布地址：https://github.com/Dnyo666/Qxml-Yunzai-js
 * 禁止商用、倒卖等获利行为
 */


// 获取当前文件的路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 确保插件的data目录存在
const dataDir = path.join(__dirname, '..', 'data', 'McMotd');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
const aliasFilePath = path.join(dataDir, 'SAlias.json');

// 确保SAlias.json文件存在
if (!fs.existsSync(aliasFilePath)) {
    fs.writeFileSync(aliasFilePath, '{}');
}

export class McServer extends plugin {
    constructor() {
        super({
            name: 'McServer',
            desc: '查询储存的Minecraft服务器状态',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '#mclist',
                    fnc: 'getServersStatus'
                },
                {
                    reg: '#mcadd',
                    fnc: 'addAlias'
                }
            ]
        });
    }

    async addAlias(e) {
        try {
            // 读取现有的别名数据
            let alias = JSON.parse(fs.readFileSync(aliasFilePath, 'utf-8'));
            const args = e.message[0].text.trim().slice(6).trim().split(' ');
            const ip = args[0];
            const description = args.slice(1).join(' ') || '无描述'; // 如果没有提供描述，使用默认描述

            // 检查是否提供了IP地址
            if (!ip) {
                e.reply('用法: #mcadd [IP Address] [描述]');
                return;
            }

            // 确保该功能仅限群聊使用
            if (!e.isGroup) {
                e.reply('该功能仅限群聊');
                return;
            }

            const { group_id } = e;
            if (!alias[group_id]) {
                alias[group_id] = [];
            }

            // 添加新的服务器信息
            const serverInfo = { ip, description };
            alias[group_id].push(serverInfo);
            fs.writeFileSync(aliasFilePath, JSON.stringify(alias, null, 2), 'utf-8');
            e.reply(`添加成功: ${ip} - ${description}`);
        } catch (error) {
            console.error('添加别名时发生错误:', error);
            e.reply('添加失败，请稍后再试或联系管理员。');
        }
    }

    async getServersStatus(e) {
        try {
            // 读取现有的别名数据
            let alias = JSON.parse(fs.readFileSync(aliasFilePath, 'utf-8'));
            const groupServers = alias[e.group_id];

            // 检查该群是否有储存的服务器IP
            if (!groupServers || groupServers.length === 0) {
                e.reply('该群没有储存的服务器IP');
                return;
            }

            // 获取每个服务器的状态
            const statusList = await Promise.all(
                groupServers.map(async (serverInfo) => {
                    const res = await fetch(`https://api.mcstatus.io/v2/status/java/${encodeURIComponent(serverInfo.ip)}`);
                    const data = await res.json();
                    const status = data.online ? '在线🟢' : '离线🔴';
                    return `[${serverInfo.ip}] ${serverInfo.description} - ${status}`;
                })
            );

            // 返回状态列表
            e.reply(statusList.join('\n'));
        } catch (error) {
            console.error('获取服务器状态时发生错误:', error);
            e.reply('获取状态失败，请稍后再试或联系管理员。');
        }
    }
}
