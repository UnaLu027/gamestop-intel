import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE
  ? import.meta.env.VITE_API_BASE
  : import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Types ──────────────────────────────────────────────────────────────────

export interface MarketSummary {
  ticker: string
  current_price: number | null
  price_change_pct: number | null
  volume: number | null
  social_volume: number
  risk_score: number
  risk_level: string
  bullish_ratio: number
  bearish_ratio: number
  avg_hype_score: number
  mention_growth_rate: number
}

export interface TimeseriesPoint {
  date: string
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
  post_count: number
  bullish_ratio: number
  avg_hype_score: number
  risk_score: number
  mention_growth_rate: number
}

export interface Driver {
  factor: string
  value: string
  impact: 'high' | 'medium' | 'low'
  points?: number
}

export interface PostItem {
  post_id: string
  platform: string
  author_id: string
  author_type: string
  content: string
  post_time: string
  likes: number
  stance: string
  hype_score: number
  post_type: string
}

export interface ReplayEvent {
  event_id: string
  event_time: string
  event_type: string
  title: string
  description: string | null
  source_type: string | null
}

export interface ReplayTimeline {
  date: string
  post_count: number
  bullish_ratio: number
  avg_hype_score: number
  mention_growth_rate: number
  risk_score: number
  close_price: number | null
  volume: number | null
  volatility: number | null
}

export interface AlertItem {
  alert_id: string
  ticker: string
  alert_time: string
  risk_level: string
  rule_score: number
  ml_score: number
  final_score: number
  trigger_summary: string | null
  explanation: string | null
  status: string
}

export interface WatchlistItem {
  watchlist_id: string
  ticker: string
  created_at: string
}

export interface ScenarioResult {
  run_id: string
  ticker: string
  risk_score: number
  label: string
  explanation: string
  drivers: Array<{ factor: string; points: number; value: string }>
  rule_score: number
}

export interface ScenarioHistoryItem {
  run_id: string
  ticker: string
  output_score: number
  output_label: string
  output_explanation: string
  created_at: string
  input_params: Record<string, unknown>
}

// ── Market API ─────────────────────────────────────────────────────────────

export const marketApi = {
  getSummary: (ticker: string) =>
    apiClient.get<MarketSummary>(`market/${ticker}/summary`).then(r => r.data),

  getTimeseries: (ticker: string, days = 30) =>
    apiClient.get<TimeseriesPoint[]>(`market/${ticker}/timeseries`, { params: { days } }).then(r => r.data),

  getDrivers: (ticker: string) =>
    apiClient.get<{ drivers: Driver[]; ticker: string; risk_score: number }>(`market/${ticker}/drivers`).then(r => r.data),

  getPosts: (ticker: string, limit = 20) =>
    apiClient.get<PostItem[]>(`market/${ticker}/posts`, { params: { limit } }).then(r => r.data),
}

// ── Replay API ─────────────────────────────────────────────────────────────

export const replayApi = {
  getReplay: (ticker: string) =>
    apiClient.get<{ ticker: string; timeline: ReplayTimeline[]; events: ReplayEvent[] }>(`replay/${ticker}`).then(r => r.data),

  getEvents: (ticker: string) =>
    apiClient.get<ReplayEvent[]>(`replay/${ticker}/events`).then(r => r.data),

  getPostsByDate: (ticker: string, date: string) =>
    apiClient.get<PostItem[]>(`replay/${ticker}/posts`, { params: { date } }).then(r => r.data),
}

// ── Alerts API ─────────────────────────────────────────────────────────────

export const alertsApi = {
  getAlerts: (userId = 'demo_user') =>
    apiClient.get<{ alerts: AlertItem[]; watchlist: WatchlistItem[] }>('alerts', { params: { user_id: userId } }).then(r => r.data),

  addWatchlist: (userId: string, ticker: string) =>
    apiClient.post('alerts/watchlist', { user_id: userId, ticker }).then(r => r.data),

  removeWatchlist: (watchlistId: string) =>
    apiClient.delete(`alerts/watchlist/${watchlistId}`).then(r => r.data),

  getHistory: (ticker: string) =>
    apiClient.get<AlertItem[]>('alerts/history', { params: { ticker } }).then(r => r.data),
}

// ── Scenario API ───────────────────────────────────────────────────────────

export interface ScenarioRequest {
  ticker?: string
  user_id?: string
  mention_growth: number
  bullish_ratio: number
  hype_score: number
  short_interest: number
  influencer_posts: number
  trading_restricted: boolean
  options_activity_high: boolean
}

export const scenarioApi = {
  run: (params: ScenarioRequest) =>
    apiClient.post<ScenarioResult>('scenario/run', { ticker: 'GME', user_id: 'demo_user', ...params }).then(r => r.data),

  getHistory: (userId = 'demo_user') =>
    apiClient.get<ScenarioHistoryItem[]>('scenario/history', { params: { user_id: userId } }).then(r => r.data),
}
