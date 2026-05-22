import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, TrendingUp, TrendingDown, Users, Zap, BarChart2, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import { marketApi } from '../api/client'
import RiskMeter from '../components/RiskMeter'
import PostCard from '../components/PostCard'
import TimelineChart from '../components/TimelineChart'
import { driverLabelZh, impactZh, riskLabelZh } from '../i18n'

const RISK_BADGE: Record<string, string> = {
  Normal: 'badge-normal',
  HeatingUp: 'badge-heating',
  SqueezeRisk: 'badge-squeeze',
  ReversalRisk: 'badge-reversal',
}

const IMPACT_COLORS: Record<string, string> = {
  high: 'text-red-400 bg-red-900/20 border-red-700/30',
  medium: 'text-amber-400 bg-amber-900/20 border-amber-700/30',
  low: 'text-teal-300 bg-teal-900/20 border-teal-700/30',
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  color = 'text-white',
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | null
  color?: string
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-2">
        <div className="metric-label">{label}</div>
        <Icon size={15} className="text-slate-500" />
      </div>
      <div className={clsx('finance-number text-2xl', color)}>{value}</div>
      {sub && (
        <div className="flex items-center gap-1 mt-1">
          {trend === 'up' && <TrendingUp size={12} className="text-green-400" />}
          {trend === 'down' && <TrendingDown size={12} className="text-red-400" />}
          <span className="text-xs text-slate-400">{sub}</span>
        </div>
      )}
    </div>
  )
}

export default function MarketPulse() {
  const [ticker, setTicker] = useState('GME')
  const [inputTicker, setInputTicker] = useState('GME')
  const [days, setDays] = useState(60)

  const summaryQuery = useQuery({
    queryKey: ['summary', ticker],
    queryFn: () => marketApi.getSummary(ticker),
    retry: false,
  })

  const timeseriesQuery = useQuery({
    queryKey: ['timeseries', ticker, days],
    queryFn: () => marketApi.getTimeseries(ticker, days),
    retry: false,
  })

  const driversQuery = useQuery({
    queryKey: ['drivers', ticker],
    queryFn: () => marketApi.getDrivers(ticker),
    retry: false,
  })

  const postsQuery = useQuery({
    queryKey: ['posts', ticker],
    queryFn: () => marketApi.getPosts(ticker, 10),
    retry: false,
  })

  const summary = summaryQuery.data
  const timeseries = timeseriesQuery.data ?? []
  const drivers = driversQuery.data?.drivers ?? []
  const posts = postsQuery.data ?? []
  const riskLevel = summary?.risk_level ?? 'Normal'
  const primaryDriver = drivers[0]?.factor ? driverLabelZh(drivers[0].factor) : '目前沒有主要升高因子'
  const marketState =
    riskLevel === 'Normal' ? '訊號穩定' :
    riskLevel === 'HeatingUp' ? '社群熱度升溫' :
    riskLevel === 'SqueezeRisk' ? '軋空風險升高' :
    '反轉風險升高'

  const chartData = timeseries.map(t => ({
    date: t.date,
    price: t.close,
    volume: t.volume,
    postCount: t.post_count,
    hypeScore: t.avg_hype_score,
    riskScore: t.risk_score,
  }))

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputTicker.trim()) setTicker(inputTicker.trim().toUpperCase())
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="section-kicker mb-2">Market Pulse</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">市場脈動</h1>
          <p className="text-slate-500 text-sm mt-0.5">即時追蹤社群交易訊號、價格變化與風險狀態</p>
        </div>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={inputTicker}
              onChange={e => setInputTicker(e.target.value.toUpperCase())}
              placeholder="股票代號..."
              className="input-premium pl-9 pr-4 py-2 w-32"
            />
          </div>
          <button
            type="submit"
            className="btn-primary px-4 py-2"
          >
            搜尋
          </button>
          <button
            type="button"
            onClick={() => { summaryQuery.refetch(); timeseriesQuery.refetch() }}
            className="btn-secondary p-2"
          >
            <RefreshCw size={15} />
          </button>
        </form>
      </div>

      {/* Error state */}
      {summaryQuery.isError && (
        <div className="card border-yellow-700/50 bg-yellow-900/10 text-yellow-400 text-sm">
          無法連接 API。請確認後端服務正在執行。
        </div>
      )}

      {/* Executive summary */}
      <div className="card">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <div className="metric-label">Current Market State</div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="text-3xl font-bold tracking-tight text-white">{ticker}</span>
              <span className={clsx('text-xs px-2.5 py-1 rounded-full border font-semibold',
                RISK_BADGE[riskLevel] ?? 'badge-normal'
              )}>
                {riskLabelZh(riskLevel)}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              目前判定為「{marketState}」。主要觀察來源為社群聲量、情緒集中度、炒作熱度與市場成交量同步變化。
            </p>
          </div>
          <div className="card-compact">
            <div className="metric-label">Top Driver</div>
            <div className="mt-2 text-sm font-semibold text-slate-100">{primaryDriver}</div>
            <div className="mt-2 text-xs text-slate-500">依目前時間窗自動排序</div>
          </div>
          <div className="card-compact">
            <div className="metric-label">Risk Score</div>
            <div className="finance-number mt-2 text-3xl text-amber-300">
              {summary?.risk_score != null ? summary.risk_score.toFixed(1) : '0.0'}
              <span className="ml-1 text-sm text-slate-500">/ 10</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">規則引擎與市場脈絡綜合評分</div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="目前股價"
          value={summary?.current_price != null ? `$${summary.current_price.toFixed(2)}` : '—'}
          sub={summary?.price_change_pct != null ? `今日 ${summary.price_change_pct > 0 ? '+' : ''}${summary.price_change_pct.toFixed(2)}%` : undefined}
          icon={TrendingUp}
          trend={summary?.price_change_pct != null ? (summary.price_change_pct >= 0 ? 'up' : 'down') : null}
          color={summary?.price_change_pct != null && summary.price_change_pct >= 0 ? 'text-teal-300' : 'text-red-400'}
        />
        <StatCard
          label="社群聲量"
          value={summary?.social_volume != null ? summary.social_volume.toLocaleString() : '—'}
          sub={summary?.mention_growth_rate != null ? `較昨日 ${summary.mention_growth_rate > 0 ? '+' : ''}${(summary.mention_growth_rate * 100).toFixed(0)}%` : undefined}
          icon={Users}
          trend={summary?.mention_growth_rate != null ? (summary.mention_growth_rate > 0 ? 'up' : null) : null}
        />
        <StatCard
          label="看多比例"
          value={summary?.bullish_ratio != null ? `${(summary.bullish_ratio * 100).toFixed(0)}%` : '—'}
          sub={summary?.bearish_ratio != null ? `${(summary.bearish_ratio * 100).toFixed(0)}% 看空` : undefined}
          icon={Zap}
          color={summary?.bullish_ratio != null && summary.bullish_ratio > 0.6 ? 'text-teal-300' : 'text-white'}
        />
        <StatCard
          label="平均炒作熱度"
          value={summary?.avg_hype_score != null ? (summary.avg_hype_score * 100).toFixed(0) + '%' : '—'}
          sub="社群情緒強度"
          icon={BarChart2}
          color={summary?.avg_hype_score != null && summary.avg_hype_score > 0.6 ? 'text-orange-400' : 'text-white'}
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="xl:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <div>
          <h2 className="panel-title">{ticker} 股價與社群活動</h2>
              <p className="text-xs text-slate-400 mt-0.5">雙軸圖表：股價與社群聲量疊合觀察</p>
            </div>
            <div className="flex gap-1">
              {[30, 60, 90].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={clsx(
                    'px-2.5 py-1 text-xs rounded-md font-medium transition-colors',
                    days === d
                      ? 'bg-teal-700 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  )}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>
          <TimelineChart
            data={chartData}
            height={340}
            showPrice
            showVolume={false}
            showSocial
          />
        </div>

        {/* Risk gauge + drivers */}
        <div className="space-y-4">
          {/* Risk meter */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h2 className="panel-title">風險等級</h2>
              <span className={clsx('text-xs px-2 py-0.5 rounded-full border font-medium',
                RISK_BADGE[summary?.risk_level ?? 'Normal'] ?? 'badge-normal'
              )}>
                {riskLabelZh(summary?.risk_level ?? 'Normal')}
              </span>
            </div>
            <div className="flex justify-center">
              <RiskMeter
                score={summary?.risk_score ?? 0}
                label={summary?.risk_level ?? 'Normal'}
                size={200}
              />
            </div>
          </div>

          {/* Drivers */}
          <div className="card">
            <h2 className="panel-title mb-3">風險成因</h2>
            {drivers.length === 0 ? (
              <div className="text-slate-500 text-sm text-center py-4">目前沒有偵測到升高的風險因子</div>
            ) : (
              <div className="space-y-2">
                {drivers.map((d, i) => (
                  <div
                    key={i}
                    className={clsx('flex items-center justify-between px-3 py-2 rounded-lg border text-xs', IMPACT_COLORS[d.impact])}
                  >
                    <span className="font-medium">{driverLabelZh(d.factor)}</span>
                    <span className="font-bold ml-2 whitespace-nowrap">{d.value} / {impactZh(d.impact)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Posts */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="panel-title">近期社群貼文</h2>
          <span className="text-xs text-slate-500">{posts.length} 則貼文</span>
        </div>
        {posts.length === 0 ? (
          <div className="text-slate-500 text-sm text-center py-8">
            目前沒有貼文資料，請先匯入展示資料。
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {posts.map(post => (
              <PostCard key={post.post_id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
