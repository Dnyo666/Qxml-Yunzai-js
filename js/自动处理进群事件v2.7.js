import plugin from '../../lib/plugins/plugin.js';


/**
 * 原作者：千奈千祁
 * 修改者：飞舞、浅巷墨黎、一只哒
 * 
 * 插件发布地址：https://github.com/Dnyo666/Qxml-Yunzai-js
 * 禁止商用、倒卖等获利行为
 */

//在此处输入需要判断的问题 例如const wenti = `你是不是内鬼？`
const wenti = `你是不是内鬼？`
//在此处输入正确答案 例如const ans = `不是`
const ans = [`是`, `不是`]
//在此处输入处理的群号 例如const groupid = `123456789`
const groupid = [`123456789`, `111111111`]

//PS：如果需要处理多个群的加群申请可以复制多个该插件

export class example2 extends plugin {
    constructor() {
        super({
            name: '加群申请处理',
            dsc: '',
            event: 'request.group.add',
            priority: 0,
        })
    }
    async accept(e) {
        // console.info(groupid.indexOf(`${e.group_id}`))
        // console.info(e.group_id)
        if (groupid.indexOf(`${e.group_id}`) != -1) {
            let msg = [`收到加群事件：\n用户：${e.user_id}\n${e.comment}`]
            Bot.pickGroup(`${e.group_id}`).sendMsg(msg)
            const user = e.comment.match(/答案：.*/g)[0]
            // console.info(user)
            for (var i in ans) {
                if (user == `答案：${ans[i]}`) {
                    Bot.pickGroup(`${e.group_id}`).sendMsg(`答案判断成功！已自动处理申请`)
                    e.approve(true)
                    return false;
                }
            }
        }
        return false;
    }
}
