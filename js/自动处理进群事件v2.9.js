import plugin from '../../lib/plugins/plugin.js';
import fetch from 'node-fetch';

/**
 * 原作者：千奈千祁
 * 修改者：飞舞、浅巷墨黎、一只哒
 * 
 * 插件发布地址：https://github.com/Dnyo666/Qxml-Yunzai-js
 * 禁止商用、倒卖等获利行为
 */

// 配置项
const config = {
    wenti: `你是不是内鬼？`,
    ans: [`是`, `不是`],
    groupid: [`123456789`, `111111111`],
    exactMatch: false,  // 设置是否启用精确匹配 true = 精确匹配，false = 模糊匹配
    enableLevelCheck: false,  // 是否启用QQ等级检查
    minLevel: 25  // 最低要求等级（仅在enableLevelCheck为true时生效）
};

export class example2 extends plugin {
    constructor() {
        super({
            name: '加群申请处理',
            dsc: '',
            event: 'request.group.add',
            priority: 0,
        });
    }

    async accept(e) {
        if (config.groupid.indexOf(`${e.group_id}`) != -1) {
            let msg = [`收到加群事件：\n用户：${e.user_id}\n留言：${e.comment}`];
            Bot.pickGroup(`${e.group_id}`).sendMsg(msg);

            try {
                // 仅在启用等级检查时执行
                if (config.enableLevelCheck) {
                    // 获取QQ等级
                    const response = await fetch(`https://apis.kit9.cn/api/qq_material/api.php?qq=${e.user_id}`);
                    const data = await response.json();
                    
                    // 检查API响应
                    if (!data || !data.data || !data.data.level) {
                        Bot.pickGroup(`${e.group_id}`).sendMsg(`无法获取用户等级信息，拒绝申请`);
                        return false;
                    }

                    const userLevel = parseInt(data.data.level);
                    
                    // 检查等级是否达标
                    if (userLevel < config.minLevel) {
                        Bot.pickGroup(`${e.group_id}`).sendMsg(`用户等级（${userLevel}）未达到要求（${config.minLevel}），拒绝申请`);
                        return false;
                    }
                }

                // 提取用户的留言
                const userAnswer = e.comment;
                if (!userAnswer || userAnswer.trim() === '') {
                    Bot.pickGroup(`${e.group_id}`).sendMsg(`未检测到答案格式，请重新申请！`);
                    return false;
                }

                // 判断答案
                for (let i in config.ans) {
                    if (
                        (config.exactMatch && userAnswer.trim() == config.ans[i]) || 
                        (!config.exactMatch && userAnswer.includes(config.ans[i]))
                    ) {
                        let successMsg = config.enableLevelCheck ? 
                            `答案判断成功！QQ等级符合要求，已自动处理申请` : 
                            `答案判断成功！已自动处理申请`;
                        Bot.pickGroup(`${e.group_id}`).sendMsg(successMsg);
                        e.approve(true);
                        return false;
                    }
                }

                // 如果所有答案都未匹配，拒绝申请
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