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

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }
function randomDelay(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
