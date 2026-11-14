// Kult Dex in English and 中文 (Simplified Chinese).
//
// Kult Dex builds its screens from several modules and shows text the desk
// service writes (analyst reads, the CEO's rationale, the floor feed, errors).
// Rather than wrap every string, this file translates what reaches the page:
// every text node and the title, aria-label, placeholder and alt attributes.
// It keeps the English it found, so switching back restores it exactly. Signed
// payloads, hashes and proofs are never changed; only what is shown.
//
// The language comes from ?lang=zh|en (Kult World passes it, since Kult Dex
// runs on its own origin), then the saved choice, then the browser. The 中文/EN
// button in the HUD switches it. Load this file first, as a classic script.
(function () {
  'use strict';
  const KEY = 'kultworld.lang';

  function detect() {
    try {
      const q = new URLSearchParams(location.search).get('lang');
      if (q === 'zh' || q === 'en') { try { localStorage.setItem(KEY, q); } catch {} return q; }
    } catch {}
    try { const s = localStorage.getItem(KEY); if (s === 'zh' || s === 'en') return s; } catch {}
    return /^zh/i.test(navigator.language || '') ? 'zh' : 'en';
  }
  let lang = detect();

  // ── Names ──────────────────────────────────────────────────────────────
  const ROLE = {
    'Chart Reader': '图表分析师', 'Flow Hunter': '资金流猎手', 'Risk Officer': '风控官',
    'Macro & RWA Strategist': '宏观与 RWA 策略师', 'Sentiment Scout': '情绪侦察员',
    'Yield Analyst': '收益分析师', 'Execution Desk': '执行台', 'Desk rules': '交易台规则',
    'CEO (own read)': 'CEO（自己的判断）',
  };
  const role = (s) => ROLE[s] || s;
  const ROLE_RE = '(Chart Reader|Flow Hunter|Risk Officer|Macro & RWA Strategist|Sentiment Scout|Yield Analyst|Execution Desk)';
  const ARCH = { tactician: '战术家', berserker: '狂战士', defender: '守护者', assassin: '刺客', support: '辅助', hybrid: '全能' };
  const arch = (s) => ARCH[String(s).toLowerCase()] || s;
  const DIR = { long: '做多', short: '做空', flat: '不交易', 'no trade': '不交易', rotate: '轮换', rotation: '轮换' };
  const dir = (s) => DIR[String(s).toLowerCase()] || s;
  const HZ = { '4h': '4 小时', '24h': '24 小时', '7d': '7 天' };
  const hz = (s) => HZ[s] || s;
  function dur(s) {
    const m = String(s).trim().match(/^(?:(\d+)d (\d+)h|(\d+)h (\d+)m|(\d+)m (\d+)s|(\d+)s)$/);
    if (!m) return s === 'now' ? '现在' : s;
    if (m[1]) return `${m[1]} 天 ${m[2]} 小时`;
    if (m[3]) return `${m[3]} 小时 ${m[4]} 分`;
    if (m[5]) return `${m[5]} 分 ${m[6]} 秒`;
    return `${m[7]} 秒`;
  }
  const DUR = '((?:\\d+d \\d+h|\\d+h \\d+m|\\d+m \\d+s|\\d+s|now))';
  // Asset names stay in English; their notes are translated.
  const assetName = (s) => String(s)
    .replace(/\(tokenized\)/, '（代币化）').replace(/\(X Layer gas\)/, '（X Layer 燃料）')
    .replace(/\(1 oz\)/, '（1 盎司）').replace(/\(HIP-3 index perp\)/, '（HIP-3 指数永续）');
  // An analyst's "style" line, in lower case as it appears mid-sentence.
  const STYLE = {
    'follows the money, not the headlines': '跟着资金走，不跟着新闻走',
    'counts every bid on the tape': '盘口上的每一笔买单都要数',
    'waits for the volume to confirm': '等成交量来确认',
    'trades the trend until it bends': '顺势交易，直到趋势拐弯',
    'loves a clean breakout': '最爱干净利落的突破',
    'reads momentum like a heartbeat': '像读心跳一样读动量',
    'says no more often than yes': '说「不」比说「好」多',
    'checks the exits before the entry': '先看出口再进场',
    'treats thin books as traps': '把薄盘口当成陷阱',
    'watches Wall Street hours like a hawk': '像鹰一样盯着华尔街交易时段',
    'trades the weekend gap': '交易周末缺口',
    'connects stocks, gold and crypto': '把股票、黄金和加密货币联系起来',
    'fades the crowd when it gets loud': '人群喧哗时反向操作',
    'reads funding like a mood ring': '像读心情戒指一样读资金费率',
    'knows when everyone is long': '知道什么时候所有人都在做多',
    'makes idle cash earn its keep': '让闲置资金赚回自己的饭钱',
    'compares every yield to T-bills': '每个收益都要和美国国债比一比',
    'parks cash where it is safe': '把现金停在安全的地方',
    'hates slippage': '讨厌滑点',
    'sizes to the depth of the book': '按盘口深度决定仓位',
    'gets you in without moving the price': '进场不推动价格',
  };
  const STYLE_LC = new Map(Object.entries(STYLE).map(([k, v]) => [k.toLowerCase(), v]));
  const style = (s) => STYLE_LC.get(String(s).toLowerCase()) || s;
  const READS = {
    'Buying vs selling volume and volume surges': '买卖成交量对比和放量',
    'Trend, breakouts, momentum and volatility': '趋势、突破、动量和波动',
    'Liquidity, volatility, stale data and market hours. Can veto a trade': '流动性、波动、过期数据和交易时段。可以否决交易',
    'US market session, weekend gaps, stock vs crypto divergence, risk regime': '美股时段、周末缺口、股票与加密的背离、风险状态',
    'Crowd positioning from perp funding': '从永续合约资金费率看人群仓位',
    'T-bill fund yield vs stablecoin lending: where idle cash should sit': '国债基金收益与稳定币借贷对比：闲置资金该放哪里',
    'Whether the call is tradeable at its size: slippage and fees': '这个仓位能不能成交：滑点和手续费',
    'T-bill fund yield vs stablecoin lending': '国债基金收益与稳定币借贷对比',
    'Liquidity, volatility, stale data and market hours. Can veto a trade.': '流动性、波动、过期数据和交易时段。可以否决交易。',
  };
  const SESSION = {
    'Weekend: US markets closed': '周末：美股休市',
    'US market open': '美股开盘中',
    'US pre-market': '美股盘前',
    'US after-hours': '美股盘后',
    'US market closed (overnight)': '美股休市（夜间）',
    'Trades 24/7': '全天候交易',
  };

  // ── Exact phrases (case-insensitive fallback covers UPPERCASE copies) ───
  const ZH = {
    ...ROLE, ...READS, ...SESSION,
    'Kult Dex': 'Kult Dex',
    // HUD and navigation
    'Desk': '交易台', 'Level': '等级', 'pts': '分',
    'Desk level: more desks at every level': '交易台等级：每升一级多一个工位',
    'Paper bankroll: never real money': '模拟资金：从来不是真钱',
    'CEO: your AI Arena agent': 'CEO：你的 AI Arena 智能体',
    'Replay the tutorial': '重新播放教程',
    '? Tutorial': '? 教程',
    'Desk credits': '交易台信用点', 'credits': '信用点', 'Credits': '信用点',
    'Floor': '大厅', 'Signals': '信号', 'Markets': '市场', 'Talent': '人才',
    'Leaderboard': '排行榜', 'Leaders': '排行', 'Verify': '验证', 'Signal': '信号',
    'Talent pool': '人才库', 'Leaderboards': '排行榜', 'Verify a signal': '验证信号',
    'Your trading floor: analysts at their desks and your CEO on the chart rug': '你的交易大厅：分析师在工位上，CEO 站在图表地毯上',
    'Desk console': '交易台控制台',
    'Floor feed': '大厅动态',
    'Your analysts will talk here.': '你的分析师会在这里发言。',
    'Opening the trading floor…': '正在打开交易大厅…',
    // Landing and sign-in
    'Run an AI trading desk.': '经营一个 AI 交易台。',
    'Your': '你的', 'AI Arena agent': 'AI Arena 智能体', 'is the CEO': '担任 CEO',
    'Analysts read': '分析师解读', 'crypto, tokenized stocks, gold and T-bills': '加密货币、代币化股票、黄金和美国国债',
    'Every call is': '每个判断都', 'committed on 0G': '在 0G 上提交', 'before the price that grades it': '早于给它打分的价格',
    'Paper money only: real prices settle your record': '只用模拟资金：由真实价格结算你的战绩',
    'Sign in': '登录',
    'Open Kult Dex from Kult World to play with your KULT account.': '从 Kult World 打开 Kult Dex，用你的 KULT 账号游玩。',
    'Developer: paste an AI Arena token': '开发者：粘贴 AI Arena 令牌',
    'AI Arena token': 'AI Arena 令牌',
    'Use': '使用',
    'Signals are produced by AI agents and are not investment advice. Paper trading only.': '信号由 AI 智能体生成，不构成投资建议。仅限模拟交易。',
    'Open your trading desk': '开设你的交易台',
    'Signed in as': '已登录：',
    'Desk name': '交易台名称',
    "3–32 letters, numbers, spaces and ' & . -": "3–32 个字母、数字、空格和 ' & . -",
    'Pick one of your AI Arena agents to run the desk. Its archetype sets its trading style.': '选一个你的 AI Arena 智能体来经营交易台。它的原型决定交易风格。',
    'Sign out': '退出登录',
    'Open the desk': '开设交易台',
    'Opening…': '正在开设…',
    'You need an agent first': '你需要先有一个智能体',
    'Your desk is run by one of your own': '你的交易台由你自己的',
    'AI Arena agents': 'AI Arena 智能体',
    ". We couldn't find one on this account.": ' 之一经营。这个账号下没有找到。',
    'Create an agent in AI Arena': '在 AI Arena 创建智能体',
    'I have one now, check again': '我已经有了，再查一次',
    'Close': '关闭', 'Are you sure?': '确定吗？', 'Cancel': '取消', 'Confirm': '确认',
    'Skip tutorial': '跳过教程', 'Next': '下一步', "Let's go": '出发吧', "Let's trade": '开始交易',
    'Nova, your guide': 'Nova，你的向导', 'NOVA': 'NOVA',
    'Welcome to Kult Dex': '欢迎来到 Kult Dex', 'You run the desk now': '现在交易台归你管了',
    'Demo trader': '演示交易员',
    'Signing in…': '正在登录…',
    "Sign-in isn't available here. Open Kult Dex from Kult World.": '这里无法登录。请从 Kult World 打开 Kult Dex。',
    'Sign-in failed': '登录失败',
    'Session renewed.': '会话已续期。',
    'Your session ended. Sign in again, or reopen Kult Dex from Kult World.': '你的会话已结束。请重新登录，或从 Kult World 重新打开 Kult Dex。',
    'Your Kult session has expired. Sign in again, or reopen Kult Dex from Kult World.': '你的 Kult 会话已过期。请重新登录，或从 Kult World 重新打开 Kult Dex。',
    'Pick your CEO.': '选择你的 CEO。',
    'swing trader, medium conviction': '波段交易者，中等信念',
    'momentum, high turnover': '动量，高换手',
    'capital preservation, likes T-bills': '保本优先，偏爱美国国债',
    'event-driven, short horizons': '事件驱动，短期限',
    'diversified, follows risk': '分散投资，听风控的',
    'your KULT account': '你的 KULT 账号',
    // Tutorial lines
    "Hi, I'm Nova, your KULT guide! Kult Dex is an AI trading desk: your AI Arena agent runs it, analysts read crypto and tokenized stocks, and real prices grade every call. Let's open yours.": '你好，我是 Nova，你的 KULT 向导！Kult Dex 是一个 AI 交易台：你的 AI Arena 智能体负责经营，分析师解读加密货币和代币化股票，每个判断都由真实价格打分。我们来开设你的交易台吧。',
    'Name your desk. Pick something the leaderboard will remember: 3 to 32 letters.': '给你的交易台起个名字。选一个排行榜会记住的名字：3 到 32 个字符。',
    'Now pick your CEO. Its archetype is its trading style: a Berserker trades momentum, a Defender loves T-bills.': '现在选择你的 CEO。它的原型就是它的交易风格：狂战士追动量，守护者偏爱美国国债。',
    "That's it. Open the desk! You start with $10,000 of paper money: nothing real ever moves.": '就这样。开设交易台吧！你一开始有 $10,000 模拟资金：不会动用任何真钱。',
    'Welcome to your trading floor! Analysts work at these desks, the ticker runs live prices, and your CEO makes the call on the chart rug.': '欢迎来到你的交易大厅！分析师在这些工位上工作，行情板滚动实时价格，你的 CEO 在图表地毯上做决定。',
    'Up top: your desk, level and points, the paper bankroll and your credits. Points only come from calls that settled against real prices.': '顶部：你的交易台、等级和分数、模拟资金和信用点。分数只来自按真实价格结算的判断。',
    'This is your console. Scan the board and your analysts read the market their own way; the CEO drafts a call you can edit, then lock.': '这是你的控制台。扫描行情，分析师会用各自的方式解读市场；CEO 起草一个判断，你可以修改，然后锁定。',
    'The floor feed: every read, every lock, every settlement.': '大厅动态：每一次解读、每一次锁定、每一次结算。',
    'First, staff up. Open Talent.': '首先，招兵买马。打开「人才」。',
    'A Chart Reader, a Flow Hunter and a Risk Officer are a solid first desk. The Risk Officer can veto a bad trade. Each has a weekly salary.': '一名图表分析师、一名资金流猎手和一名风控官，就是一个扎实的起步阵容。风控官可以否决糟糕的交易。每人都有周薪。',
    'Now open Markets.': '现在打开「市场」。',
    'Live prices: crypto majors, tokenized US stocks that trade around the clock, gold, and the T-bill yield your desk can rotate into.': '实时价格：主流加密货币、全天候交易的代币化美股、黄金，以及交易台可以轮换进去的美国国债收益。',
    "Signals keeps every call. Once locked, a call is hashed and anchored on 0G: it can't be edited or deleted, losers included.": '「信号」保存每个判断。一旦锁定，判断就会被哈希并锚定在 0G 上：无法修改或删除，亏损的也一样。',
    'Verify proves any call: the hash, the Merkle proof, the 0G anchor and the time it was made, before its entry price.': '「验证」能证明任何判断：哈希、默克尔证明、0G 锚定，以及它早于入场价的提交时间。',
    'Leaders: weekly, all-time and an RWA board. Only settled calls count, and calibration matters.': '「排行」：周榜、总榜和 RWA 榜。只计算已结算的判断，校准度也很重要。',
    'Desk: your mandate, the auto-desk switch, your CEO and the ledger.': '「交易台」：你的交易授权、自动交易开关、你的 CEO 和账本。',
    'Back to the floor.': '回到大厅。',
    "You're set. Hire a desk, scan the board and lock your first call. Good trading, boss!": '准备就绪。雇好团队，扫描行情，锁定你的第一个判断。祝交易顺利，老板！',
    'Tutorial complete. Welcome to Kult Dex!': '教程完成。欢迎来到 Kult Dex！',
    // Console
    'Your desk': '你的交易台',
    'No live calls': '没有进行中的判断',
    'Analysts are ready': '分析师已就绪',
    'Analysts free in': '分析师空闲倒计时',
    'Asset to scan': '要扫描的资产',
    'Scan the whole mandate': '扫描整个授权范围',
    'Scan': '扫描',
    'Auto-desk is on': '自动交易已开启',
    "Welcome to the floor! Let's hire some analysts.": '欢迎来到大厅！我们去雇几个分析师吧。',
    "Morning, team. What's the tape saying?": '早上好，团队。盘面怎么说？',
    "Empty desks… let's find some analysts.": '工位空着呢… 我们去找些分析师吧。',
    'Draft saved.': '草稿已保存。',
    'Committed. No take-backs now.': '已提交。不能反悔了。',
    'Locked and committed.': '已锁定并提交。',
    'Discard this draft?': '丢弃这份草稿？',
    "Drafts are never scored. Your analysts can scan again once they're free.": '草稿永远不计分。分析师空闲后可以再次扫描。',
    'Discard': '丢弃',
    "Team, scan the board. What's moving?": '团队，扫描行情。什么在动？',
    "No analysts yet. I'll read the chart myself.": '还没有分析师。我自己看图。',
    'Your analysts are presenting…': '分析师正在汇报…',
    'Skip to the call': '直接看判断',
    'Draft ready: edit it, then lock it.': '草稿已就绪：修改后锁定。',
    'Mandate saved: it applies to new calls.': '交易授权已保存：适用于新的判断。',
    "Auto-desk on: I'll scan and lock calls on my own, inside the mandate.": '自动交易已开启：我会在授权范围内自己扫描并锁定判断。',
    "Auto-desk off: I'll wait for you.": '自动交易已关闭：我会等你。',
    'Auto-desk on: I will scan and lock calls on my own, inside the mandate.': '自动交易已开启：我会在授权范围内自己扫描并锁定判断。',
    'Auto-desk off: I will wait for you.': '自动交易已关闭：我会等你。',
    'New boss on the floor!': '大厅来了新老板！',
    "Their desk is freed for someone new. There's no refund of the hiring cost.": '他们的工位会空出来给新人。雇佣费用不退。',
    'Let go': '解雇',
    'Back to work': '回去工作',
    'Something went wrong': '出了点问题',
    // Signals
    'Your calls': '你的判断', 'Show': '显示',
    'Live': '进行中', 'Drafts': '草稿', 'Settled': '已结算', 'Void': '作废',
    "Locked calls are committed: they can't be edited or deleted, and every one counts, losers included.": '锁定的判断已经提交：无法修改或删除，每一个都计入战绩，亏损的也一样。',
    'No live calls. Scan the board from the floor.': '没有进行中的判断。到大厅扫描行情吧。',
    'No drafts.': '没有草稿。',
    'Nothing settled yet. A call settles at its target, its stop or its horizon.': '还没有已结算的判断。判断会在触及止盈、止损或到期时结算。',
    'No void calls.': '没有作废的判断。',
    'Draft: review and lock': '草稿：检查后锁定',
    'Entry': '入场', 'Waiting for the entry window': '等待入场窗口', 'Open': '打开',
    'Loading the call…': '正在加载判断…',
    'Quote at scan': '扫描时报价',
    'Analyst reads': '分析师解读',
    "CEO's call": 'CEO 的判断', 'Worded by': '撰写者',
    "Decided and worded by the desk's own code (deterministic)": '由交易台自己的代码决定并撰写（确定性的）',
    'Chart': '图表', 'Timeframe': '时间周期',
    'Your call': '你的判断', 'edited draft': '已修改的草稿', "CEO's draft": 'CEO 的草稿',
    "The CEO's draft · not committed yet": 'CEO 的草稿 · 尚未提交',
    'Direction': '方向', 'Long': '做多', 'Short': '做空', 'No trade': '不交易',
    'A rotation moves the risk budget out of this asset into tokenized T-bills for 7 days. It settles at the horizon: T-bill carry minus what the asset did.': '轮换会把风险预算从这个资产转入代币化美国国债 7 天。到期时结算：国债收益减去这个资产的表现。',
    'Horizon': '期限', 'Target': '止盈', 'Stop': '止损', 'Review': '检查',
    'No trade is a real call: it is committed and counts as 0R. Staying flat when nothing stands out is often the best signal.': '不交易也是真正的判断：它会被提交，计为 0R。没有突出机会时保持空仓，往往就是最好的信号。',
    'Save changes': '保存修改', 'No changes': '没有修改', 'Lock & commit': '锁定并提交',
    'Lock hashes the whole call (asset, direction, sizes, every read) into a leaf and chains it to your last one.': '锁定会把整个判断（资产、方向、仓位、每条解读）哈希成一个叶子，并链接到你的上一个判断。',
    'Within a minute the leaf goes into a Merkle batch anchored on 0G Chain.': '一分钟内，叶子会进入一个锚定在 0G 链上的默克尔批次。',
    'Entry is the average price over 5 minutes, starting 5 minutes after you lock: after the commitment.': '入场价是锁定 5 分钟后开始的 5 分钟均价：在提交之后。',
    'It settles at its target, its stop or its horizon against real prices. Drafts are never scored.': '它会按真实价格在止盈、止损或到期时结算。草稿永远不计分。',
    "Locking commits the call: it is hashed, chained to your last call and anchored on 0G. It can't be edited or deleted, and it counts on your record whatever happens.": '锁定即提交判断：它会被哈希、链接到你的上一个判断并锚定在 0G 上。无法修改或删除，无论结果如何都计入你的战绩。',
    'Life of the call': '判断的一生', 'Committed': '已提交',
    "· the desk's first call": '· 交易台的第一个判断',
    'Waiting for the next batch': '等待下一个批次',
    'Merkle root anchored on 0G Chain (see Verify)': '默克尔根已锚定在 0G 链上（见「验证」）',
    'Batches run every minute': '每分钟运行一个批次',
    'No entry: staying flat': '不入场：保持空仓',
    'Entry window': '入场窗口',
    'Verify this call': '验证这个判断',
    'Perp funding': '永续资金费率',
    'HIT THE TARGET': '触及止盈', 'STOPPED OUT': '止损出场', 'AT THE HORIZON': '到期结算',
    'Draft': '草稿', 'Committed ': '已提交',
    'LONG': '做多', 'SHORT': '做空', 'NO TRADE': '不交易', 'ROTATE': '轮换', 'FLAT': '空仓',
    'DRAFT': '草稿', 'LOCKED': '已锁定', 'OPEN': '持仓中', 'SETTLED': '已结算', 'VOID': '作废', 'VETO': '否决',
    'RWA': 'RWA', 'QUOTE': '报价', 'TGT': '止盈', 'STOP': '止损', 'EXIT': '出场',
    'Execution': '执行', 'Settlement': '结算', 'Payday': '发薪日', 'System': '系统',
    // Markets
    'Live prices': '实时价格', 'Asset class': '资产类别',
    'All': '全部', 'Crypto': '加密货币', 'Tokenized stocks': '代币化股票',
    'Gold, index & T-bills': '黄金、指数与美国国债', 'Memes': '迷因币',
    'Tokenized T-bills': '代币化美国国债', 'Ondo USDY, a year': 'Ondo USDY，年化',
    'Stablecoin lending': '稳定币借贷', 'Aave v3 USDT, a year': 'Aave v3 USDT，年化',
    'US stock market': '美国股市',
    'tokenized stocks trade 24/7 on the reference perp': '代币化股票在参考永续合约上全天候交易',
    'Loading prices…': '正在加载价格…', 'Asset': '资产', 'Price': '价格', 'US open': '美股开盘',
    'weekend': '周末', 'yield': '收益', 'loading…': '加载中…',
    'Crypto majors': '主流加密货币', 'Memecoins (high risk)': '迷因币（高风险）',
    'Tokenized index': '代币化指数', 'Tokenized indexes': '代币化指数', 'Tokenized gold': '代币化黄金',
    'T-bills (rotation leg)': '美国国债（轮换腿）',
    'Prices: demo. Tokenized stocks use Hyperliquid\'s 24/7 HIP-3 perps as the reference price. Yields: demo figures.': '价格：演示数据。代币化股票以 Hyperliquid 的全天候 HIP-3 永续合约作为参考价。收益：演示数据。',
    'Signals are produced by AI agents and are not investment advice. Past performance, even verified, does not predict future results. Kult Dex is paper trading: no real money moves.': '信号由 AI 智能体生成，不构成投资建议。过往表现即使经过验证，也不代表未来结果。Kult Dex 是模拟交易：不涉及任何真钱。',
    'Ondo US Dollar Yield': 'Ondo 美元收益',
    // Talent
    'Weekly pool': '本周人才库', 'Empty desk': '空工位', 'Candidates': '候选人',
    'Loading candidates…': '正在加载候选人…',
    "You've hired everyone in this week's pool. A new pool arrives Monday.": '你已经雇下本周人才库里的所有人。新的人才库周一到来。',
    'Desks full': '工位已满', 'Not enough credits': '信用点不足', 'Hire': '雇佣', '/ week': '/ 周',
    'Reads': '负责解读', 'Salary': '薪水', 'Hired': '入职', 'Top skill: 5 stars': '最高技能：5 星',
    'Analysts earn XP when they back a call that wins; gatekeepers (risk, execution, yield) earn a little on every settled call. Higher skill weighs their read more.': '分析师支持的判断获胜时会获得经验；把关者（风控、执行、收益）每个判断结算时都会获得少量经验。技能越高，解读的权重越大。',
    'Hiring…': '正在雇佣…',
    // Leaders
    'Points': '分数', 'Hit rate': '胜率', 'Avg R': '平均 R', 'Brier': 'Brier',
    'This week': '本周', 'Real-world assets': '现实世界资产', 'Since launch': '上线以来',
    'Weekly': '周榜', 'All time': '总榜', 'Your rank': '你的排名', 'Your points': '你的分数',
    'Desks ranked': '上榜交易台',
    'Only settled calls count, losers and no-trades included. Points = 100 × average R × √settled, minus a drawdown penalty, plus a calibration bonus (Brier). Capped at 500 a week.': '只计算已结算的判断，亏损和不交易也算在内。分数 = 100 × 平均 R × √已结算数，减去回撤惩罚，加上校准奖励（Brier）。每周上限 500。',
    'Ranked': '已上榜', 'Loading…': '加载中…',
    'No desk has enough settled calls yet. Be the first.': '还没有交易台有足够的已结算判断。来做第一个吧。',
    'Not ranked yet': '尚未上榜', '(you)': '（你）',
    // Verify
    'Proof': '证明', 'Verify a call': '验证判断', 'Signal id': '信号 ID',
    'Every locked call is a leaf in a Merkle tree whose root goes on 0G Chain. Check any call here, or with the steps below and no trust in Kult.': '每个锁定的判断都是默克尔树上的一个叶子，树根上 0G 链。可以在这里检查任何判断，或按下面的步骤自行检查，无需信任 Kult。',
    'Your recent calls': '你最近的判断',
    'The call is unchanged': '判断未被改动',
    'keccak256 of its canonical JSON =': '其规范 JSON 的 keccak256 =',
    'Waiting for its batch': '等待它的批次',
    'Merkle proof folds into root': '默克尔证明折叠为根',
    'ANCHORED': '已锚定',
    'The root is on 0G Chain': '根在 0G 链上',
    'Not anchored on-chain in this environment': '在此环境中未上链锚定',
    'Batch kept LOCAL: its root and proofs verify, but nothing outside Kult vouches for its time yet.': '批次保存在本地：它的根和证明可以验证，但还没有 Kult 以外的任何东西为它的时间背书。',
    'Committed before its entry price': '在入场价之前提交',
    'Known once the batch is anchored': '批次锚定后可知',
    "Chained to the desk's other calls": '与交易台的其他判断相链接',
    "the desk's first call": '交易台的第一个判断',
    'latest call': '最新判断',
    'The committed call (payload)': '已提交的判断（数据）',
    'Merkle proof': '默克尔证明',
    'Check it yourself': '自己检查',
    // Desk page
    'from $10,000': '起始 $10,000',
    'Paper bankroll': '模拟资金', 'Average R': '平均 R', 'Max drawdown': '最大回撤',
    'Calibration (Brier)': '校准度（Brier）',
    'lower is better; 0.25 = a coin flip': '越低越好；0.25 = 抛硬币',
    'Next level': '下一级', 'Top level: all 7 desks': '最高等级：全部 7 个工位',
    'Auto-desk': '自动交易', 'off': '关', 'on': '开',
    'Turn off': '关闭', 'Turn on': '开启',
    'Mandate': '交易授权', 'applies to new calls': '适用于新的判断',
    'Universe': '资产范围', 'Horizons': '期限',
    '4 hours': '4 小时', '24 hours': '24 小时', '7 days': '7 天',
    'Max risk per call': '每个判断的最大风险', 'Max open calls': '最多同时持仓判断',
    'Allow short calls': '允许做空', 'Save mandate': '保存交易授权',
    'your AI Arena agent': '你的 AI Arena 智能体',
    'Change CEO': '更换 CEO', 'Make CEO': '任命为 CEO',
    'Ledger': '账本', 'last 100 entries': '最近 100 条', 'No credit activity yet.': '还没有信用点记录。',
    'When': '时间', 'What': '事项', 'Balance': '余额',
    'Opening grant': '开张拨款', 'Hired an analyst': '雇佣分析师', 'Weekly salaries': '周薪',
    'Winning call': '获胜判断', 'Let an analyst go': '解雇分析师', 'Level up': '升级',
    'Today': '今天', 'Tomorrow': '明天', 'Yesterday': '昨天', 'just now': '刚刚',
    // 3D screen (office3d / world)
    'DESK SCAN': '交易台扫描', 'COMMITTED ON 0G': '已在 0G 提交', "CEO'S CALL": 'CEO 的判断',
    'KULT DEX': 'KULT DEX', 'READY TO SCAN': '准备扫描', 'READY TO SCAN_': '准备扫描_',
    'CONNECTING TO MARKETS': '正在连接市场', 'CONNECTING TO MARKETS_': '正在连接市场_',
    'READING': '解读中', 'SCANNING THE BOARD': '正在扫描行情', 'BRIEFING THE DESK': '正在向团队简报',
    'OUT OF THE ASSET': '移出该资产', 'INTO T-BILLS FOR 7 DAYS': '转入美国国债 7 天',
    'REVIEW, THEN LOCK': '检查后锁定', 'NOTHING CLEARS THE BAR': '没有达到门槛',
    'STAYING FLAT IS A CALL TOO': '空仓也是判断', 'BATCH → 0G CHAIN': '批次 → 0G 链',
    '+ HIRE': '+ 雇佣', 'T-BILL': '国债', 'APY': '年化',
    'FLOWS': '资金流', 'CHARTS': '图表', 'RISK': '风控', 'MACRO': '宏观', 'FUNDING': '资金费率',
    'YIELD': '收益', 'ROUTING': '路由', 'CHART': '图表', 'EXECUTION': '执行', 'FLOW': '资金流',
    'CEO: CHART': 'CEO：图表',
    // Analyst reads (engine)
    'No perp market to read positioning from.': '没有永续合约市场可以读取仓位。',
    'No T-bill yield available right now.': '目前没有美国国债收益数据。',
    'Crypto is in a risk-off week: gold is the hedge.': '加密货币处于避险周：黄金是对冲。',
    'Crypto is calm: little need for the gold hedge.': '加密货币很平静：不太需要黄金对冲。',
    'Risk-off week across crypto: careful with equities beta.': '加密货币整体处于避险周：小心股票贝塔。',
    'No macro stress showing.': '没有显示宏观压力。',
    'Nothing stands out.': '没有突出的机会。',
    'Fading it slightly.': '略微反向操作。',
    'a surge': '放量',
    'price data is fresh': '价格数据新鲜', 'not permissioned': '无需许可',
    // Server errors
    'A rotation has no direction to change': '轮换没有可以修改的方向',
    'Pick at least one asset class to trade (T-bills are only the cash leg)': '至少选择一个要交易的资产类别（美国国债只是现金腿）',
    'Stop must be 0.3% to 20%': '止损必须在 0.3% 到 20% 之间',
    'Target must be 0.3% to 50%': '止盈必须在 0.3% 到 50% 之间',
    'That horizon is outside your mandate': '该期限不在你的交易授权内',
    'Unknown or untradeable asset': '未知或不可交易的资产',
    'Your mandate is long only': '你的交易授权只允许做多',
    'Sign in to Kult first': '请先登录 Kult',
    'That agent belongs to another player': '这个智能体属于另一名玩家',
    'Agent not found': '找不到智能体', 'Analyst not found': '找不到分析师', 'Batch not found': '找不到批次',
    'No committed signal with that id': '没有这个 ID 的已提交信号',
    'Open your desk first': '请先开设交易台', 'Signal not found': '找不到信号', 'Unknown asset': '未知资产',
    'Already hired this week': '本周已经雇过了', 'Already locked': '已经锁定',
    'Another call was just locked. Try again': '刚刚锁定了另一个判断，请重试',
    'Committed signals cannot be deleted: that is the point': '已提交的信号无法删除：这正是关键所在',
    'Every asset in your mandate already has a live call': '授权范围内的每个资产都已有进行中的判断',
    'Every desk is taken. Level up or let someone go': '所有工位都满了。升级或解雇一个人',
    'Lock or discard a draft first': '请先锁定或丢弃草稿',
    'Only a draft can be edited; locked calls are committed': '只有草稿可以修改；锁定的判断已经提交',
    'That agent is retired. Restore it in AI Arena first': '这个智能体已退役。请先在 AI Arena 中恢复它',
    'You already run a desk': '你已经在经营一个交易台',
    'This desk is halted': '这个交易台已暂停',
    'Your analysts are still on the last scan': '分析师还在处理上一次扫描',
    'No prices reachable for your mandate right now. Try again in a minute': '目前无法获取你授权范围内的价格。请一分钟后再试',
    'Request failed': '请求失败',
    'SENTIMENT': '情绪', 'No bars': '没有 K 线数据',
    '‹ Signals': '‹ 信号', 'inputs': '输入数据', 'demo': '演示',
    'BULLISH': '看涨', 'BEARISH': '看跌', 'NEUTRAL': '中性',
    'The chart and the flows agree (demo tape).': '图表和资金流一致（演示行情）。',
    'No macro stress in the demo.': '演示中没有宏观压力。',
    'Funding is balanced on the demo tape.': '演示行情上资金费率均衡。',
    'Cleared: liquidity, fresh data, enough history (demo checks).': '通过：流动性、数据新鲜、历史足够（演示检查）。',
    "You're offline or Kult Dex can't be reached.": '你已离线，或无法连接 Kult Dex。',
    "AI Arena can't be reached right now.": '目前无法连接 AI Arena。',
    'AI Arena could not verify your login.': 'AI Arena 无法验证你的登录。',
    'Run an AI trading desk. Your AI Arena agent is the CEO, analysts read crypto and tokenized stocks, every call is committed on 0G before the price that grades it.': '经营一个 AI 交易台。你的 AI Arena 智能体担任 CEO，分析师解读加密货币和代币化股票，每个判断都在给它打分的价格之前提交到 0G。',
  };
  const LC = new Map();
  for (const k of Object.keys(ZH)) if (!LC.has(k.toLowerCase())) LC.set(k.toLowerCase(), ZH[k]);

  const sub = (s) => tr(s) ?? s;
  const pct = '([+\\-−]?[\\d.,]+%)';
  const num = '([\\d,]+)';
  const R = (s, f) => [new RegExp(s), f];
  const ARCH_RE = '(tactician|berserker|defender|assassin|support|hybrid)';
  const CHECK = (l) => {
    let m;
    if ((m = l.match(/^liquidity (\$[\d.]+M) (≥|below) (\$[\d.]+M)$/))) return `流动性 ${m[1]} ${m[2] === '≥' ? '≥' : '低于'} ${m[3]}`;
    if ((m = l.match(/^history (≥|below) (\d+)h$/))) return `历史数据 ${m[1] === '≥' ? '≥' : '少于'} ${m[2]} 小时`;
    if ((m = l.match(/^hourly range ([\d.]+%) (≤|above) ([\d.]+%)$/))) return `小时波幅 ${m[1]} ${m[2] === '≤' ? '≤' : '高于'} ${m[3]}`;
    return sub(l);
  };

  const PAT = [
    // Time and counts
    R('^' + DUR + '$', (_, d) => dur(d)),
    R('^Ends in ' + DUR + '$', (_, d) => `${dur(d)}后到期`),
    R('^(\\d+)m ago$', (_, a) => `${a} 分钟前`), R('^(\\d+)h ago$', (_, a) => `${a} 小时前`), R('^(\\d+)d ago$', (_, a) => `${a} 天前`),
    R('^(\\d+) analysts? · (\\d+) desks?( · auto)?$', (_, a, b, au) => `${a} 名分析师 · ${b} 个工位${au ? ' · 自动' : ''}`),
    R('^CEO (.+) · (\\w+)$', (_, n, p) => `CEO ${n} · ${p}`),
    R('^\\$' + num + ' paper$', (_, a) => `$${a} 模拟资金`),
    R('^(\\d+) live calls?$', (_, a) => `${a} 个进行中的判断`),
    R('^· (\\d+)/(\\d+) locked today$', (_, a, b) => `· 今日已锁定 ${a}/${b}`),
    R('^· next auto-scan in$', () => '· 下次自动扫描倒计时'),
    R('^Desks (\\d+)/(\\d+)$', (_, a, b) => `工位 ${a}/${b}`),
    R('^' + num + ' credits$', (_, a) => `${a} 信用点`),
    R('^' + num + ' credits/week · payday in ' + DUR + '$', (_, a, d) => `每周 ${a} 信用点 · ${dur(d)}后发薪`),
    R('^(.+) · new pool in ' + DUR + '$', (_, w, d) => `${w === 'demo week' ? '演示周' : w} · ${dur(d)}后刷新人才库`),
    R('^(\\d) of 5 stars$', (_, a) => `${a} / 5 星`),
    R('^(Live|Drafts|Settled|Void) (\\d+)$', (_, w, n) => `${sub(w)} ${n}`),
    R('^(\\d+) / (\\d+) points · \\+1 desk$', (_, a, b) => `${a} / ${b} 分 · +1 工位`),
    R('^(\\d+) more settled to rank$', (_, a) => `还需 ${a} 个已结算判断才能上榜`),
    R('^(\\d+)\\+ settled calls to rank$', (_, a) => `${a}+ 个已结算判断才能上榜`),
    R('^(\\d+)\\+ settled calls$', (_, a) => `${a}+ 个已结算判断`),
    R('^fewer than (\\d+) settled calls$', (_, a) => `已结算判断少于 ${a} 个`),
    R('^(\\d+) reads · numbers from code, never a model$', (_, a) => `${a} 条解读 · 数字来自代码，而不是模型`),
    R('^score (-?[\\d.]+) · weight ([\\d.]+)$', (_, a, b) => `得分 ${a} · 权重 ${b}`),
    R('^Perp funding ' + pct + ' a year · open interest (\\S+) · 24h volume (\\S+)$', (_, f, oi, v) => `永续资金费率年化 ${f} · 未平仓量 ${oi} · 24 小时成交量 ${v}`),
    R('^Request failed \\((\\d+)\\)$', (_, c) => `请求失败（${c}）`),
    R('^Risk · max ([\\d.]+)% of the paper bankroll$', (_, a) => `风险 · 最多占模拟资金的 ${a}%`),
    R('^In batch #(\\d+)$', (_, a) => `在第 ${a} 批次中`),
    R('^It is in batch #(\\d+)$', (_, a) => `它在第 ${a} 批次中`),
    R('^5-minute average from (.+)$', (_, t) => `从 ${t} 开始的 5 分钟均价`),
    R('^Horizon ends in$', () => '到期倒计时'),
    R('^(.+) · entry from (.+)$', (_, a, b) => `${a} · 入场自 ${b}`),
    R('^(.+) after costs(?: · \\+(\\d+) credits)?( · flagged: feeds disagreed)?$', (_, a, c, f) => `扣除成本后 ${a}${c ? ` · +${c} 信用点` : ''}${f ? ' · 已标记：数据源不一致' : ''}`),
    R('^(.+) · · · (.+)$', (_, a, b) => `${sub(a)} · · · ${sub(b)}`),
    R('^Your CEO scans and locks calls on its own every (\\d+) hours, inside the mandate\\. It only commits trades, never no-trades\\.$', (_, h) => `你的 CEO 每 ${h} 小时在授权范围内自己扫描并锁定判断。它只提交交易，从不提交「不交易」。`),
    R('^Payday is ' + num + ' credits but you have ' + num + '\\. Analysts you can\'t pay will quit\\.$', (_, a, b) => `发薪日要付 ${a} 信用点，但你只有 ${b}。付不起薪水的分析师会离职。`),
    R('^Payday needs ' + num + ' credits and you have ' + num + '\\. Win calls before Monday\\.$', (_, a, b) => `发薪日需要 ${a} 信用点，你有 ${b}。周一前赢几个判断吧。`),
    R('^Without a (.+?), (your CEO reads the chart alone at 1★|your desk misses that read)(; only the basic desk rules guard against bad trades)?\\.$', (_, roles, what, rules) =>
      `没有${roles.split(/, | or /).map(role).join('、')}，${what.startsWith('your CEO') ? '你的 CEO 只能以 1★ 独自看图' : '你的交易台会缺少这项解读'}${rules ? '；只有基础的交易台规则防范糟糕的交易' : ''}。`),
    R('^All (\\d+) desks are taken\\. Let someone go or level up for another desk(?: \\(next level at ' + num + ' points\\))?\\.$', (_, a, p) => `全部 ${a} 个工位都满了。解雇一个人，或升级获得新工位${p ? `（${p} 分升到下一级）` : ''}。`),
    R('^Welcome to (.+)! \\$' + num + ' of paper money and ' + num + ' credits\\. Hire analysts, then scan the board\\.$', (_, d, m, c) => `欢迎来到 ${d}！$${m} 模拟资金和 ${c} 信用点。先雇分析师，再扫描行情。`),
    R('^Welcome back to (.+)\\.$', (_, d) => `欢迎回到 ${d}。`),
    R('^Level (\\d+)! A new desk is ready: (\\d+) desks now\\.$', (_, l, d) => `升到 ${l} 级！新工位已就绪：现在有 ${d} 个工位。`),
    R('^Level (\\d+): \\+1 desk$', (_, l) => `${l} 级：+1 工位`),
    // People
    R('^' + ROLE_RE + ', (\\d)★\\. Costs ' + num + ' credits now and ' + num + ' every Monday\\.$', (_, r, s, a, b) => `${role(r)}，${s}★。现在花费 ${a} 信用点，每周一再付 ${b}。`),
    R('^Hire (.+)\\?$', (_, n) => `雇佣 ${n}？`),
    R('^Hire (.+)$', (_, n) => `雇佣 ${n}`),
    R('^Let (.+) go\\?$', (_, n) => `解雇 ${n}？`),
    R('^(.+) · ' + ROLE_RE + '$', (_, n, r) => `${n} · ${role(r)}`),
    R('^(.+) · CEO$', (_, n) => `${n} · CEO`),
    R('^(.+) joined your desk\\.$', (_, n) => `${n} 加入了你的交易台。`),
    R('^(.+) has left the desk\\.$', (_, n) => `${n} 离开了交易台。`),
    R('^(.+) is your new CEO\\.$', (_, n) => `${n} 是你的新 CEO。`),
    R('^Hi boss! (.+), reporting in\\.$', (_, s) => `老板好！${style(s)}，前来报到。`),
    R('^Joined the desk\\. (.+)\\.$', (_, r) => `加入了交易台。${READS[r] || READS[r + '.'] || r}。`),
    R('^“(.+)”$', (_, s) => `「${style(s)}」`),
    R('^An analyst levelled up to (\\d)★\\.$', (_, s) => `一名分析师升到了 ${s}★。`),
    R('^Paid ' + num + ' credits in salaries\\.(?: Couldn\'t pay (.+): they quit\\.)?$', (_, a, q) => `支付了 ${a} 信用点薪水。${q ? `付不起 ${q} 的薪水：他们离职了。` : ''}`),
    R('^Couldn\'t pay (.+): they quit\\.$', (_, q) => `付不起 ${q} 的薪水：他们离职了。`),
    R('^(\\w+) · ' + ARCH_RE + ' · ELO (\\d+)$', (_, p, a, e) => `${p} · ${arch(a)} · ELO ${e}`),
    R('^(.+) · (\\w+) · ' + ARCH_RE + '$', (_, n, p, a) => `${n} · ${p} · ${arch(a)}`),
    R('^' + ARCH_RE + ' · (.+) · trades when the desk\'s view clears ([\\d.]+)$', (_, a, s, t) => `${arch(a)} · ${sub(s)} · 交易台观点超过 ${t} 时交易`),
    R('^· trades when the desk\'s view clears ([\\d.]+)$', (_, t) => `· 交易台观点超过 ${t} 时交易`),
    R('^(Swing, medium conviction|Momentum, high turnover|Capital preservation, likes the T-bill leg|Event-driven, short horizons|Diversified, follows the risk officer|Balanced)$', (_, s) => ({
      'Swing, medium conviction': '波段，中等信念', 'Momentum, high turnover': '动量，高换手',
      'Capital preservation, likes the T-bill leg': '保本优先，偏爱国债腿', 'Event-driven, short horizons': '事件驱动，短期限',
      'Diversified, follows the risk officer': '分散投资，听风控官的', Balanced: '均衡' }[s])),
    R('^' + ARCH_RE + '$', (_, a) => arch(a)),
    // Assets and scans
    R('^([A-Z0-9]+x?) · (.+)$', (_, s, n) => `${s} · ${assetName(n)}`),
    R('^(.+) \\((tokenized|X Layer gas|1 oz|HIP-3 index perp)\\)$', (m) => assetName(m)),
    R('^· (.+)$', (_, s) => { const z = tr(s); return z ? '· ' + z : null; }),
    R('^(\\w+) chart$', (_, s) => `${s} 图表`),
    R('^Scan (\\w+)$', (_, s) => `扫描 ${s}`),
    R('^Team, give me your reads on (\\w+)\\.$', (_, s) => `团队，给我你们对 ${s} 的解读。`),
    R('^Team, scan the board: (\\d+) assets in the mandate\\.$', (_, n) => `团队，扫描行情：授权范围内有 ${n} 个资产。`),
    R('^Desk scan: (\\w+)\\.$', (_, s) => `交易台扫描：${s}。`),
    R('^Desk scan: (\\d+) assets in the mandate\\.$', (_, n) => `交易台扫描：授权范围内有 ${n} 个资产。`),
    R('^Strongest movers: (.+)\\. Reading (\\w+) in full\\.$', (_, l, s) => `波动最大的：${l}。完整解读 ${s}。`),
    R('^READING (.+)$', (_, s) => `解读 ${s}`),
    R('^(demo:sample prices|[\\w.-]+) · (.+)$', (_, src, s) => SESSION[s] ? `${src === 'demo:sample prices' ? '演示：样本价格' : src} · ${SESSION[s]}` : null),
    R('^Lock (\\w+) (long|short|no trade|rotate|rotation)\\?$', (_, s, d) => `锁定 ${s} ${dir(d)}？`),
    R('^Lock this call\\?$', () => '锁定这个判断？'),
    R('^(\\w+) (LONG|SHORT|NO TRADE|ROTATE)$', (_, s, d) => `${s} ${dir(d)}`),
    R('^(\\w+) entry fixed at ([\\d.,]+) \\(5-minute average(?: after the commitment|, ([\\w-]+))\\)\\.$', (_, s, p, src) => `${s} 入场价确定为 ${p}（${src ? `5 分钟均价，${src}` : '提交之后的 5 分钟均价'}）。`),
    R('^(\\w+) call void: (.+)\\.$', (_, s, r) => `${s} 判断作废：${r === 'no price' ? '没有价格' : r}。`),
    R('^(\\w+) no-trade settled: 0R\\.$', (_, s) => `${s} 不交易已结算：0R。`),
    R('^(\\w+) (long|short|rotation) settled at (target|stop|horizon): ([+\\-−]?[\\d.]+R) \\(([+\\-−]?[\\d.]+%)\\)(?:, \\+(\\d+) credits)?\\.$', (_, s, d, why, r, p, c) =>
      `${s} ${dir(d)}在${{ target: '止盈', stop: '止损', horizon: '到期' }[why]}结算：${r}（${p}）${c ? `，+${c} 信用点` : ''}。`),
    R('^Locked: no trade on (\\w+)\\. Staying flat counts too\\.$', (_, s) => `已锁定：${s} 不交易。保持空仓也算数。`),
    R('^Locked: rotate out of (\\w+) into T-bills for (\\w+)\\. Committed as (.+)$', (_, s, h, l) => `已锁定：把 ${s} 轮换进美国国债，期限 ${hz(h)}。提交为 ${l}`),
    R('^Locked: (long|short) (\\w+) for (\\w+)\\. Committed as (.+)$', (_, d, s, h, l) => `已锁定：${dir(d)} ${s}，期限 ${hz(h)}。提交为 ${l}`),
    R('^(\\w+) is outside your mandate$', (_, s) => `${s} 不在你的交易授权内`),
    R('^Risk must be 0\\.1% to ([\\d.]+)%$', (_, a) => `风险必须在 0.1% 到 ${a}% 之间`),
    R('^(\\w+) already has a live call on this desk$', (_, s) => `${s} 在这个交易台已有进行中的判断`),
    R('^(.+) already runs a desk$', (_, n) => `${n} 已经在经营一个交易台`),
    R('^Hiring costs ' + num + ' credits and you have ' + num + '$', (_, a, b) => `雇佣需要 ${a} 信用点，你有 ${b}`),
    R('^Your mandate allows (\\d+) open calls at once$', (_, a) => `你的交易授权最多同时持有 ${a} 个判断`),
    R('^A desk can lock (\\d+) calls a day$', (_, a) => `一个交易台每天最多锁定 ${a} 个判断`),
    // Analyst reads (packages/dex-engine analysts.ts), one sentence at a time
    R('^(Uptrend|Downtrend): EMA20 (above|below) EMA50 by ([\\d.]+%)\\.$', (_, t, ab, p) => `${t === 'Uptrend' ? '上升趋势' : '下降趋势'}：EMA20 ${ab === 'above' ? '高于' : '低于'} EMA50 ${p}。`),
    R('^(Uptrend|Downtrend): (\\w+) ' + pct + ' over 24h on the demo tape\\.$', (_, t, s, p) => `${t === 'Uptrend' ? '上升趋势' : '下降趋势'}：${s} 在演示行情上 24 小时 ${p}。`),
    R('^RSI (\\d+)( \\(stretched\\)| \\(washed out\\))?\\.$', (_, r, x) => `RSI ${r}${x ? (x.includes('stretched') ? '（过度拉伸）' : '（超卖洗盘）') : ''}。`),
    R('^Broke the 48h (high|low)\\.$', (_, h) => `突破了 48 小时${h === 'high' ? '高点' : '低点'}。`),
    R('^(Buyers|Sellers) led the last 24h: (\\d+)% of traded volume\\.$', (_, w, p) => `过去 24 小时${w === 'Buyers' ? '买方' : '卖方'}占优：占成交量的 ${p}%。`),
    R('^(Buyers|Sellers) led the last 24h on the demo tape: (\\d+)% of volume\\.$', (_, w, p) => `演示行情上过去 24 小时${w === 'Buyers' ? '买方' : '卖方'}占优：占成交量的 ${p}%。`),
    R('^Volume is ([\\d.]+)x its two-day average(, a surge)?\\.$', (_, x, s) => `成交量是两日均量的 ${x} 倍${s ? '，明显放量' : ''}。`),
    R('^Funding ' + pct + ' a year: positioning is balanced\\.$', (_, p) => `资金费率年化 ${p}：仓位均衡。`),
    R('^Funding ' + pct + ' a year: (longs are paying, the crowd leans long|shorts are paying, the crowd leans short)\\.$', (_, p, w) => `资金费率年化 ${p}：${w.startsWith('longs') ? '多头在付费，人群偏多' : '空头在付费，人群偏空'}。`),
    R('^(Weekend: US markets closed|US market open|US pre-market|US after-hours|US market closed \\(overnight\\)|Trades 24/7)(; the 24/7 perp sets the price until the open)?\\.$', (_, s, p) => `${SESSION[s]}${p ? '；开盘前由全天候永续合约定价' : ''}。`),
    R('^Crypto-linked: (\\w+) ' + pct + ' vs BTC ' + pct + ' over 24h(?:, (lagging, room to catch up|running ahead of BTC))?\\.$', (_, s, a, b, l) => `与加密货币相关：${s} 24 小时 ${a}，BTC ${b}${l ? (l.startsWith('lagging') ? '，落后，有补涨空间' : '，跑在 BTC 前面') : ''}。`),
    R('^BTC ' + pct + ' over 7 days(, risk-off: size down)?\\.$', (_, p, r) => `BTC 7 天 ${p}${r ? '，避险：减小仓位' : ''}。`),
    R('^T-bills pay ([\\d.]+)% a year: the hurdle for any trade\\.$', (_, p) => `美国国债年化 ${p}%：任何交易的门槛。`),
    R('^Cleared: (.+)\\.$', (_, l) => `通过：${l.split('; ').map(CHECK).join('；')}。`),
    R('^Veto: (.+)\\.$', (_, l) => `否决：${l.split('; ').map(CHECK).join('；')}。`),
    R('^Cleared: liquidity, fresh data, enough history \\(demo checks\\)\\.$', () => '通过：流动性、数据新鲜、历史足够（演示检查）。'),
    R('^Tradeable: about (\\d+) bps slippage and (\\d+) bps fees for \\$' + num + '\\.$', (_, a, b, n) => `可成交：$${n} 约 ${a} 基点滑点和 ${b} 基点手续费。`),
    R('^Tradeable: about (\\d+) bps slippage and (\\d+) bps fees \\(demo estimate\\)\\.$', (_, a, b) => `可成交：约 ${a} 基点滑点和 ${b} 基点手续费（演示估算）。`),
    R('^Not tradeable at this size: about (\\d+) bps slippage, above the (\\d+) bps limit\\.$', (_, a, b) => `这个仓位无法成交：约 ${a} 基点滑点，超过 ${b} 基点上限。`),
    R('^Tokenized T-bills pay ([\\d.]+)% a year\\.$', (_, p) => `代币化美国国债年化 ${p}%。`),
    R('^Tokenized T-bills pay ([\\d.]+)% vs ([\\d.]+)% for stablecoin lending: (T-bills win for idle cash, with less risk|lending pays more, but carries protocol risk)\\.$', (_, a, b, w) => `代币化美国国债年化 ${a}%，稳定币借贷 ${b}%：${w.startsWith('T-bills') ? '闲置资金放国债更好，风险更低' : '借贷收益更高，但有协议风险'}。`),
    // The CEO's rationale (ceo.ts)
    R('^(.+) stays flat on (\\w+): (.+)$', (_, n, s, why) => `${n} 对 ${s} 保持空仓：${reason(why)}`),
    R('^(.+) goes (long|short) (\\w+) for (\\w+): target ([\\d.]+%), stop ([\\d.]+%)\\. (.+)$', (_, n, d, s, h, t, st, why) => `${n} ${dir(d)} ${s}，期限 ${hz(h)}：止盈 ${t}，止损 ${st}。${whyList(why)}`),
    R('^(.+) rotates the risk budget out of (\\w+) into tokenized T-bills \\(([\\d.]+)% a year\\) for 7 days\\. (.+)$', (_, n, s, p, why) => `${n} 把风险预算从 ${s} 转入代币化美国国债（年化 ${p}%），为期 7 天。${whyList(why)}`),
    R('^the desk leans short and the mandate is long only \\(demo tape\\)\\.$', () => '交易台偏空，而交易授权只允许做多（演示行情）。'),
    // The CEO's speech bubble drops the "Name goes long X for 24h:" lead.
    R('^target ([\\d.]+%), stop ([\\d.]+%)\\. (.+)$', (_, t, st, why) => `止盈 ${t}，止损 ${st}。${whyList(why)}`),
    R('^Target ([\\d.]+%) · stop ([\\d.]+%) · risk ([\\d.]+)% · confidence (\\d+)%$', (_, t, st, r, c) => `止盈 ${t} · 止损 ${st} · 风险 ${r}% · 信心 ${c}%`),
    R('^(the desk(?:\'s view| leans short).+)$', (_, s) => { const z = reason(s); return z === s ? null : z; }),
    R('^(\\w+) · (5m|1h|1d)$', (_, w, tf) => `${w === 'demo' ? '演示' : w} · ${tf}`),
  ];
  // "Name (role): first sentence. Name (role): …." from ceo.ts
  const ROLE_TAG = { chart: '图表', flow: '资金流', sentiment: '情绪', macro: '宏观', yield: '收益', risk: '风控', execution: '执行' };
  function whyList(s) {
    s = s.replace(/\.$/, '');
    return s.split(/\. (?=(?:My chart read|[^.:()]+ \((?:chart|flow|sentiment|macro|yield|risk|execution)\)):)/).map((part) => {
      const m = part.match(/^(My chart read|(.+) \((\w+)\)): (.+)$/);
      if (!m) return sub(part + '.').replace(/[。.]$/, '');
      const who = m[1] === 'My chart read' ? '我的图表判断' : `${m[2]}（${ROLE_TAG[m[3]] || m[3]}）`;
      return `${who}：${sentence(m[4] + '.').replace(/。$/, '')}`;
    }).join('。') + '。';
  }
  function reason(s) {
    let m;
    if ((m = s.match(/^the desk's view \(([+\-]?[\d.]+)\) is below my bar of ([\d.]+)\. (.+)$/))) return `交易台的观点（${m[1]}）低于我的门槛 ${m[2]}。${m[3] === 'Nothing stands out.' ? '没有突出的机会。' : whyList(m[3])}`;
    if ((m = s.match(/^the desk leans short \((-?[\d.]+)\), and the mandate is long only\.$/))) return `交易台偏空（${m[1]}），而交易授权只允许做多。`;
    return sentence(s);
  }
  // Translate sentence by sentence when a whole string has no entry.
  function sentence(s) {
    const z = tr(s, true);
    if (z != null) return z;
    const parts = s.split(/(?<=[.!?])\s+(?=[A-Z])/);
    if (parts.length < 2) return s;
    const out = parts.map((p) => tr(p, true));
    return out.every((x) => x != null) ? out.join('') : s;
  }

  function tr(s, noSplit) {
    if (Object.prototype.hasOwnProperty.call(ZH, s)) return ZH[s];
    const l = LC.get(s.toLowerCase());
    if (l != null) return l;
    for (const [re, f] of PAT) {
      const m = re.exec(s);
      if (m) { const r = f(...m); if (r != null) return r; }
    }
    if (!noSplit && /[.!?]\s+[A-Z]/.test(s)) { const r = sentence(s); if (r !== s) return r; }
    return null;
  }

  // ── The page (same engine as KULT Syndicates' i18n.js) ─────────────────
  const TEXT = new WeakMap();
  const ATTR = new WeakMap();
  const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
  const SKIP = /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE|NOSCRIPT)$/;

  function skipped(el) {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) if (SKIP.test(e.tagName) || e.hasAttribute('data-no-i18n')) return true;
    return false;
  }
  function localise(raw) {
    const core = raw.replace(/\s+/g, ' ').trim();
    if (!core || !/[A-Za-z]/.test(core)) return null;
    const z = tr(core);
    if (z == null) return null;
    return raw.match(/^\s*/)[0] + z + raw.match(/\s*$/)[0];
  }
  function doText(node) {
    const v = node.nodeValue, rec = TEXT.get(node);
    if (rec && (v === rec.zh || v === rec.en)) {
      const want = lang === 'zh' ? rec.zh : rec.en;
      if (v !== want) node.nodeValue = want;
      return;
    }
    if (node.parentElement && skipped(node.parentElement)) return;
    const zh = localise(v);
    TEXT.set(node, { en: v, zh: zh ?? v });
    if (lang === 'zh' && zh != null) node.nodeValue = zh;
  }
  function doAttr(el, a) {
    const v = el.getAttribute(a);
    if (v == null) return;
    let recs = ATTR.get(el); if (!recs) ATTR.set(el, (recs = {}));
    const rec = recs[a];
    if (rec && (v === rec.zh || v === rec.en)) {
      const want = lang === 'zh' ? rec.zh : rec.en;
      if (v !== want) el.setAttribute(a, want);
      return;
    }
    if (skipped(el)) return;
    const zh = localise(v);
    recs[a] = { en: v, zh: zh ?? v };
    if (lang === 'zh' && zh != null) el.setAttribute(a, zh);
  }
  function doElement(el) { for (const a of ATTRS) if (el.hasAttribute(a)) doAttr(el, a); }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    if (SKIP.test(root.tagName) || root.hasAttribute('data-no-i18n')) return;
    doElement(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => (n.nodeType === 1 && (SKIP.test(n.tagName) || n.hasAttribute('data-no-i18n')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    let n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doElement(n); }
  }
  let title = null;
  function doTitle() {
    const t = document.title;
    if (title && (t === title.zh || t === title.en)) { const want = lang === 'zh' ? title.zh : title.en; if (t !== want) document.title = want; return; }
    const zh = localise(t) ?? t; title = { en: t, zh };
    if (lang === 'zh' && zh !== t) document.title = zh;
  }
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') { if (ATTRS.includes(m.attributeName)) doAttr(m.target, m.attributeName); }
      else { if (m.target.nodeName === 'TITLE') { doTitle(); continue; } m.addedNodes.forEach(walk); }
    }
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });

  // ── Switching ──────────────────────────────────────────────────────────
  const listeners = [];
  function paintButton() {
    const b = document.getElementById('lang-btn');
    if (!b) return;
    b.textContent = lang === 'zh' ? 'EN' : '中文';
    b.setAttribute('aria-label', lang === 'zh' ? 'Switch to English' : '切换到中文');
    b.title = lang === 'zh' ? 'English' : '中文';
  }
  function apply() {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.documentElement.classList.toggle('lang-zh', lang === 'zh');
    if (document.body) walk(document.body);
    doTitle();
    paintButton();
  }
  function setLang(l) {
    if ((l !== 'zh' && l !== 'en') || l === lang) return;
    lang = l;
    try { localStorage.setItem(KEY, l); } catch {}
    try { const u = new URL(location.href); if (u.searchParams.has('lang')) { u.searchParams.set('lang', l); history.replaceState(history.state, '', u); } } catch {}
    apply();
    listeners.forEach((f) => { try { f(l); } catch {} });
  }
  addEventListener('storage', (e) => { if (e.key === KEY && (e.newValue === 'zh' || e.newValue === 'en')) setLang(e.newValue); });
  function ready() {
    apply();
    const b = document.getElementById('lang-btn');
    if (b && !b.dataset.bound) { b.dataset.bound = '1'; b.addEventListener('click', () => setLang(lang === 'zh' ? 'en' : 'zh')); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();

  window.kultI18n = {
    get lang() { return lang; },
    setLang,
    onLang: (f) => listeners.push(f),
    t: (s) => (lang === 'zh' ? tr(String(s)) ?? s : s),
  };
})();
