export const RISK_LABEL_ZH: Record<string, string> = {
  Normal: '正常',
  HeatingUp: '熱度升溫',
  SqueezeRisk: '軋空風險',
  ReversalRisk: '反轉風險',
}

export const STATUS_LABEL_ZH: Record<string, string> = {
  active: '監控中',
  resolved: '已結案',
}

export const STANCE_LABEL_ZH: Record<string, string> = {
  bullish: '看多',
  bearish: '看空',
  neutral: '中立',
}

export const POST_TYPE_LABEL_ZH: Record<string, string> = {
  opinion: '觀點',
  coordination: '協同行動',
  meme: '迷因',
  news: '新聞',
  panic: '恐慌',
}

export const AUTHOR_TYPE_LABEL_ZH: Record<string, string> = {
  influencer: '意見領袖',
  retail: '散戶',
  news_outlet: '新聞來源',
}

export const EVENT_TYPE_LABEL_ZH: Record<string, string> = {
  market_event: '市場事件',
  social_event: '社群事件',
  regulation_event: '監管事件',
}

export function riskLabelZh(label?: string | null): string {
  if (!label) return '正常'
  return RISK_LABEL_ZH[label] ?? label
}

export function statusLabelZh(status?: string | null): string {
  if (!status) return ''
  return STATUS_LABEL_ZH[status] ?? status
}

export function formatTaiwanDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

export function relativeTimeZh(value: string): string {
  try {
    const diffMs = Date.now() - new Date(value).getTime()
    const minutes = Math.max(0, Math.floor(diffMs / 60000))
    if (minutes < 1) return '剛剛'
    if (minutes < 60) return `${minutes} 分鐘前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} 小時前`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days} 天前`
    return new Date(value).toLocaleDateString('zh-TW')
  } catch {
    return value.slice(0, 10)
  }
}

const DRIVER_TRANSLATIONS: Array<[string, string]> = [
  ['Social mention surge', '社群提及量暴增'],
  ['Social mentions rising', '社群提及量上升'],
  ['High avg hype score', '平均炒作熱度偏高'],
  ['Moderate-high hype score', '炒作熱度中高'],
  ['Bullish sentiment dominant', '看多情緒占主導'],
  ['Abnormal trading volume', '成交量異常放大'],
  ['Above-average volume', '成交量高於平均'],
  ['Extreme price volatility', '價格波動極端'],
  ['Elevated volatility', '波動升高'],
  ['High coordination ratio', '協同行動比例偏高'],
  ['Heavy influencer activity', '意見領袖活動密集'],
  ['Trading restrictions activated', '交易限制啟動'],
  ['Abnormal options activity', '選擇權活動異常'],
  ['High short interest', '放空比例偏高'],
]

export function driverLabelZh(factor: string): string {
  const found = DRIVER_TRANSLATIONS.find(([key]) => factor.includes(key))
  return found?.[1] ?? factor
}

export function impactZh(impact: string): string {
  return {
    high: '高',
    medium: '中',
    low: '低',
  }[impact] ?? impact
}

const SCENARIO_EXPLANATION_ZH: Record<string, string> = {
  Normal: '目前社群與市場訊號仍在正常範圍內，尚未偵測到明顯異常交易行為。',
  HeatingUp: '社群活動開始升溫，提及量與看多情緒正在上升，建議持續監控。',
  SqueezeRisk: '警示：社群驅動的軋空風險升高。社群提及量、炒作熱度與成交量都出現異常，短期價格可能劇烈波動。',
  ReversalRisk: '重大風險：多項指標同時接近極端狀態，型態接近 GameStop 2021 年事件，後續出現劇烈反轉的機率升高。',
}

export function scenarioExplanationZh(label: string, fallback: string): string {
  return SCENARIO_EXPLANATION_ZH[label] ?? fallback
}

const EVENT_TITLE_ZH: Record<string, string> = {
  'Ryan Cohen joins GameStop Board': 'Ryan Cohen 加入 GameStop 董事會',
  'WSB mentions hit 10k/day — early squeeze narrative forms': 'WSB 提及量達每日 1 萬則，早期軋空敘事形成',
  'Short interest reported at 140% of float': '放空比例被揭露高達流通股 140%',
  'WSB explodes — 2M subscribers milestone': 'WSB 社群爆發，訂閱數突破 200 萬',
  "Elon Musk tweets 'Gamestonk!!'": "Elon Musk 發文「Gamestonk!!」",
  'GME peaks at $483 — all-time high': 'GME 盤中衝上 483 美元歷史高點',
  'Robinhood halts GME buying — massive backlash': 'Robinhood 限制買進 GME，引發巨大反彈',
  "Reddit 'Hold the line' movement peaks": 'Reddit「守住防線」行動達到高峰',
  'Short squeeze unwinds — price collapses to $90': '軋空行情退潮，股價跌至 90 美元',
  'SEC announces review of social media trading': 'SEC 宣布檢視社群交易現象',
  'Congressional hearing: Robinhood CEO testifies': '國會聽證會：Robinhood 執行長作證',
  'Second wave begins — WSB activity surges again': '第二波行情開始，WSB 活動再度升高',
  'GameStop announces e-commerce pivot': 'GameStop 宣布轉向電子商務策略',
  'Third squeeze attempt — price hits $190': '第三波軋空嘗試，股價觸及 190 美元',
  'GME files ATM offering — 3.5M shares': 'GME 申請 ATM 增資，發行 350 萬股',
}

const EVENT_DESCRIPTION_ZH: Record<string, string> = {
  'Ryan Cohen joins GameStop Board': 'Chewy 共同創辦人 Ryan Cohen 與另外兩名 RC Ventures 提名人加入 GameStop 董事會，WSB 社群將此視為重要催化因素。',
  'WSB mentions hit 10k/day — early squeeze narrative forms': 'r/wallstreetbets 中關於 GME 的每日貼文首次超過 1 萬則，「short squeeze」敘事開始主導討論。',
  'Short interest reported at 140% of float': 'GME 的放空資料顯示，空頭部位超過流通股 140%，屬於極端罕見水準，進一步推升軋空想像。',
  'WSB explodes — 2M subscribers milestone': 'r/wallstreetbets 訂閱數達 200 萬，GME 貼文量較前一週基準暴增 8 倍，協同行動語言明顯增加。',
  "Elon Musk tweets 'Gamestonk!!'": 'Elon Musk 發文連結 r/wallstreetbets，將訊號同時放大給數千萬追蹤者，盤後股價大幅上漲。',
  'GME peaks at $483 — all-time high': 'GameStop 盤中觸及 483 美元歷史高點，成交量突破 9,300 萬股，空頭賣方面臨巨大損失。',
  'Robinhood halts GME buying — massive backlash': 'Robinhood 與多家券商因保證金要求限制 GME 買進，股價自高點大跌，引發國會聽證與市場公平性爭議。',
  "Reddit 'Hold the line' movement peaks": '即使股價下跌，WSB 仍出現大量「hold the line」與「diamond hands」訊息，協同行動比例達高峰。',
  'Short squeeze unwinds — price collapses to $90': '隨著機構空頭回補完成、部分散戶開始賣出，GME 跌至 90 美元，討論熱度仍高但看多比例明顯下降。',
  'SEC announces review of social media trading': 'SEC 表示正在密切監控並評估 GME 極端波動，代表監管層可能介入檢視。',
  'Congressional hearing: Robinhood CEO testifies': 'Robinhood 執行長 Vlad Tenev 就一月交易限制出席國會聽證，GameStop 再度成為主流媒體焦點。',
  'Second wave begins — WSB activity surges again': 'GME 社群聲量 24 小時內暴增 4 倍，新的軋空敘事重新出現，股價單日大幅上漲。',
  'GameStop announces e-commerce pivot': 'GameStop 宣布轉型為電子商務公司，由 Ryan Cohen 主導策略，市場敘事由單純軋空轉向價值重估。',
  'Third squeeze attempt — price hits $190': 'GME 兩天內上漲約 50% 並觸及 190 美元，選擇權 gamma squeeze 動態被市場關注。',
  'GME files ATM offering — 3.5M shares': 'GameStop 宣布以 ATM 方式發行 350 萬股，籌資約 6 億美元，市場一度擔心稀釋效應。',
}

export function eventTitleZh(title: string): string {
  return EVENT_TITLE_ZH[title] ?? title
}

export function eventDescriptionZh(title: string, description?: string | null): string | null {
  if (!description) return null
  return EVENT_DESCRIPTION_ZH[title] ?? description
}

const ALERT_SUMMARY_ZH: Record<string, string> = {
  'Social mentions +8x | Hype score 0.76 | Bullish ratio 88% | Volume 3.2σ above mean':
    '社群提及量 +8 倍 | 炒作熱度 0.76 | 看多比例 88% | 成交量高於平均 3.2σ',
  'Elon Musk tweet catalyst | Social +22x | Hype 0.85 | Gamma squeeze dynamics active':
    'Elon Musk 發文催化 | 社群聲量 +22 倍 | 炒作熱度 0.85 | Gamma squeeze 啟動',
  'ALL-TIME HIGH $483 | Social volume 58k posts/day | Hype 0.95 | 93M shares traded':
    '歷史高點 483 美元 | 每日社群貼文 5.8 萬則 | 炒作熱度 0.95 | 成交量 9,300 萬股',
  'Trading halt by Robinhood | Price -77% from peak | Regulatory intervention | Panic selling begins':
    'Robinhood 限制交易 | 股價自高點下跌 77% | 監管介入 | 恐慌賣壓開始',
  'Second wave | Social +4x | Price +127% single day | Short interest still elevated':
    '第二波行情 | 社群聲量 +4 倍 | 單日股價 +127% | 放空比例仍高',
  'Third wave attempt | Social +2x | Price +50% in 2 days | Options gamma active':
    '第三波嘗試 | 社群聲量 +2 倍 | 兩日股價 +50% | 選擇權 gamma 活躍',
}

const ALERT_EXPLANATION_ZH: Record<string, string> = {
  'WARNING: Social-driven squeeze risk elevated. Social mentions surging 8x above baseline, extreme bullish sentiment, and abnormal volume detected. Extreme short-term price swings are probable.':
    '警示：社群驅動的軋空風險升高。社群提及量較基準暴增 8 倍，看多情緒極端，且成交量異常放大，短期可能出現劇烈價格波動。',
  "CRITICAL: Influencer-amplified squeeze signal. Elon Musk's tweet to 43M followers created simultaneous buy signal. Gamma squeeze mechanics are amplifying price moves.":
    '重大警示：意見領袖放大的軋空訊號。Elon Musk 對大量追蹤者發出同步訊號，選擇權 gamma squeeze 機制正在放大價格變動。',
  'CRITICAL RISK: All indicators at historic extremes. GME social volume unprecedented, hype score at ceiling, price at all-time high. High probability of severe reversal within 24-72 hours.':
    '重大風險：所有指標都接近歷史極端。GME 社群聲量空前，炒作熱度接近上限，股價處於歷史高點，24 到 72 小時內發生劇烈反轉的機率升高。',
  'CRITICAL: Trading restrictions have been activated, creating a one-sided market. Historical data shows trading halts during meme stock events lead to accelerated price reversal.':
    '重大警示：交易限制已啟動，市場形成單向壓力。歷史資料顯示，迷因股事件中的交易限制常加速價格反轉。',
  'WARNING: Second squeeze cycle detected. Social activity mirrors early January pattern. Short interest remains elevated. Second wave squeeze risk is elevated.':
    '警示：偵測到第二輪軋空循環。社群活動接近一月初型態，放空比例仍高，第二波軋空風險升高。',
  'Third wave social trading activity detected. Less intense than prior waves but pattern is similar. Monitor for escalation.':
    '偵測到第三波社群交易活動。強度低於前兩波，但型態相似，需持續監控是否升級。',
}

export function alertSummaryZh(summary?: string | null): string | null {
  if (!summary) return null
  return ALERT_SUMMARY_ZH[summary] ?? summary
}

export function alertExplanationZh(explanation?: string | null): string | null {
  if (!explanation) return null
  return ALERT_EXPLANATION_ZH[explanation] ?? explanation
}
