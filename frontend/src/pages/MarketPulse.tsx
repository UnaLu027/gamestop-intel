import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, TrendingUp, TrendingDown, Users, Zap, AlertTriangle, BarChart2, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import { marketApi } from '../api/client'
import RiskMeter from '../components/RiskMeter'
import PostCard from '../components/PostCard'
import TimelineChart from '../components/TimelineChart'

const RISK_BADGE: Record<string, string> = {
  Normal: 'badge-normal',
  HeatingUp: 'badge-heating',
  SqueezeRisk: 'badge-squeeze',
  ReversalRisk: 'badge-reversal',
}

const IMPACT_COLORS: Record<string, string> = {
  high: 'text-red-400 bg-red-900/20 border-red-700/30',
  medium: 'text-yellow-400 bg-yellow-900/20 border-yellow-700/30',
  low: 'text-green-400 bg-green-900/20 border-green-700/30',
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
        <div className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</div>
        <Icon size={15} className="text-slate-500" />
      </div>
      <div className={clsx('text-2xl font-bold', color)}>{value}</div>
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

  const isLoading = summaryQuery.isLoading

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Market Pulse</h1>
          <p className="text-slate-400 text-sm mt-0.5">Real-time social trading signal dashboard</p>
        </div>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={inputTicker}
              onChange={e => setInputTicker(e.target.value.toUpperCase())}
              placeholder="Ticker..."
              className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-600 w-32"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => { summaryQuery.refetch(); timeseriesQuery.refetch() }}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw size={15} />
          </button>
        </form>
      </div>

      {/* Error state */}
      {summaryQuery.isError && (
        <div className="card border-yellow-700/50 bg-yellow-900/10 text-yellow-400 text-sm">
          Could not connect to API. Make sure the backend is running. Showing placeholder layout.
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current Price"
          value={summary?.current_price != null ? `$${summary.current_price.toFixed(2)}` : '—'}
          sub={summary?.price_change_pct != null ? `${summary.price_change_pct > 0 ? '+' : ''}${summary.price_change_pct.toFixed(2)}% today` : undefined}
          icon={TrendingUp}
          trend={summary?.price_change_pct != null ? (summary.price_change_pct >= 0 ? 'up' : 'down') : null}
          color={summary?.price_change_pct != null && summary.price_change_pct >= 0 ? 'text-green-400' : 'text-red-400'}
        />
        <StatCard
          label="Social Volume"
          value={summary?.social_volume != null ? summary.social_volume.toLocaleString() : '—'}
          sub={summary?.mention_growth_rate != null ? `${summary.mention_growth_rate > 0 ? '+' : ''}${(summary.mention_growth_rate * 100).toFixed(0)}% vs yesterday` : undefined}
          icon={Users}
          trend={summary?.mention_growth_rate != null ? (summary.mention_growth_rate > 0 ? 'up' : null) : null}
        />
        <StatCard
          label="Bullish Ratio"
          value={summary?.bullish_ratio != null ? `${(summary.bullish_ratio * 100).toFixed(0)}%` : '—'}
          sub={summary?.bearish_ratio != null ? `${(summary.bearish_ratio * 100).toFixed(0)}% bearish` : undefined}
          icon={Zap}
          color={summary?.bullish_ratio != null && summary.bullish_ratio > 0.6 ? 'text-green-400' : 'text-white'}
        />
        <StatCard
          label="Avg Hype Score"
          value={summary?.avg_hype_score != null ? (summary.avg_hype_score * 100).toFixed(0) + '%' : '—'}
          sub="Sentiment intensity"
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
              <h2 className="text-base font-semibold text-white">{ticker} Price & Social Activity</h2>
              <p className="text-xs text-slate-400 mt-0.5">Dual-axis: price + social volume overlay</p>
            </div>
            <div className="flex gap-1">
              {[30, 60, 90].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={clsx(
                    'px-2.5 py-1 text-xs rounded-md font-medium transition-colors',
                    days === d
                      ? 'bg-green-600 text-white'
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
              <h2 className="text-base font-semibold text-white">Risk Level</h2>
              <span className={clsx('text-xs px-2 py-0.5 rounded-full border font-medium',
                RISK_BADGE[summary?.risk_level ?? 'Normal'] ?? 'badge-normal'
              )}>
                {summary?.risk_level ?? 'Normal'}
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
            <h2 className="text-base font-semibold text-white mb-3">Risk Drivers</h2>
            {drivers.length === 0 ? (
              <div className="text-slate-500 text-sm text-center py-4">No elevated risk factors detected</div>
            ) : (
              <div className="space-y-2">
                {drivers.map((d, i) => (
                  <div
                    key={i}
                    className={clsx('flex items-center justify-between px-3 py-2 rounded-lg border text-xs', IMPACT_COLORS[d.impact])}
                  >
                    <span className="font-medium">{d.factor}</span>
                    <span className="font-bold ml-2 whitespace-nowrap">{d.value}</span>
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
          <h2 className="text-base font-semibold text-white">Recent Social Posts</h2>
          <span className="text-xs text-slate-500">{posts.length} posts</span>
        </div>
        {posts.length === 0 ? (
          <div className="text-slate-500 text-sm text-center py-8">
            No posts found. Run the seed script to populate data.
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
