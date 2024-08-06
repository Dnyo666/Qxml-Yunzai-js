import plugin from '../../lib/plugins/plugin.js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import common from '../../lib/common/common.js'; // 导入common模块，用于创建转发消息

/**
 * 作者：浅巷墨黎
 * 鸣谢：Motd插件、Tloml、飞舞
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

// 新的目标路径
const dataDir = path.join(__dirname, '..', '..', 'data', 'McMotdList');

// 确保新的McMotdList目录存在
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
                    reg: '^#mclist$', // 匹配#mclist命令，列出服务器列表
                    fnc: 'getServersStatus'
                },
                {
                    reg: '^#mcadd\\s+.+\\s+.+\\s*.*$', // 匹配#mcadd命令，新增服务器
                    fnc: 'addAlias'
                },
                {
                    reg: '^#mcdel\\s+\\d+$', // 匹配#mcdel命令，后接一个ID，删除服务器
                    fnc: 'deleteAlias'
                }
            ]
        });
    }

    async addAlias(e) {
        // 获取当前用户的角色信息
        const memberInfo = await Bot.getGroupMemberInfo(e.group_id, e.user_id);
        // 检查是否为群主、管理员或超级管理员
        if (['owner', 'admin'].includes(memberInfo.role) || e.isMaster) {
            try {
                // 使用正则表达式匹配命令格式
                const match = e.message[0].text.trim().match(/^#mcadd\s+(\S+)\s+(\S+)(?:\s+(.*))?$/);
                if (!match) {
                    e.reply('用法: #mcadd [名称] [地址:端口] [描述]');
                    return;
                }

                const name = match[1];
                const address = match[2];
                const description = match[3] || '无描述';

                // 确保该功能仅限群聊使用
                if (!e.isGroup) {
                    e.reply('该功能仅限群聊');
                    return;
                }

                const { group_id } = e;
                let alias = JSON.parse(fs.readFileSync(aliasFilePath, 'utf-8'));
                if (!alias[group_id]) {
                    alias[group_id] = [];
                }

                // 检查是否有重复地址
                const isDuplicate = alias[group_id].some(server => server.address === address);
                if (isDuplicate) {
                    e.reply(`服务器地址 ${address} 已存在，请勿重复添加。`);
                    return;
                }

                // 为新的服务器分配唯一的ID
                const id = alias[group_id].length > 0 ? alias[group_id][alias[group_id].length - 1].id + 1 : 1;

                // 添加新的服务器信息
                const serverInfo = { id, name, address, description };
                alias[group_id].push(serverInfo);
                fs.writeFileSync(aliasFilePath, JSON.stringify(alias, null, 2), 'utf-8');
                e.reply(`添加成功: 名称: ${name}, 地址: ${address}, 描述: ${description}`);
            } catch (error) {
                console.error('添加别名时发生错误:', error);
                e.reply('添加失败，请稍后再试或联系管理员。');
            }
        } else {
            e.reply('您没有权限添加服务器。');
        }
    }

    async getServersStatus(e) {
        try {
            // 读取现有的别名数据
            let alias = JSON.parse(fs.readFileSync(aliasFilePath, 'utf-8'));
            const groupServers = alias[e.group_id];

            // 检查该群是否有储存的服务器
            if (!groupServers || groupServers.length === 0) {
                e.reply('该群没有储存的服务器,请管理员使用"#mcadd [名称] [地址:端口] [描述]"进行添加');
                return;
            }

            // 获取每个服务器的状态
            const statusList = await Promise.all(
                groupServers.map(async (serverInfo) => {
                    const res = await fetch(`https://api.mcstatus.io/v2/status/java/${encodeURIComponent(serverInfo.address)}`);
                    const data = await res.json();
                    const status = data.online ? '在线🟢' : '离线🔴';

                    return `ID: ${serverInfo.id}\n名称: ${serverInfo.name}\n地址: [${serverInfo.address}]\n描述: ${serverInfo.description}\n状态: ${status}`;
                })
            );

            // 如果服务器数量大于等于5，使用转发功能
            if (statusList.length >= 5) {
                await this.sendForwardMsg(e, statusList);
            } else {
                // 否则，正常回复
                e.reply(statusList.join('\n\n')); // 使用双换行分隔服务器状态信息
            }
        } catch (error) {
            console.error('获取服务器状态时发生错误:', error);
            e.reply('获取状态失败，请稍后再试或联系管理员。');
        }
    }

    async deleteAlias(e) {
        // 获取当前用户的角色信息
        const memberInfo = await Bot.getGroupMemberInfo(e.group_id, e.user_id);
        // 检查是否为群主、管理员或超级管理员
        if (['owner', 'admin'].includes(memberInfo.role) || e.isMaster) {
            try {
                // 读取现有的别名数据
                let alias = JSON.parse(fs.readFileSync(aliasFilePath, 'utf-8'));

                // 提取命令中的服务器ID
                const serverId = parseInt(e.message[0].text.trim().slice(6).trim(), 10);

                // 确保该功能仅限群聊使用
                if (!e.isGroup) {
                    e.reply('该功能仅限群聊');
                    return;
                }

                const { group_id } = e;

                // 检查该群是否有储存的服务器
                if (!alias[group_id] || alias[group_id].length === 0) {
                    e.reply('该群没有储存的服务器,请管理员使用"#mcadd [名称] [地址:端口] [描述]"进行添加');
                    return;
                }

                // 查找并删除指定服务器
                const initialLength = alias[group_id].length;
                alias[group_id] = alias[group_id].filter(serverInfo => serverInfo.id !== serverId);
                const newLength = alias[group_id].length;

                // 判断是否删除成功
                if (initialLength === newLength) {
                    e.reply(`未找到ID为 "${serverId}" 的服务器`);
                } else {
                    // 更新服务器列表中的ID
                    alias[group_id].forEach((serverInfo, index) => {
                        serverInfo.id = index + 1;
                    });

                    // 更新 JSON 文件
                    fs.writeFileSync(aliasFilePath, JSON.stringify(alias, null, 2), 'utf-8');
                    e.reply(`成功删除ID为 ${serverId} 的服务器`);
                }
            } catch (error) {
                console.error('删除服务器时发生错误:', error);
                e.reply('删除失败，请稍后再试或联系管理员。');
            }
        } else {
            e.reply('您没有权限删除服务器。');
        }
    }

    // 发送转发消息
    async sendForwardMsg(e, statusList) {
        try {
            // 确保消息数组不是空的
            if (statusList.length === 0) {
                e.reply('没有可转发的服务器状态信息');
                return;
            }

            const msg = await common.makeForwardMsg(e, statusList, '当前群聊服务器列表');

            // 发送转发消息
            await e.reply(msg);
        } catch (error) {
            logger.error('转发消息时发生错误:', error)
        }
    }
}
