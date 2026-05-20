import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PlayCircle, ChevronLeft, ChevronRight, Calendar, Newspaper, MessageSquare, TrendingUp, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import { replayApi, ReplayTimeline, ReplayEvent } from '../api/client'
import TimelineChart from '../components/TimelineChart'
import PostCard from '../components/PostCard'

const EVENT_TYPE_STYLES: Record<string, string> = {
  market_event: 'bg-blue-900/30 border-blue-700/50 text-blue-400',
  social_event: 'bg-purple-900/30 border-purple-700/50 text-purple-400',
  regulation_event: 'bg-red-900/30 border-red-700/50 text-red-400',
}

const EVENT_TYPE_ICONS: Record<string, React.ElementType> = {
  market_event: TrendingUp,
  social_event: MessageSquare,
  regulation_event: AlertTriangle,
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  market_event: 'Market',
  social_event: 'Social',
  regulation_event: 'Regulation',
}

function EventCard({ event, isActive }: { event: ReplayEvent; isActive: boolean }) {
  const Icon = EVENT_TYPE_ICONS[event.event_type] ?? Newspaper
  const style = EVENT_TYPE_STYLES[event.event_type] ?? 'bg-slate-700/30 border-slate-600/50 text-slate-400'

  return (
    <div
      className={clsx(
        'border rounded-xl p-4 transition-all duration-200',
        style,
        isActive ? 'ring-2 ring-white/20 shadow-lg' : 'opacity-70 hover:opacity-100'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium opacity-80">
              {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
            </span>
            <span className="text-xs opacity-60">
              {event.event_time.slice(0, 10)}
            </span>
          </div>
          <div className="font-semibold text-sm text-white leading-snug">{event.title}</div>
          {event.description && (
            <p className="text-xs mt-1.5 opacity-70 leading-relaxed line-clamp-3">{event.description}</p>
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

  // Find active events for current date
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

  // Mark lines for events
  const markLines = events.map(e => ({
    date: e.event_time.slice(0, 10),
    label: e.title.slice(0, 20) + '...',
    color: e.event_type === 'regulation_event' ? '#ef4444' :
           e.event_type === 'social_event' ? '#a855f7' : '#3b82f6',
  }))

  const handleSlider = (v: number) => {
    setSliderIndex(v)
    const date = timeline[v]?.date?.slice(0, 10)
    setSelectedDate(date ?? null)
  }

  const stepForward = () => {
    const next = Math.min(sliderIndex + 1, maxIndex)
    handleSlider(next)
  }

  const stepBack = () => {
    const prev = Math.max(sliderIndex - 1, 0)
    handleSlider(prev)
  }

  // Auto-play
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Event Replay</h1>
        <p className="text-slate-400 text-sm mt-0.5">Replay the GameStop Jan–Mar 2021 timeline day by day</p>
      </div>

      {replayQuery.isError && (
        <div className="card border-yellow-700/50 bg-yellow-900/10 text-yellow-400 text-sm">
          Could not load replay data. Make sure the backend and seed script have been run.
        </div>
      )}

      {/* Timeline chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-white">GME Price + Social Volume Timeline</h2>
            <p className="text-xs text-slate-400 mt-0.5">Drag to explore — vertical lines mark key events</p>
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

        {/* Playback controls */}
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
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPlaying(p => !p)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  playing ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white'
                )}
              >
                <PlayCircle size={15} />
                {playing ? 'Pause' : 'Play'}
              </button>
              <button
                onClick={stepForward}
                className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <span className="text-xs text-slate-500">{timeline[maxIndex]?.date?.slice(0, 10)}</span>
          </div>
        </div>
      </div>

      {/* Current snapshot */}
      {currentPoint && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card text-center">
            <div className="text-xs text-slate-400 mb-1">Price</div>
            <div className="text-xl font-bold text-green-400">
              {currentPoint.close_price != null ? `$${currentPoint.close_price.toFixed(2)}` : '—'}
            </div>
          </div>
          <div className="card text-center">
            <div className="text-xs text-slate-400 mb-1">Social Posts</div>
            <div className="text-xl font-bold text-purple-400">
              {currentPoint.post_count.toLocaleString()}
            </div>
          </div>
          <div className="card text-center">
            <div className="text-xs text-slate-400 mb-1">Hype Score</div>
            <div className="text-xl font-bold text-orange-400">
              {(currentPoint.avg_hype_score * 100).toFixed(0)}%
            </div>
          </div>
          <div className="card text-center">
            <div className="text-xs text-slate-400 mb-1">Risk Score</div>
            <div className="text-xl font-bold" style={{ color: riskColor }}>
              {currentPoint.risk_score.toFixed(1)}/10
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event log */}
        <div className="card">
          <h2 className="text-base font-semibold text-white mb-3">
            Key Events (up to {currentDate ?? '—'})
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {activeEvents.length === 0 ? (
              <div className="text-slate-500 text-sm text-center py-8">
                Slide the timeline to reveal events
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

        {/* Posts on selected day */}
        <div className="card">
          <h2 className="text-base font-semibold text-white mb-3">
            Posts on {selectedDate ?? '—'}
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {!selectedDate ? (
              <div className="text-slate-500 text-sm text-center py-8">
                Select a date to see posts
              </div>
            ) : postsQuery.isLoading ? (
              <div className="text-slate-500 text-sm text-center py-8 animate-pulse">Loading posts...</div>
            ) : (postsQuery.data ?? []).length === 0 ? (
              <div className="text-slate-500 text-sm text-center py-8">No posts on this date</div>
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
