/** 预生成的样例小说数据（用于 GitHub Pages Demo 模式） */

export const SAMPLE_NOVEL = {
  id: 0,
  title: '星穹之约',
  seed_text: '一个普通的程序员在深夜加班时，突然收到来自十年后的自己发送的邮件',
  genre: '科幻',
  style: '简洁直白',
  word_count: 3000,
  actual_count: 3215,
  content: `## 第一章 深夜邮件

陈默揉了揉发酸的眼睛，瞥了一眼屏幕右下角的时间——凌晨 2:17。

这已经是他连续加班的第七天了。公司的新项目上线在即，作为后端开发主力，他已经记不清多久没见过下午六点的太阳了。

办公室里只剩下他一个人，日光灯发出轻微的嗡嗡声，空调的出风口吹着干燥的冷风。他端起早已凉透的咖啡灌了一口，苦涩的味道让他皱了皱眉。

就在这时，他的私人邮箱弹出了一封新邮件提醒。

发件人：chenmo2036@timex.com
主题：来自十年前的你

陈默愣了一下，以为是垃圾邮件。但当他看到发件人名字时，手指停在了删除键上方。那是他自己的名字，准确地说，是他名字的全拼。

他点开了邮件。

"你好，十年前的陈默。确切地说，我是你——十年后的你。现在是 2036 年 7 月 5 日凌晨 2:17，我正坐在同样的位置上给你写这封信。你现在一定以为这是恶作剧吧？但请听我说完下面三件事，因为只有你自己知道这些细节。"

陈默的呼吸变得急促起来。

"第一，你左腿膝盖内侧有一个月牙形的疤，是十二岁那年骑车摔的。第二，你在高中物理课上曾在本子的最后一页写过一句话：'如果时间可以编程，我要把 bug 都修在未来。'第三，你高三暗恋过的那个女孩叫林晚晚，你毕业时把写了三年的情书塞进了图书馆的《时间简史》里，至今没送出去。"

三件事，每一件都像一把钥匙，精准地打开了他记忆深处从未对人说过的角落。

他猛地站起来，椅子向后滑出半米，发出刺耳的摩擦声。

"这不可能。"他喃喃道。

## 第二章 穿越时空的代码

陈默强迫自己冷静下来，重新坐下。他的手指微微颤抖，开始在键盘上敲击回复。

"你怎么证明你是十年后的我？"

消息发出后，他盯着屏幕，心脏狂跳。不到三十秒，回复就来了。

"就知道你会问这个。打开你的终端，输入下面的命令，你会看到一段代码。这个算法是我——或者说我们——在 2030 年独立开发的，现在的你不可能知道。\`\`\`python\nimport hashlib, time\nseed = "chenmo2036" + str(int(time.time()) // 86400)\nprint(hashlib.sha256(seed.encode()).hexdigest()[:16])\n\`\`\`"

陈默将信将疑地执行了代码，终端输出了一串十六进制字符：

"e7a3f1b8c9d04215"

几秒钟后，另一封邮件到了。

"你现在输出的 hash 是 e7a3f1b8c9d04215。看，我知道你会跑这段代码。要不要更精确的证明？打开你的项目代码，看看 /src/core/auth.py 第 87 行。"

陈默打开项目，翻到 auth.py 的 87 行——那里有一行注释，是他三天前写的：

"// TODO: 这个 Token 生成算法有 bug，但别改，三年后会有人靠这个拿奖"

他僵住了。

这是他随手写的一句调侃，从未对任何人提起过。

## 第三章 未来的警告

"你现在相信了。好，时间不多，我告诉你为什么要联系你。"

第三封邮件的语气变得严肃起来。

"你现在正在为 NovaLife 公司开发的那个推荐系统，会在 2027 年 3 月 15 日上线。上线后的第七天，它会出现一个隐藏的逻辑漏洞，导致系统向全平台推送错误的内容——不是什么技术故障，而是一段被植入的破坏性信息。你会在上线前发现它，但你的上级会让你忽略它。请务必——不要忽略。"

"这件事会导致一系列连锁反应，最终在 2030 年引发一个我们称之为'断层'的事件。我要说的最后一件事：那个漏洞不是偶然的——它来自 2040 年。"

陈默的脑海里闪过无数个问题。是谁植入的？为什么要通过他的手？十年后的世界是什么样的？但他刚要打字，邮件系统弹出了一条自动回复：

"连接将在 30 秒后中断。发送这条信息消耗了未来侧大量的能量储备。记住三件事：一、三月份的那个 bug 必须修复。二、去找林晚晚，她比你想象的更重要。三、未来的你相信现在的你。"

邮件窗口暗了下去。

陈默靠在椅背上，盯着天花板的日光灯，直到眼睛被白光刺得发酸。然后他拿起手机，翻开通讯录，在一个尘封已久的名字上停住了。

林晚晚。

## 第四章 交叉路口

第二天早上，陈默没有去公司。

他坐在大学图书馆里，手里拿着那本《时间简史》。翻开书页，在第七章和第八章之间，一个牛皮纸信封安静地躺了七年。

信封已经泛黄，但封口处的双面胶还完好无损。他深吸一口气，拆开了它。

信纸上是他青涩的笔迹，写满了十七岁少年笨拙而真诚的告白。他读着读着笑了，笑着笑着又沉默了。

如果未来是可以改变的，那这封信——他该送出去吗？

手机震动了。是组长老张的消息：

"小陈，昨天的代码我看过了，那个推荐算法有个地方逻辑不太对，你下午改一下。"

他盯着屏幕，指尖悬在键盘上方。

"好的，我下午来看。"他回复道。

然后他又补了一句：

"另外张哥，我下午请个假，有点私事要处理。"

他关上手机，拿起那封信，走出了图书馆。

外面阳光正好。他拦了一辆出租车，报了一个在心里默念了无数次却从未去过的地址。

引擎启动时，他忽然想到——也许代码里的 bug 可以修复，但人生的 bug，只有自己能修。`,

  chapters: JSON.stringify([
    { title: '第一章 深夜邮件', summary: '加班程序员收到来自未来的神秘邮件' },
    { title: '第二章 穿越时空的代码', summary: '未来人用代码证明身份' },
    { title: '第三章 未来的警告', summary: '未来的自己警告一个即将发生的灾难' },
    { title: '第四章 交叉路口', summary: '主人公决定面对过去和未来' },
  ]),
  model_used: 'Demo Mode',
  time_cost: 42.5,
  created_at: new Date().toISOString(),
}

/** 样例小说的章节列表（不包含正文） */
export const SAMPLE_CHAPTERS = [
  { title: '第一章 深夜邮件', index: 0 },
  { title: '第二章 穿越时空的代码', index: 1 },
  { title: '第三章 未来的警告', index: 2 },
  { title: '第四章 交叉路口', index: 3 },
]

/** 样例小说的六要素 */
export const SAMPLE_ELEMENTS = {
  character: '陈默，28 岁程序员',
  time: '2026 年，现代',
  place: '都市、公司、大学图书馆',
  cause: '深夜加班时收到来自未来的邮件',
  process: '通过代码验证身份，得知未来灾难，开始行动',
  result: '决定修复 bug，改变未来',
}

/** Mock 生成时每章的延时（毫秒） */
export const MOCK_DELAYS = {
  parse: 800,
  outline: 600,
  chapter_min: 200,
  chapter_max: 400,
  title: 500,
  complete: 300,
}

/** 模拟生成 SSE 事件流 */
export async function* mockGenerateStream() {
  // parse
  yield { event: 'log', data: '📝 正在分析故事要素...' }
  await delay(MOCK_DELAYS.parse)
  yield { event: 'parse', data: '正在分析故事要素...' }
  yield { event: 'parse_done', data: SAMPLE_ELEMENTS }
  yield { event: 'log', data: '✅ 要素分析完成' }

  // outline
  yield { event: 'log', data: '📐 正在规划章节大纲...' }
  await delay(MOCK_DELAYS.outline)
  yield { event: 'outline', data: '正在规划章节大纲...' }
  yield { event: 'outline_done', data: JSON.parse(SAMPLE_NOVEL.chapters) }
  yield { event: 'log', data: `✅ 大纲规划完成：共 ${JSON.parse(SAMPLE_NOVEL.chapters).length} 章` }

  // chapters
  yield { event: 'log', data: '✍️ 开始逐章生成（共 4 章）...' }

  const chapterContents = SAMPLE_NOVEL.content
    .split(/(?=## 第[一二三四五六七八九十\d]+章)/)
    .filter(Boolean)
    .map(c => c.trim())

  for (let i = 0; i < JSON.parse(SAMPLE_NOVEL.chapters).length; i++) {
    const ch = JSON.parse(SAMPLE_NOVEL.chapters)[i]
    yield { event: 'log', data: `  📖 第 ${i + 1} 章《${ch.title}》开始生成...` }
    yield { event: 'chapter_start', data: { title: ch.title, index: i } }

    if (chapterContents[i]) {
      const paragraphs = chapterContents[i].split('\n\n')
      for (const para of paragraphs) {
        yield { event: 'content', data: para + '\n\n' }
        await delay(randomDelay(MOCK_DELAYS.chapter_min, MOCK_DELAYS.chapter_max))
      }
    }

    const wordCount = chapterContents[i]?.length || 0
    yield { event: 'log', data: `  ✅ 第 ${i + 1} 章完成（${wordCount} 字）` }
    yield { event: 'chapter_end', data: { title: ch.title, word_count: wordCount } }
  }

  // title
  yield { event: 'log', data: '🏷️ 正在生成标题...' }
  await delay(MOCK_DELAYS.title)
  yield { event: 'title', data: '正在生成标题...' }
  yield { event: 'log', data: `🎉 全部完成！总字数 ${SAMPLE_NOVEL.actual_count}，耗时 ${SAMPLE_NOVEL.time_cost}s` }

  // complete
  yield {
    event: 'complete',
    data: {
      novel_id: 0,
      title: SAMPLE_NOVEL.title,
      total_words: SAMPLE_NOVEL.actual_count,
      time_cost: SAMPLE_NOVEL.time_cost,
    },
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
