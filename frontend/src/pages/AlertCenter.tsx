import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Plus, Trash2, AlertTriangle, CheckCircle, Clock, RefreshCw, Eye } from 'lucide-react'
import clsx from 'clsx'
import { alertsApi, AlertItem, WatchlistItem } from '../api/client'

const RISK_BADGE: Record<string, string> = {
  Normal: 'badge-normal',
  HeatingUp: 'badge-heating',
  SqueezeRisk: 'badge-squeeze',
  ReversalRisk: 'badge-reversal',
}

const RISK_BORDER: Record<string, string> = {
  Normal: 'border-green-700/30',
  HeatingUp: 'border-yellow-700/30',
  SqueezeRisk: 'border-orange-700/30',
  ReversalRisk: 'border-red-700/30',
}

const RISK_BG: Record<string, string> = {
  Normal: 'bg-green-900/10',
  HeatingUp: 'bg-yellow-900/10',
  SqueezeRisk: 'bg-orange-900/10',
  ReversalRisk: 'bg-red-900/10',
}

function AlertCard({ alert }: { alert: AlertItem }) {
  const [expanded, setExpanded] = useState(false)
  const badge = RISK_BADGE[alert.risk_level] ?? 'badge-normal'
  const border = RISK_BORDER[alert.risk_level] ?? 'border-slate-700'
  const bg = RISK_BG[alert.risk_level] ?? 'bg-slate-800'

  return (
    <div className={clsx('border rounded-xl p-4 transition-all duration-150', bg, border)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-0.5">
            {alert.risk_level === 'ReversalRisk' ? (
              <AlertTriangle size={18} className="text-red-400" />
            ) : alert.risk_level === 'SqueezeRisk' ? (
              <AlertTriangle size={18} className="text-orange-400" />
            ) : (
              <Bell size={18} className="text-yellow-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-white text-base">{alert.ticker}</span>
              <span className={clsx('text-xs', badge)}>
                {alert.risk_level}
              </span>
              <span className={clsx(
                'text-xs px-1.5 py-0.5 rounded',
                alert.status === 'active' ? 'bg-green-900/30 text-green-400' : 'bg-slate-700 text-slate-400'
              )}>
                {alert.status}
              </span>
            </div>
            <div className="text-xs text-slate-400 mb-2">
              {new Date(alert.alert_time).toLocaleString()}
            </div>
            {alert.trigger_summary && (
              <div className="text-xs text-slate-300 leading-relaxed mb-1">
                {alert.trigger_summary}
              </div>
            )}
            {expanded && alert.explanation && (
              <div className="mt-2 text-sm text-slate-200 leading-relaxed bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
                {alert.explanation}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="text-right">
            <div className="text-xs text-slate-500">Risk Score</div>
            <div className="text-lg font-bold text-white">{alert.final_score.toFixed(1)}</div>
          </div>
          {alert.explanation && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Eye size={12} />
              {expanded ? 'Less' : 'Details'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AlertCenter() {
  const [userId] = useState('demo_user')
  const [newTicker, setNewTicker] = useState('')
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const queryClient = useQueryClient()

  const alertsQuery = useQuery({
    queryKey: ['alerts', userId],
    queryFn: () => alertsApi.getAlerts(userId),
    refetchInterval: 60000,
    retry: false,
  })

  const addWatchlistMutation = useMutation({
    mutationFn: ({ ticker }: { ticker: string }) =>
      alertsApi.addWatchlist(userId, ticker),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', userId] })
      setNewTicker('')
    },
  })

  const removeWatchlistMutation = useMutation({
    mutationFn: (watchlistId: string) => alertsApi.removeWatchlist(watchlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', userId] })
    },
  })

  const alerts: AlertItem[] = alertsQuery.data?.alerts ?? []
  const watchlist: WatchlistItem[] = alertsQuery.data?.watchlist ?? []

  const filteredAlerts = filterLevel === 'all'
    ? alerts
    : alerts.filter(a => a.risk_level === filterLevel)

  const handleAddWatchlist = (e: React.FormEvent) => {
    e.preventDefault()
    if (newTicker.trim()) {
      addWatchlistMutation.mutate({ ticker: newTicker.trim().toUpperCase() })
    }
  }

  // Summary stats
  const criticalCount = alerts.filter(a => a.risk_level === 'ReversalRisk').length
  const squeezeCount = alerts.filter(a => a.risk_level === 'SqueezeRisk').length
  const heatingCount = alerts.filter(a => a.risk_level === 'HeatingUp').length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Alert Center</h1>
          <p className="text-slate-400 text-sm mt-0.5">Monitor your watchlist for risk signals</p>
        </div>
        <button
          onClick={() => alertsQuery.refetch()}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white text-sm transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {alertsQuery.isError && (
        <div className="card border-yellow-700/50 bg-yellow-900/10 text-yellow-400 text-sm">
          Could not load alerts. Make sure the backend is running and seed data has been loaded.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-white">{alerts.length}</div>
          <div className="text-xs text-slate-400 mt-1">Total Alerts</div>
        </div>
        <div className="card text-center border-red-800/30 bg-red-900/10">
          <div className="text-3xl font-bold text-red-400">{criticalCount}</div>
          <div className="text-xs text-slate-400 mt-1">Reversal Risk</div>
        </div>
        <div className="card text-center border-orange-800/30 bg-orange-900/10">
          <div className="text-3xl font-bold text-orange-400">{squeezeCount}</div>
          <div className="text-xs text-slate-400 mt-1">Squeeze Risk</div>
        </div>
        <div className="card text-center border-yellow-800/30 bg-yellow-900/10">
          <div className="text-3xl font-bold text-yellow-400">{heatingCount}</div>
          <div className="text-xs text-slate-400 mt-1">Heating Up</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Watchlist panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <h2 className="text-base font-semibold text-white mb-3">Watchlist</h2>

            {/* Add ticker */}
            <form onSubmit={handleAddWatchlist} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newTicker}
                onChange={e => setNewTicker(e.target.value.toUpperCase())}
                placeholder="Ticker (e.g. GME)"
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-600"
              />
              <button
                type="submit"
                disabled={addWatchlistMutation.isPending}
                className="p-2 bg-green-600 hover:bg-green-500 rounded-lg text-white transition-colors disabled:opacity-50"
              >
                <Plus size={16} />
              </button>
            </form>

            {watchlist.length === 0 ? (
              <div className="text-slate-500 text-sm text-center py-6">
                Add tickers to your watchlist to receive alerts
              </div>
            ) : (
              <div className="space-y-2">
                {watchlist.map(w => (
                  <div
                    key={w.watchlist_id}
                    className="flex items-center justify-between px-3 py-2.5 bg-slate-700/50 rounded-lg"
                  >
                    <div>
                      <span className="font-bold text-white">{w.ticker}</span>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Added {new Date(w.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => removeWatchlistMutation.mutate(w.watchlist_id)}
                      disabled={removeWatchlistMutation.isPending}
                      className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filter */}
          <div className="card">
            <h2 className="text-base font-semibold text-white mb-3">Filter Alerts</h2>
            <div className="space-y-1">
              {['all', 'ReversalRisk', 'SqueezeRisk', 'HeatingUp', 'Normal'].map(level => (
                <button
                  key={level}
                  onClick={() => setFilterLevel(level)}
                  className={clsx(
                    'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    filterLevel === level
                      ? 'bg-slate-600 text-white'
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                  )}
                >
                  {level === 'all' ? 'All Levels' : level}
                  <span className="float-right text-slate-500 text-xs font-normal">
                    {level === 'all' ? alerts.length : alerts.filter(a => a.risk_level === level).length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Alert feed */}
        <div className="lg:col-span-2">
          <div className="card h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">
                Alert Feed
                {filterLevel !== 'all' && (
                  <span className="ml-2 text-sm text-slate-400 font-normal">— {filterLevel}</span>
                )}
              </h2>
              <span className="text-xs text-slate-500">{filteredAlerts.length} alerts</span>
            </div>

            {alertsQuery.isLoading ? (
              <div className="text-center py-12 text-slate-500 animate-pulse">Loading alerts...</div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Bell size={32} className="mx-auto mb-3 opacity-30" />
                <div className="text-sm">
                  {watchlist.length === 0
                    ? 'Add tickers to your watchlist to see alerts here'
                    : 'No alerts matching the current filter'}
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredAlerts.map(alert => (
                  <AlertCard key={alert.alert_id} alert={alert} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
