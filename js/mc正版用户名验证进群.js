import plugin from '../../lib/plugins/plugin.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 作者：浅巷墨黎
 * 版本号：V3.3.4
 * 鸣谢：；Mojang
 * Gitee：https://gitee.com/Dnyo666
 * Github:https://github.com/Dnyo666
 * 个人博客：blog.qxml.ltd
 * 交流群：303104111
 * 
 * 插件发布地址：https://github.com/Dnyo666/Qxml-Yunzai-js
 * 禁止商用、倒卖等获利行为
 */

const DEFAULT_CONFIG = {
    groupids: [724728510],  //启用插件的群列表
    apiUrl: 'https://uapis.cn/api/mcinfo',  //api地址
    requireComment: true,  //是否开启验证
    allowReuse: false,  //是否允许用户名被重复使用
    rejectReuse: true,  //重复用户名是否直接拒绝（true为拒绝，false为等待管理员处理）
    debug: false,  //是否开启调试
    requestTimeout: 10000,  //api超时时间，默认10000，单位ms
    maxUsernameLength: 16  //mc用户名最长限制
};

// 创建数据目录
const dataDir = path.join(__dirname, '..', '..', 'data', 'mcuserauth');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 已验证用户数据文件路径
const verifiedUsersPath = path.join(dataDir, 'verified_users.json');

// 数据结构：{ [groupId: string]: Array<{qq: string, username: string}> }
let verifiedUsers = {};

// 从文件加载已验证的用户数据
try {
    if (fs.existsSync(verifiedUsersPath)) {
        verifiedUsers = JSON.parse(fs.readFileSync(verifiedUsersPath, 'utf8'));
    }
} catch (error) {
    logger.error(`[MC正版验证] 加载已验证用户数据失败: ${error.message}`);
}

// 保存已验证用户数据到文件
function saveVerifiedUsers() {
    try {
        fs.writeFileSync(verifiedUsersPath, JSON.stringify(verifiedUsers, null, 2));
    } catch (error) {
        logger.error(`[MC正版验证] 保存已验证用户数据失败: ${error.message}`);
    }
}

// 检查用户名是否已在指定群使用
function isUsernameUsed(groupId, username) {
    const groupUsers = verifiedUsers[groupId] || [];
    return groupUsers.some(user => user.username.toLowerCase() === username.toLowerCase());
}

// 添加已验证用户
function addVerifiedUser(groupId, qq, username) {
    if (!verifiedUsers[groupId]) {
        verifiedUsers[groupId] = [];
    }
    verifiedUsers[groupId].push({ qq, username });
    saveVerifiedUsers();
}

// MC用户名格式验证正则
const MC_USERNAME_REGEX = /^[A-Za-z0-9_]{3,26}$/i;

export class MinecraftAuth extends plugin {
    constructor() {
        super({
            name: 'Minecraft正版用户验证',
            dsc: '验证MC正版用户身份',
            event: 'request.group.add',
            priority: 999999,
        });
        this.config = DEFAULT_CONFIG;
    }

    async accept(e) {
        if (!this.config.groupids.includes(e.group_id)) return false;

        try {
            const result = this.validateUsername(e.comment);
            if (!result.valid) {
                return this.handleInvalidUsername(e);
            }

            if (!this.config.allowReuse && isUsernameUsed(e.group_id, result.username)) {
                return this.handleUsedUsername(e, result.username);
            }

            const userData = await this.verifyMinecraftUser(result.username);
            return this.handleVerificationResult(e, userData, result.username);

        } catch (error) {
            return this.handleError(e, error);
        }
    }

    validateUsername(comment) {
        let username = comment?.trim() || '';
        
        // 添加调试日志
        logger.info(`[MC正版验证] 原始输入: ${username}`);
        
        // 如果输入符合MC用户名格式，直接使用
        if (MC_USERNAME_REGEX.test(username)) {
            logger.info(`[MC正版验证] 用户名验证通过: ${username}`);
            return { valid: true, username: username };
        }
        
        // 否则尝试处理问题答案格式
        const match = username.match(/问题：.*\n答案：(.+)$/);
        if (match) {
            username = match[1].trim();
            if (MC_USERNAME_REGEX.test(username)) {
                logger.info(`[MC正版验证] 从问答中提取的用户名验证通过: ${username}`);
                return { valid: true, username: username };
            }
        }
        
        logger.info(`[MC正版验证] 用户名格式不符合要求: ${username}`);
        return { valid: false, username: username };
    }

    async verifyMinecraftUser(username) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout);

        try {
            // 打印请求信息
            logger.info(`[MC正版验证] 正在验证用户名: ${username}`);
            logger.info(`[MC正版验证] 请求URL: ${this.config.apiUrl}?username=${encodeURIComponent(username)}`);
            
            const response = await fetch(
                `${this.config.apiUrl}?username=${encodeURIComponent(username)}`,
                {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                    signal: controller.signal
                }
            );

            const data = await response.json();
            
            // 详细打印 API 响应数据
            logger.info('====================');
            logger.info('[MC正版验证] API响应数据:');
            logger.info(JSON.stringify(data, null, 2));
            logger.info('====================');
            
            return data;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    handleInvalidUsername(e) {
        const username = e.comment?.trim();
        if (!username) {
            this.sendGroupMsg(e.group_id, `请在申请信息中填写MC用户名`);
            e.approve(false);
        } else {
            // 提取真实用户名
            const match = username.match(/问题：.*\n答案：(.+)$/);
            const mcUsername = match ? match[1].trim() : username;
            this.sendGroupMsg(e.group_id, `有mc玩家 ${mcUsername} 申请进群，请管理员核验`);
        }
        return false;
    }

    handleUsedUsername(e, username) {
        if (this.config.rejectReuse) {
            this.sendGroupMsg(e.group_id, `用户名 ${username} 已被使用，不允许重复进群`);
            e.approve(false);
        } else {
            this.sendGroupMsg(e.group_id, `⚠️ 警告：用户名 ${username} 已被使用\n请管理员确认是否允许加群`);
        }
        return false;
    }

    handleVerificationResult(e, data, username) {
        switch (data.code) {
            case 200:
                addVerifiedUser(e.group_id, e.user_id, username);
                this.sendGroupMsg(e.group_id, 
                    `✅ 验证成功！\n用户名: ${data.username}\nUUID: ${data.uuid}\n皮肤链接: ${data.skin}`);
                e.approve(true);
                break;
            
            case 500:
                this.sendGroupMsg(e.group_id, `❌ 验证失败：找不到该正版用户`);
                e.approve(false);
                break;
            
            default:
                this.sendGroupMsg(e.group_id, `❌ 验证失败：API 服务异常 (状态码: ${data.code})`);
                logger.error(`[MC正版验证] API 异常响应，状态码: ${data.code}`);
                e.approve(false);
        }
        return false;
    }

    handleError(e, error) {
        const errorMessage = error.name === 'AbortError' 
            ? '验证请求超时，请稍后重试'
            : '验证过程中出现错误，请稍后重试';
            
        logger.error(`[MC正版验证] ${error.message}`);
        this.sendGroupMsg(e.group_id, errorMessage);
        e.approve(false);
        return false;
    }

    sendGroupMsg(groupId, msg) {
        if (this.config.debug) logger.info(`[MC验证] ${msg}`);
        Bot.pickGroup(groupId).sendMsg(msg);
    }
}
