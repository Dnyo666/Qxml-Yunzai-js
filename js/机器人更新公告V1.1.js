import plugin from '../../../lib/plugins/plugin.js';
import fs from 'fs';
import path from 'path';

const historyFilePath = path.join('plugins', 'Gi-plugin', 'resources', 'history', 'global_history.json');

export class lishiwenxian extends plugin {
  constructor() {
    super({
      name: '机器人更新公告',
      dsc: '机器人更新公告',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: '^(#|/)?更新(记录|公告)$',
          fnc: '本群历史'
        },
        {
          reg: '^(#|/)?提交(记录|公告)$',
          fnc: '贡献历史1'
        },
        {
          reg: /^[#/]?删除记录\s*([0-9]+)\s*$/,
          fnc: '删除记录',
          Permission: 'master'
        },
        {
          reg: '^(#|/)?(停止|取消)更新$',
          fnc: '取消更新'
        }
      ]
    });
  }
  async 删除记录(e) {
    if (!e.isGroup) {
      e.reply(`该功能仅在群聊中可用`);
      return true;
    }

    const history_number = e.raw_message.match(/^[#/]?删除记录\s*([0-9]+)\s*$/)[1];
    let historyData = this.loadHistory();
    const groupHistory = historyData[e.group_id] || [];
    const index = groupHistory.findIndex(item => item.number === history_number);
    const botname = '枫音酱';

    if (index !== -1) {
      groupHistory.splice(index, 1);
      historyData[e.group_id] = groupHistory;
      this.saveHistory(historyData);
      e.reply(`记录编号${history_number}删除成功！`);
    } else {
      e.reply(`记录编号${history_number}不存在！`);
    }
    return true;
  }

  async 本群历史(e) {
    if (!e.isGroup) {
      e.reply(`该功能仅可在群聊中使用`);
      return true;
    }

    let historyData = this.loadHistory();
    const groupHistory = historyData[e.group_id] || [];

    if (groupHistory.length === 0) {
      e.reply(`暂无机器人更新记录，请机器人发送“#提交记录”以提交更新记录`);
      return true;
    }

    let msgList = [{
      message: `${e.group_name}(${e.group_id})的历史记录`,
      nickname: `Q群管家`
    }];

    for (let record of groupHistory) {
      let history_text = `记录编号:${record.number}\n贡献者:${record.username}(${record.userid})\n机器人名字:(${botname})\n更新时间:${record.date}\n记录正文:\n${record.content.replace(/换行/g, '\n')}`;
      msgList.push({
        message: history_text,
        nickname: `${record.username}(${record.userid})`
      });
    }

    let dec = [`点击查看更新记录`];
    let forwardMsg = await e.group.makeForwardMsg(msgList);
    if (typeof forwardMsg.data === 'object') {
      let detail = forwardMsg.data?.meta?.detail;
      if (detail) {
        detail.news = [{ text: `点击查看更新记录` }];
      }
    } else {
      forwardMsg.data = forwardMsg.data
        .replace(/\n/g, '')
        .replace(/<title color="#777777" size="26">(.+?)<\/title>/g, '___')
        .replace(/___+/, `<title color="#777777" size="26">${dec}</title>`);
    }
    await e.reply(forwardMsg);
    return true;
  }

  async 更新历史1(e) {
    if (!e.isGroup) {
      e.reply(`该功能仅可在群聊中使用`);
      return true;
    }

    e.reply(`更新历史仅支持发送文字，请发送内容\n发送[0]取消更新历史`);
    this.setContext(`更新历史`);
  }

  async 更新历史(e) {
    if (this.e.msg == 0) {
      e.reply(`已取消提交`);
      this.finish(`更新历史`);
      return true;
    }

    let history;
    const currentDate = new Date();
    const formattedDateTime = currentDate.toISOString().replace('T', ' ').split('.')[0];

    let message = this.e.message[0];
    if (message.type != 'text') {
      e.reply(`提交失败，无法提交除文字以外的内容`);
      this.finish(`更新历史`);
      return true;
    }

    let history_ = this.e.msg;
    history_ = history_.replace(/@/g, '');
    history_ = history_.replace(/\n/g, '换行');
    history_ = history_.replace(/；/g, '');
    history_ = history_.replace(/https/g, '');
    history_ = history_.replace(/⁧/g, '');

    let historyData = this.loadHistory();
    let groupHistory = historyData[e.group_id] || [];
    let number = (groupHistory.length > 0) ? groupHistory[groupHistory.length - 1].number + 1 : 100000;

    history = {
      number,
      userid: e.user_id,
      username: e.nickname,
      date: formattedDateTime,
      content: history_
    };

    groupHistory.push(history);
    historyData[e.group_id] = groupHistory;
    this.saveHistory(historyData);

    let msg = `记录编号：${number}\n提交时间：【${formattedDateTime}】\n提交成功！`;
    e.reply(msg);
    this.finish(`贡献历史`);
    return true;
  }

  async 取消更新(e) {
    this.finish(`更新历史`);
    e.reply('更新操作已取消');
    return true;
  }

  loadHistory() {
    if (fs.existsSync(historyFilePath)) {
      const data = fs.readFileSync(historyFilePath, 'utf8');
      return JSON.parse(data);
    }
    return {};
  }

  saveHistory(data) {
    fs.writeFileSync(historyFilePath, JSON.stringify(data, null, 2), 'utf8');
  }
}
