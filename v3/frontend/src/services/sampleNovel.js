/** Demo 模式样例数据 */

export const SAMPLE_NOVEL = {
  id: 0, title: '星穹之约',
  seed_text: '一个普通的程序员在深夜加班时，突然收到来自十年后的自己发送的邮件',
  gender: '男频', genre: '科幻末世', style: '快节奏爽文',
  word_count: 3000, per_chapter_min: 800, per_chapter_max: 2500,
  actual_count: 3215,
  content: `## 第一章 深夜邮件\n\n陈默揉了揉发酸的眼睛，瞥了一眼屏幕右下角的时间——凌晨 2:17。\n\n这已经是他连续加班的第七天了。公司的新项目上线在即，作为后端开发主力，他已经记不清多久没见过下午六点的太阳了。\n\n办公室里只剩下他一个人，日光灯发出轻微的嗡嗡声，空调的出风口吹着干燥的冷风。他端起早已凉透的咖啡灌了一口，苦涩的味道让他皱了皱眉。\n\n就在这时，他的私人邮箱弹出了一封新邮件提醒。\n\n发件人：chenmo2036@timex.com\n主题：来自十年前的你\n\n他点开了邮件。\n\n"你好，十年前的陈默。我是十年后的你。现在是 2036 年 7 月 5 日凌晨 2:17。"\n\n陈默的呼吸变得急促起来。`,
  chapters: JSON.stringify([
    { title: '第一章 深夜邮件', summary: '加班程序员收到来自未来的神秘邮件' },
    { title: '第二章 穿越时空的代码', summary: '未来人用代码证明身份' },
    { title: '第三章 未来的警告', summary: '未来的自己警告灾难即将发生' },
    { title: '第四章 交叉路口', summary: '主人公决定面对过去和未来' },
  ]),
  outline: JSON.stringify({
    chapters: [
      { title: '第一章 深夜邮件', summary: '加班程序员收到来自未来的神秘邮件，通过只有自己知道的秘密验证身份' },
      { title: '第二章 穿越时空的代码', summary: '未来人展示独有算法，证明跨越时空的身份' },
      { title: '第三章 未来的警告', summary: '揭露未来灾难，主角面临挽救命运的选择' },
      { title: '第四章 交叉路口', summary: '主角决定行动，修复bug也修复人生' },
    ],
    elements: { character: '陈默，28岁程序员', time: '2026年', place: '都市', cause: '收到未来邮件', process: '验证身份得知灾难', result: '决定改变未来' },
  }),
  bible: {
    characters: [
      { name: '陈默', role: '主角', description: '28岁程序员，内向但坚韧', traits: '聪明、执着、善良', relationships: '与未来的自己存在时空联系', arc: '从逃避到直面' }
    ],
    locations: [
      { name: '公司办公室', description: '深夜加班的地点，故事起点' }
    ],
    world_rules: [
      '时空邮件仅能在特定条件下发送',
      '改变过去会产生时间悖论',
    ],
    key_items: [
      { name: '未来邮件', description: '来自2036年的神秘邮件' }
    ],
    timeline: [
      { chapter: 1, events: '收到未来邮件' },
      { chapter: 2, events: '验证身份' },
      { chapter: 3, events: '得知灾难' },
      { chapter: 4, events: '决定行动' },
    ],
  },
  illustrations: [
    { chapter_index: 0, prompt: 'A programmer working late at night in a dimly lit office, staring at a glowing email on screen', url: 'https://image.pollinations.ai/prompt/A%20programmer%20working%20late%20at%20night%20in%20a%20dimly%20lit%20office%20staring%20at%20a%20glowing%20email', generated_at: new Date().toISOString() },
  ],
  model_used: 'Demo Mode', model_config: '{}', time_cost: 42.5,
  created_at: new Date().toISOString(),
}

export const SAMPLE_CHAPTERS = [
  { title: '第一章 深夜邮件', index: 0 },
  { title: '第二章 穿越时空的代码', index: 1 },
  { title: '第三章 未来的警告', index: 2 },
  { title: '第四章 交叉路口', index: 3 },
]

export const SAMPLE_ELEMENTS = {
  character: '陈默，28 岁程序员', time: '2026 年，现代', place: '都市、公司、大学图书馆',
  cause: '深夜加班时收到来自未来的邮件', process: '通过代码验证身份，得知未来灾难',
  result: '决定修复 bug，改变未来',
}

export const SAMPLE_OUTLINE_THINKING = [
  { index: 0, title: '第一章 深夜邮件', summary: '加班程序员收到来自未来的神秘邮件，通过只有自己知道的秘密验证身份' },
  { index: 1, title: '第二章 穿越时空的代码', summary: '未来人展示独有算法，证明跨越时空的身份' },
  { index: 2, title: '第三章 未来的警告', summary: '揭露未来灾难，主角面临挽救命运的选择' },
  { index: 3, title: '第四章 交叉路口', summary: '主角决定行动，修复bug也修复人生' },
]

export async function* mockGenerateOpenings() {
  yield { event: 'log', data: { step: 'openings', type: 'info', text: '🎬 正在生成多个开头版本供选择...' } }

  const variants = [
    {
      label: '第三人称有限·标准型', pov: '第三人称有限', pacing: '标准型', tag: '当前设置',
      desc: '使用你选择的视角和节奏',
      text: '陈默盯着屏幕上的报错信息，已经是第三十五遍了。\n\n凌晨两点十七分，办公室的灯管发出微弱的嗡嗡声。他把咖啡杯凑到嘴边，发现早就见底了。第十七杯？还是第十八杯？他已经懒得去数。\n\n新项目的上线日期压得整个后端组喘不过气来。作为主力开发，陈默已经连续加班十二天。他的工位旁放着行军床——这周他已经睡在公司三次了。\n\n手机震动了一下。他瞥了一眼，是母亲发来的消息："儿子，几点下班？妈炖了排骨汤。"\n\n陈默没有回复。他不知道怎么回复。总不能说"妈，我不确定今天能不能下班"吧。他叹了口气，正准备继续调 bug，私人邮箱突然弹出一封新邮件。\n\n发件人：chenmo2036@timex.com\n\n主题：来自十年前的你\n\n他的手指悬在鼠标上方，停顿了两秒。',
    },
    {
      label: '第三人称有限·紧凑型', pov: '第三人称有限', pacing: '紧凑型', tag: '视角',
      desc: '对话多、描述少、推进快，瞬间抓住读者',
      text: '"又来一次？"陈默盯着屏幕，咬紧牙关。\n\n代码报错。第三十五次。\n\n他看了眼时间——凌晨2:17。办公室只剩他一个人。\n\n手机响了。他没接。\n\n又响了。还是没接。\n\n屏幕右下角忽然弹出一封邮件。\n\n发件人：chenmo2036@timex.com\n\n陈默愣住了。那是他自己的邮箱，但域名后面的数字——2036？\n\n他点开邮件，只有一句话："别看窗外。"\n\n他当然看了。\n\n窗外什么都没有。但下一秒，整个写字楼的灯同时熄灭。\n\n黑暗中，他的手机屏幕亮了起来：\n\n"我叫陈默。十年后的你。现在，仔细听我说。"',
    },
    {
      label: '第一人称·标准型', pov: '第一人称', pacing: '标准型', tag: '视角',
      desc: '换用第一人称视角，代入感更强',
      text: '第三十五次报错。\n\n我盯着屏幕上那行刺眼的红色文字，感觉自己的耐心正在被一根根抽走。凌晨两点十七分，办公室的灯管发出微弱的嗡嗡声，像是在嘲笑我的执着。\n\n我把咖啡杯凑到嘴边——空的。第十七杯？还是第十八杯？已经不重要了。新项目的上线日期压得整个后端组喘不过气，而我作为主力开发，已经连续加班十二天。工位旁的行军床这周用过三次了。\n\n手机震动了一下。母亲的消息："儿子，几点下班？妈炖了排骨汤。"\n\n我不知道怎么回复。总不能说"妈，我不确定今天能不能下班"吧。\n\n叹了口气，正准备继续调 bug，私人邮箱突然弹出一封新邮件。\n\n发件人：chenmo2036@timex.com\n\n主题：来自十年前的你\n\n我的手指悬在鼠标上方，停顿了两秒。',
    },
    {
      label: '第一人称·舒缓型', pov: '第一人称', pacing: '舒缓型', tag: '探索',
      desc: '第一人称 + 细腻环境描写，沉浸感最强',
      text: '深夜的写字楼，只有十七层还亮着灯。\n\n我靠在椅背上，闭上眼睛。空调出风口发出细碎的声响，混着电脑主机低沉的运转声，构成了这个夜晚最忠实的背景音。我能闻到打印纸和速溶咖啡混合的气味——那是加班的味道，我已经熟悉到近乎麻木。\n\n桌上的日历还停留在上周。我不记得自己有多久没有好好看过窗外了。浦东的夜景依然璀璨，可那些灯光跟我似乎隔着一层看不见的屏障。\n\n手机亮了。母亲的微信消息静静躺在锁屏上。我甚至没有力气去点开。我害怕那些关心——不是不敢面对，而是怕一旦柔软下来，就再也撑不住了。\n\n就在这时，屏幕右下角弹出一封新邮件提示。\n\n发件人：chenmo2036@timex.com\n\n主题：来自十年前的你',
    },
    {
      label: '上帝视角·紧凑型', pov: '上帝视角', pacing: '紧凑型', tag: '探索',
      desc: '全知视角 + 快节奏，信息量大',
      text: '凌晨两点十七分，整栋写字楼只剩十七层还亮着灯。\n\n陈默盯着屏幕上的报错信息——第三十五遍。他不知道的是，十个小时后，他会感谢这个失眠的夜晚。\n\n手机在桌上震动。他瞥了一眼，没接。母亲的消息静静躺在锁屏上："儿子，几点下班？"他不知道，这碗排骨汤他最终没能喝上。\n\n代码报错。他咬紧牙关。\n\n私人邮箱突然弹出一封新邮件。\n\n发件人：chenmo2036@timex.com\n\n主题：来自十年前的你\n\n陈默的手指悬在鼠标上方。他不知道，从这一刻起，他的命运将彻底改写。',
    },
  ]

  for (const v of variants) {
    yield { event: 'log', data: { step: 'openings', type: 'info', text: `  ✍️ 生成版本：${v.label}` } }
    await delay(600)
    yield { event: 'opening_version', data: v }
    yield { event: 'log', data: { step: 'openings', type: 'success', text: `  ✅ ${v.label} 完成（${v.text.length}字）` } }
    await delay(200)
  }

  yield { event: 'openings_done', data: { openings: variants } }
}

export async function* mockGenerateStream() {
  yield { event: 'log', data: '📝 开始生成 男频·科幻末世·快节奏爽文 小说...' }
  await delay(500)
  yield { event: 'parse', data: '正在分析故事要素...' }
  yield { event: 'log', data: '📝 正在分析故事要素...' }
  await delay(600)
  yield { event: 'parse_done', data: SAMPLE_ELEMENTS }
  yield { event: 'log', data: '✅ 要素分析完成' }

  yield { event: 'log', data: '📐 正在规划章节大纲...' }
  yield { event: 'outline', data: '正在思考章节结构...' }
  yield { event: 'log', data: '📐 规划章节：目标3000字，每章800-2500字，预计4章' }
  await delay(400)
  for (const item of SAMPLE_OUTLINE_THINKING) {
    yield { event: 'log', data: `  📋 第${item.index + 1}章《${item.title}》: ${item.summary.substring(0, 30)}...` }
    yield { event: 'outline_thinking', data: item }
    await delay(200)
  }
  yield { event: 'log', data: '✅ 大纲规划完成：共 4 章' }
  yield { event: 'outline_done', data: JSON.parse(SAMPLE_NOVEL.chapters) }
  yield { event: 'log', data: '✍️ 开始逐章生成...' }

  const chapterContents = SAMPLE_NOVEL.content.split(/(?=## 第)/).filter(Boolean).map(c => c.trim())
  for (let i = 0; i < 4; i++) {
    const ch = JSON.parse(SAMPLE_NOVEL.chapters)[i]
    yield { event: 'log', data: `  📖 第${i+1}章《${ch.title}》开始生成...` }
    yield { event: 'chapter_start', data: { title: ch.title, index: i } }
    if (chapterContents[i]) {
      const paras = chapterContents[i].split('\n\n')
      for (const para of paras) {
        yield { event: 'content', data: para + '\n\n' }
        await delay(randomDelay(100, 250))
      }
    }
    yield { event: 'log', data: `  ✅ 第${i+1}章完成（${(chapterContents[i] || '').length}字）` }
    yield { event: 'chapter_end', data: { title: ch.title, word_count: (chapterContents[i] || '').length } }
  }

  yield { event: 'log', data: '🏷️ 正在生成标题...' }
  yield { event: 'title', data: '正在生成标题...' }
  await delay(400)
  yield { event: 'log', data: `🎉 全部完成！标题《${SAMPLE_NOVEL.title}》，总字数${SAMPLE_NOVEL.actual_count}` }
  yield { event: 'complete', data: { novel_id: 0, title: SAMPLE_NOVEL.title, total_words: SAMPLE_NOVEL.actual_count, time_cost: SAMPLE_NOVEL.time_cost } }
}

export async function* mockGenerateDialogue() {
  const dialogue = `（昏暗的地牢里，铁链碰撞声在潮湿的空气中回荡）

陈默：（靠在墙上，声音沙哑）你来做什么？看我的笑话？

林霜：（站在阴影中，语气平静）来看看你还活着没。

陈默：放心，死不了。倒是你，现在站哪边？

林霜：（沉默片刻）哪边都不站。我只想知道真相。

陈默：真相？（苦笑）真相就是你信任了十年的公司，一直在偷偷收集所有人的脑波数据。我就是发现了这个，才被扔进来的。

林霜：证据呢？

陈默：我工位抽屉夹层里有个U盘。密码是你生日。

林霜：（声音微微发颤）为什么是我生日？

陈默：因为如果有一天我不在了，总得有人知道真相。而你，是唯一一个会找答案的人。`

  const lines = dialogue.split('\n')
  for (const line of lines) {
    await delay(80)
    yield { event: 'dialogue_content', data: { text: line + '\n' } }
  }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }
function randomDelay(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
