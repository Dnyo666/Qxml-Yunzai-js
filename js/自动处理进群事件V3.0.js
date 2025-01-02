import plugin from '../../lib/plugins/plugin.js';
import fetch from 'node-fetch';
import fs from 'fs';

/**
 * 原作者：千奈千祁
 * 修改者：飞舞、浅巷墨黎、一只哒
 * V3作者：A1_Panda
 * 
 * 插件发布地址：https://github.com/Dnyo666/Qxml-Yunzai-js
 * 禁止商用、倒卖等获利行为
 */

const defaultConfig = {
    '511802473': {
        wenti: `群主女装过吗`,
        ans: [`有`, `没有`],
        BlackList: ["1516335938", "123123123"],
        exactMatch: false,
        enableLevelCheck: false,
        minLevel: 25
    },
    '231231412': {
        wenti: `这是一个问题吗？`,
        ans: [`是`, `不是`],
        BlackList: ["1516335938", "12312312"],
        exactMatch: false,
        enableLevelCheck: false,
        minLevel: 25
    },
    '568756345': {
        wenti: `这是一个问题吗？`,
        ans: [`是`, `不是`],
        BlackList: ["1516335938", "12312312"],
        exactMatch: false,
        enableLevelCheck: false,
        minLevel: 25
    }
};

// 配置文件路径
const configFilePath = './config/JoinGroup.json';

// 如果配置文件不存在，则创建并写入默认配置
if (!fs.existsSync(configFilePath)) {
    fs.writeFileSync(configFilePath, JSON.stringify(defaultConfig, null, 2));
} else {
    // 读取现有配置文件
    let existingConfig;
    try {
        const fileContent = fs.readFileSync(configFilePath, 'utf-8');
        existingConfig = fileContent ? JSON.parse(fileContent) : defaultConfig;
    } catch (error) {
        console.error('读取配置文件时发生错误:', error);
        existingConfig = defaultConfig;
    }

    // 更新配置文件中的数据
    for (const groupId in defaultConfig) {
        existingConfig[groupId] = { ...defaultConfig[groupId], ...existingConfig[groupId] };
    }

    // 写回更新后的配置文件
    fs.writeFileSync(configFilePath, JSON.stringify(existingConfig, null, 2));
}

// 使用外置配置
let config;
try {
    const fileContent = fs.readFileSync(configFilePath, 'utf-8');
    config = fileContent ? JSON.parse(fileContent) : defaultConfig;
} catch (error) {
    console.error('解析配置文件时发生错误:', error);
    config = defaultConfig;
}

// 确保只添加一次监听器
if (!global.configFileWatcher) {
    global.configFileWatcher = true;
    fs.watchFile(configFilePath, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
            try {
                const updatedFileContent = fs.readFileSync(configFilePath, 'utf-8');
                config = updatedFileContent ? JSON.parse(updatedFileContent) : updatedFileContent;
                console.log('【自动处理进群事件插件】：配置文件已更新');
            } catch (error) {
                console.error('更新配置文件时发生错误:', error);
            }
        }
    });
}

export class GroupRequestHandler extends plugin {
    constructor() {
        super({
            name: '加群申请处理',
            dsc: '',
            event: 'request.group.add',
            priority: 0,
        });
    }

    async accept(e) {
        let groupConfig = config[`${e.group_id}`];
        if (groupConfig) {
            const msg = [`收到加群事件：\n问题：${groupConfig.wenti}\n用户：${e.user_id}\n留言：${e.comment}`];
            Bot.pickGroup(`${e.group_id}`).sendMsg(msg);

            if (groupConfig.BlackList.includes(`${e.user_id}`)) {
                Bot.pickGroup(`${e.group_id}`).sendMsg(`黑名单用户，拒绝申请`);
                e.approve(false);
                return false;
            }

            try {
                if (groupConfig.enableLevelCheck) {
                    const response = await fetch(`https://apis.kit9.cn/api/qq_material/api.php?qq=${e.user_id}`);
                    const data = await response.json();

                    if (!data?.data?.level) {
                        Bot.pickGroup(`${e.group_id}`).sendMsg(`无法获取用户等级信息，拒绝申请`);
                        return false;
                    }

                    const userLevel = parseInt(data.data.level);
                    if (userLevel < groupConfig.minLevel) {
                        Bot.pickGroup(`${e.group_id}`).sendMsg(`用户等级（${userLevel}）未达到要求（${groupConfig.minLevel}），拒绝申请`);
                        return false;
                    }
                }

                const userAnswer = e.comment?.trim();
                if (!userAnswer) {
                    Bot.pickGroup(`${e.group_id}`).sendMsg(`未检测到答案格式，请重新申请！`);
                    return false;
                }

                if (groupConfig.ans.some(ans => groupConfig.exactMatch ? userAnswer === ans : userAnswer.includes(ans))) {
                    const successMsg = groupConfig.enableLevelCheck ? 
                        `答案判断成功！QQ等级符合要求，已自动处理申请` : 
                        `答案判断成功！已自动处理申请`;
                    Bot.pickGroup(`${e.group_id}`).sendMsg(successMsg);
                    e.approve(true);
                    return false;
                }

                Bot.pickGroup(`${e.group_id}`).sendMsg(`答案判断失败！请检查答案是否正确后重新申请。`);
            } catch (error) {
                console.error('处理加群申请时发生错误：', error);
                Bot.pickGroup(`${e.group_id}`).sendMsg(`验证过程发生错误，请稍后重试`);
                return false;
            }
        }
        return false;
    }
}

export class GroupJoinHandler extends plugin {
    constructor() {
        super({
            name: '加群申请处理拉黑',
            desc: '拉黑拉白',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#加群自动同意拉白.*',
                    fnc: 'Whitening'
                },
                {
                    reg: '^#加群自动同意拉黑.*',
                    fnc: 'Blocking'
                }
            ]
        });
    }

    async Blocking(e) {
        await this.modifyBlacklist(e, 'add');
    }

    async Whitening(e) {
        await this.modifyBlacklist(e, 'remove');
    }

    async modifyBlacklist(e, action) {
        try {
            const memberInfo = await Bot.pickMember(e.group_id, e.user_id);
            if (['owner', 'admin'].includes(memberInfo.role) || e.isMaster) {
                if (!e.isGroup) {
                    e.reply('该功能仅限群聊');
                    return;
                }

                let userId;
                const atUser = e.message.filter(item => item.type === 'at')[0];
                if (atUser) {
                    userId = atUser.qq || atUser.data?.qq;
                } else {
                    const qqMatch = e.msg.match(/\d{5,}/);
                    if (qqMatch) {
                        userId = qqMatch[0];
                    }
                }

                if (userId) {
                    const groupConfig = config[`${e.group_id}`];
                    if (groupConfig) {
                        let groupBlackList = groupConfig.BlackList || [];
                        if (action === 'add' && !groupBlackList.includes(`${userId}`)) {
                            groupBlackList.push(`${userId}`);
                            e.reply(`${userId}该用户已成功拉黑`);
                        } else if (action === 'remove' && groupBlackList.includes(`${userId}`)) {
                            groupBlackList = groupBlackList.filter(item => item !== `${userId}`);
                            e.reply(`${userId}该用户已成功拉白`);
                        } else {
                            e.reply(action === 'add' ? '该用户已在黑名单中' : '该用户不在黑名单中');
                        }
                        groupConfig.BlackList = groupBlackList;
                        fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
                    } else {
                        e.reply('未找到该群的配置信息');
                    }
                } else {
                    e.reply(`请@需要${action === 'add' ? '拉黑' : '拉白'}的用户或输入QQ号`);
                }
            } else {
                e.reply('您没有权限拉黑或者拉白。');
            }
        } catch (error) {
            console.error('发生错误:', error);
            e.reply('操作失败，请稍后再试或联系管理员。');
        }
    }
}