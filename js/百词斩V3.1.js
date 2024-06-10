import plugin from '../../lib/plugins/plugin.js'
import { segment } from 'icqq'
import fetch from 'node-fetch'

export class BaiCizhanPlugin extends plugin {
    constructor() {
        super({
            name: '百词斩查询',
            dsc: '查询百词斩API获取单词释义和形近词',
            event: 'message',
            priority: 6,
            rule: [
                {
                    reg: /^#bcz|#百词斩|#查词/,
                    fnc: 'queryWord'
                }
            ]
        })
    }

    async queryWord(e) {
        const word = e.msg.replace(/^#bcz|#百词斩|#查词/, '').trim()
        const apiURL = `https://cdn.jsdelivr.net/gh/lyc8503/baicizhan-word-meaning-API/data/words/${word}.json`

        // 设置请求头，模拟浏览器访问
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
        }

        try {
            const response = await fetch(apiURL, { headers })
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            const data = await response.json()

            if (data) {
                const { word, accent, mean_cn, mean_en, sentence, sentence_trans, cloze_data } = data
                const options = cloze_data.options
                const cloze = cloze_data.cloze

                // 生成形近词列表
                const similarWords = options.map(option => cloze.replace(/\[|]/g, option))

                // 将 "find" 添加到形近词列表中
                similarWords.unshift(word)

                const reply = [
                    `单词：${word}`,
                    `音标：${accent}`,
                    `中文释义：${mean_cn}`,
                    `英文释义：${mean_en}`,
                    `例句：${sentence}`,
                    `例句翻译：${sentence_trans}`,
                    `形近词：${similarWords.join('、')}`
                ].join('\n')

                await e.reply(reply, false)  // 不艾特用户

                // 获取并发送语音消息
                e.reply([ segment.record(`http://baicizhan0.qiniudn.com/word_audios/${word}.mp3`) ])

            } else {
                await e.reply('没有找到该单词的信息', false)
            }
        } catch (error) {
            console.error(error)
            await e.reply('查询单词时发生错误', false)
        }

        return true
    }
}
