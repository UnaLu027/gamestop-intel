import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Calendar, ChevronLeft, ChevronRight, MessageSquare, Newspaper, PlayCircle, TrendingUp } from 'lucide-react'
import clsx from 'clsx'
import { replayApi, ReplayEvent, ReplayTimeline } from '../api/client'
import TimelineChart from '../components/TimelineChart'
import PostCard from '../components/PostCard'
import { EVENT_TYPE_LABEL_ZH, eventDescriptionZh, eventTitleZh } from '../i18n'

const EVENT_TYPE_STYLES: Record<string, string> = {
  market_event: 'bg-blue-900/30 border-blue-700/50 text-blue-400',
  social_event: 'bg-sky-900/30 border-sky-700/50 text-sky-300',
  regulation_event: 'bg-red-900/30 border-red-700/50 text-red-400',
}

const EVENT_TYPE_ICONS: Record<string, React.ElementType> = {
  market_event: TrendingUp,
  social_event: MessageSquare,
  regulation_event: AlertTriangle,
}

function EventCard({ event, isActive }: { event: ReplayEvent; isActive: boolean }) {
  const Icon = EVENT_TYPE_ICONS[event.event_type] ?? Newspaper
  const style = EVENT_TYPE_STYLES[event.event_type] ?? 'bg-slate-700/30 border-slate-600/50 text-slate-400'

  return (
    <div
      className={clsx(
        'border rounded-lg p-4 transition-all duration-200',
        style,
        isActive ? 'ring-1 ring-teal-300/30' : 'opacity-70 hover:opacity-100'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium opacity-80">
              {EVENT_TYPE_LABEL_ZH[event.event_type] ?? event.event_type}
            </span>
            <span className="text-xs opacity-60">{event.event_time.slice(0, 10)}</span>
          </div>
          <div className="font-semibold text-sm text-white leading-snug">
            {eventTitleZh(event.title)}
          </div>
          {event.description && (
            <p className="text-xs mt-1.5 opacity-70 leading-relaxed line-clamp-3">
              {eventDescriptionZh(event.title, event.description)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EventReplay() {
  const [ticker] = useState('GME')
  const [sliderIndex, setSliderIndex] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)

  const replayQuery = useQuery({
    queryKey: ['replay', ticker],
    queryFn: () => replayApi.getReplay(ticker),
    retry: false,
  })

  const postsQuery = useQuery({
    queryKey: ['replay-posts', ticker, selectedDate],
    queryFn: () => selectedDate ? replayApi.getPostsByDate(ticker, selectedDate) : Promise.resolve([]),
    enabled: !!selectedDate,
    retry: false,
  })

  const timeline: ReplayTimeline[] = replayQuery.data?.timeline ?? []
  const events: ReplayEvent[] = replayQuery.data?.events ?? []
  const maxIndex = Math.max(0, timeline.length - 1)
  const currentPoint = timeline[sliderIndex]
  const currentDate = currentPoint?.date?.slice(0, 10) ?? null

  const activeEvents = useMemo(() => {
    if (!currentDate) return []
    return events.filter(e => e.event_time.slice(0, 10) <= currentDate)
  }, [events, currentDate])

  const mostRecentEvent = activeEvents[activeEvents.length - 1] ?? null

  const chartData = timeline.slice(0, sliderIndex + 1).map(t => ({
    date: t.date,
    price: t.close_price,
    postCount: t.post_count,
    hypeScore: t.avg_hype_score,
    riskScore: t.risk_score,
  }))

  const markLines = events.map(e => ({
    date: e.event_time.slice(0, 10),
    label: `${eventTitleZh(e.title).slice(0, 12)}...`,
    color: e.event_type === 'regulation_event' ? '#ef4444' :
           e.event_type === 'social_event' ? '#38bdf8' : '#3b82f6',
  }))

  const handleSlider = (v: number) => {
    setSliderIndex(v)
    const date = timeline[v]?.date?.slice(0, 10)
    setSelectedDate(date ?? null)
  }

  const stepForward = () => handleSlider(Math.min(sliderIndex + 1, maxIndex))
  const stepBack = () => handleSlider(Math.max(sliderIndex - 1, 0))

  React.useEffect(() => {
    if (!playing) return
    const iv = setInterval(() => {
      setSliderIndex(i => {
        if (i >= maxIndex) {
          setPlaying(false)
          return i
        }
        const next = i + 1
        setSelectedDate(timeline[next]?.date?.slice(0, 10) ?? null)
        return next
      })
    }, 600)
    return () => clearInterval(iv)
  }, [playing, maxIndex, timeline])

  const riskColor = currentPoint?.risk_score != null
    ? currentPoint.risk_score >= 7 ? '#ef4444'
    : currentPoint.risk_score >= 5 ? '#f97316'
    : currentPoint.risk_score >= 3 ? '#eab308'
    : '#22c55e'
    : '#22c55e'

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
          <div className="section-kicker mb-2">Event Replay</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">事件回放</h1>
          <p className="text-slate-500 text-sm mt-0.5">
          逐日回放 GameStop 2021 年一月至三月的社群聲量、風險變化與關鍵事件。
        </p>
      </div>

      {replayQuery.isError && (
        <div className="card border-yellow-700/50 bg-yellow-900/10 text-yellow-400 text-sm">
          無法載入事件回放資料。請確認後端服務與展示資料已準備完成。
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-white">GME 股價與社群聲量時間軸</h2>
            <p className="text-xs text-slate-400 mt-0.5">拖曳時間軸探索事件，垂直線代表關鍵節點。</p>
          </div>
          {currentDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-slate-400" />
              <span className="font-mono text-slate-300">{currentDate}</span>
            </div>
          )}
        </div>
        <TimelineChart
          data={chartData}
          height={320}
          showPrice
          showVolume={false}
          showSocial
          showRisk
          markLines={markLines}
        />

        <div className="mt-4 space-y-3">
          <input
            type="range"
            min={0}
            max={maxIndex}
            value={sliderIndex}
            onChange={e => handleSlider(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-green-500"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{timeline[0]?.date?.slice(0, 10)}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={stepBack}
                className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                aria-label="上一天"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPlaying(p => !p)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  playing ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-teal-700 hover:bg-teal-600 text-white'
                )}
              >
                <PlayCircle size={15} />
                {playing ? '暫停' : '播放'}
              </button>
              <button
                onClick={stepForward}
                className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                aria-label="下一天"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <span className="text-xs text-slate-500">{timeline[maxIndex]?.date?.slice(0, 10)}</span>
          </div>
        </div>
      </div>

      {currentPoint && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card text-center">
            <div className="text-xs text-slate-400 mb-1">股價</div>
            <div className="text-xl font-bold text-teal-300">
              {currentPoint.close_price != null ? `$${currentPoint.close_price.toFixed(2)}` : '-'}
            </div>
          </div>
          <div className="card text-center">
            <div className="text-xs text-slate-400 mb-1">社群貼文</div>
            <div className="text-xl font-bold text-sky-300">
              {currentPoint.post_count.toLocaleString()}
            </div>
          </div>
          <div className="card text-center">
            <div className="text-xs text-slate-400 mb-1">炒作熱度</div>
            <div className="text-xl font-bold text-orange-400">
              {(currentPoint.avg_hype_score * 100).toFixed(0)}%
            </div>
          </div>
          <div className="card text-center">
            <div className="text-xs text-slate-400 mb-1">風險分數</div>
            <div className="text-xl font-bold" style={{ color: riskColor }}>
              {currentPoint.risk_score.toFixed(1)}/10
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-base font-semibold text-white mb-3">
            關鍵事件（截至 {currentDate ?? '尚未選取'}）
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {activeEvents.length === 0 ? (
              <div className="text-slate-500 text-sm text-center py-8">
                拖曳時間軸以顯示事件
              </div>
            ) : (
              [...activeEvents].reverse().map(ev => (
                <EventCard
                  key={ev.event_id}
                  event={ev}
                  isActive={ev === mostRecentEvent}
                />
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-white mb-3">
            {selectedDate ?? '尚未選取日期'} 的社群貼文
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {!selectedDate ? (
              <div className="text-slate-500 text-sm text-center py-8">
                選擇日期後可查看當日貼文
              </div>
            ) : postsQuery.isLoading ? (
              <div className="text-slate-500 text-sm text-center py-8 animate-pulse">貼文載入中...</div>
            ) : (postsQuery.data ?? []).length === 0 ? (
              <div className="text-slate-500 text-sm text-center py-8">此日期沒有貼文</div>
            ) : (
              (postsQuery.data ?? []).map(post => (
                <PostCard key={post.post_id} post={post} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
