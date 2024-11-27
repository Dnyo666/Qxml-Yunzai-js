import plugin from '../../lib/plugins/plugin.js'
import fetch from 'node-fetch'

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

export class BaiCiZhanPlugin extends plugin {
    constructor() {
        super({
            name: '百词斩查询',
            dsc: '查询百词斩API获取单词释义和形近词',
            event: 'message',
            priority: 6,
            rule: [
                {
                    reg: /^#?(?:bcz|百词斩|查词)\s*(.*)$/,
                    fnc: 'queryWord'
                }
            ]
        })
    }

    async queryWord(e) {
        const word = (e.msg.match(/^#?(?:bcz|百词斩|查词)\s*(.*)$/) || [])[1]?.trim()
        
        if (!word) {
            await this.reply(e, '请输入要查询的单词')
            return true
        }

        // API备用地址
        const apiURLs = [
            `https://cdn.jsdelivr.net/gh/lyc8503/baicizhan-word-meaning-API/data/words/${word}.json`,
            `https://fastly.jsdelivr.net/gh/lyc8503/baicizhan-word-meaning-API/data/words/${word}.json`,
            `https://gcore.jsdelivr.net/gh/lyc8503/baicizhan-word-meaning-API/data/words/${word}.json`
        ]

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
        }

        for (const apiURL of apiURLs) {
            try {
                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), 10000)

                const response = await fetch(apiURL, { 
                    headers,
                    signal: controller.signal
                })
                clearTimeout(timeout)

                if (!response.ok) continue

                const data = await response.json()
                if (!data) continue

                await this.reply(e, this.formatReply(data))

                try {
                    const audioUrl = `http://baicizhan0.qiniudn.com/word_audios/${word}.mp3`
                    await this.reply(e, {
                        type: 'record',
                        file: audioUrl
                    })
                } catch (audioError) {
                    console.warn(`[百词斩]语音获取失败：${word}`, audioError)
                }

                return true
            } catch (error) {
                console.warn(`[百词斩]API请求失败：${apiURL}`, error)
                continue
            }
        }

        await this.reply(e, '抱歉，查询失败，请稍后重试')
        return true
    }

    formatReply(data) {
        const { word, accent, mean_cn, mean_en, sentence, sentence_trans, cloze_data } = data
        
        let similarWords = [word]
        if (cloze_data?.cloze && cloze_data?.options?.[0]) {
            const optionsArray = cloze_data.options[0].split('|')
            const clozeTemplate = cloze_data.cloze
            const generatedWords = optionsArray
                .map(option => clozeTemplate.replace(/\[.*?\]/g, option))
                .filter(w => w !== word)
            
            similarWords = similarWords.concat(generatedWords)
        }

        return [
            `单词：${word}`,
            `音标：${accent || '暂无'}`,
            `中文释义：${mean_cn || '暂无'}`,
            `英文释义：${mean_en || '暂无'}`,
            `例句：${sentence || '暂无'}`,
            `例句翻译：${sentence_trans || '暂无'}`,
            `形近词：${similarWords.join('、') || '暂无'}`
        ].join('\n')
    }

    async reply(e, content) {
        try {
            if (e.group_id) {
                if (e.group?.sendMsg) {
                    return await e.group.sendMsg(content)
                } else if (e.reply) {
                    return await e.reply(content)
                }
            } else {
                if (e.reply) {
                    return await e.reply(content)
                }
            }
        } catch (err) {
            console.warn('[百词斩]消息发送失败', err)
        }
    }
}

export default BaiCiZhanPlugin
