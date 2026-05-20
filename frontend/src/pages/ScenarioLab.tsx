import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FlaskConical, Play, Clock, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import clsx from 'clsx'
import { scenarioApi, ScenarioResult, ScenarioHistoryItem } from '../api/client'
import RiskMeter from '../components/RiskMeter'

interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format?: (v: number) => string
  description?: string
}

function SliderField({ label, value, min, max, step, onChange, format, description }: SliderFieldProps) {
  const displayValue = format ? format(value) : value.toFixed(2)
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span className="text-sm font-bold text-white">{displayValue}</span>
      </div>
      {description && <div className="text-xs text-slate-500">{description}</div>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-green-500"
        style={{
          background: `linear-gradient(to right, #22c55e ${pct}%, #334155 ${pct}%)`,
        }}
      />
      <div className="flex justify-between text-xs text-slate-600">
        <span>{format ? format(min) : min}</span>
        <span>{format ? format(max) : max}</span>
      </div>
    </div>
  )
}

function ToggleField({ label, value, onChange, description }: {
  label: string; value: boolean; onChange: (v: boolean) => void; description?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-medium text-slate-300">{label}</div>
        {description && <div className="text-xs text-slate-500 mt-0.5">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={clsx(
          'relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200',
          value ? 'bg-green-600' : 'bg-slate-600'
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
            value ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  )
}

const RISK_COLORS: Record<string, string> = {
  Normal: '#22c55e',
  HeatingUp: '#eab308',
  SqueezeRisk: '#f97316',
  ReversalRisk: '#ef4444',
}

function RadarChart({ result }: { result: ScenarioResult }) {
  const drivers = result.drivers ?? []

  // Build radar dimensions from top drivers
  const indicators = [
    { name: 'Social Mentions', max: 10 },
    { name: 'Hype Score', max: 10 },
    { name: 'Bullish Ratio', max: 10 },
    { name: 'Volume Anomaly', max: 10 },
    { name: 'Volatility', max: 10 },
    { name: 'Coordination', max: 10 },
  ]

  // Map driver points to radar values
  const driverMap: Record<string, number> = {}
  drivers.forEach(d => {
    if (d.factor.toLowerCase().includes('mention') || d.factor.toLowerCase().includes('social')) {
      driverMap['Social Mentions'] = (driverMap['Social Mentions'] ?? 0) + d.points * 2
    } else if (d.factor.toLowerCase().includes('hype')) {
      driverMap['Hype Score'] = (driverMap['Hype Score'] ?? 0) + d.points * 2
    } else if (d.factor.toLowerCase().includes('bullish')) {
      driverMap['Bullish Ratio'] = (driverMap['Bullish Ratio'] ?? 0) + d.points * 2
    } else if (d.factor.toLowerCase().includes('volume')) {
      driverMap['Volume Anomaly'] = (driverMap['Volume Anomaly'] ?? 0) + d.points * 2
    } else if (d.factor.toLowerCase().includes('volat')) {
      driverMap['Volatility'] = (driverMap['Volatility'] ?? 0) + d.points * 2
    } else if (d.factor.toLowerCase().includes('coord')) {
      driverMap['Coordination'] = (driverMap['Coordination'] ?? 0) + d.points * 2
    }
  })

  const color = RISK_COLORS[result.label] ?? '#22c55e'
  const values = indicators.map(ind => Math.min(driverMap[ind.name] ?? 0, 10))

  const option = {
    backgroundColor: 'transparent',
    radar: {
      indicator: indicators,
      shape: 'polygon',
      splitNumber: 5,
      axisName: { color: '#94a3b8', fontSize: 11 },
      splitLine: { lineStyle: { color: '#1e293b' } },
      splitArea: { areaStyle: { color: ['#0f172a10', '#1e293b20'] } },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: values,
            name: result.label,
            areaStyle: { color: color + '30' },
            lineStyle: { color, width: 2 },
            itemStyle: { color },
          },
        ],
        symbol: 'circle',
        symbolSize: 5,
      },
    ],
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
  }

  return (
    <ReactECharts
      option={option}
      style={{ width: '100%', height: 280 }}
      opts={{ renderer: 'canvas' }}
    />
  )
}

function HistoryItem({ run }: { run: ScenarioHistoryItem }) {
  const [open, setOpen] = useState(false)
  const color = RISK_COLORS[run.output_label] ?? '#22c55e'
  const params = run.input_params as Record<string, unknown>

  return (
    <div className="border border-slate-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 hover:bg-slate-800 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="text-lg font-bold" style={{ color }}>
            {run.output_score.toFixed(1)}
          </div>
          <div>
            <div className="text-sm font-medium text-white">{run.output_label}</div>
            <div className="text-xs text-slate-500">{run.ticker} · {new Date(run.created_at).toLocaleString()}</div>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 py-3 bg-slate-800/30 border-t border-slate-700/50 space-y-2">
          <div className="text-xs text-slate-300 leading-relaxed">{run.output_explanation}</div>
          <div className="grid grid-cols-2 gap-1 text-xs text-slate-400">
            {params && Object.entries(params).map(([k, v]) => (
              k !== 'ticker' && k !== 'user_id' && (
                <div key={k} className="flex justify-between">
                  <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="text-slate-300">{String(v)}</span>
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const GME_2021_PEAK = {
  mention_growth: 8.0,
  bullish_ratio: 0.93,
  hype_score: 0.95,
  short_interest: 1.40,
  influencer_posts: 8,
  trading_restricted: true,
  options_activity_high: true,
}

const BASELINE = {
  mention_growth: 1.0,
  bullish_ratio: 0.50,
  hype_score: 0.30,
  short_interest: 0.10,
  influencer_posts: 0,
  trading_restricted: false,
  options_activity_high: false,
}

export default function ScenarioLab() {
  const [params, setParams] = useState({ ...BASELINE })
  const [result, setResult] = useState<ScenarioResult | null>(null)
  const queryClient = useQueryClient()

  const historyQuery = useQuery({
    queryKey: ['scenario-history'],
    queryFn: () => scenarioApi.getHistory('demo_user'),
    retry: false,
  })

  const runMutation = useMutation({
    mutationFn: () => scenarioApi.run({
      ...params,
      ticker: 'GME',
      user_id: 'demo_user',
    }),
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['scenario-history'] })
    },
  })

  const applyPreset = (preset: typeof BASELINE) => {
    setParams({ ...preset })
    setResult(null)
  }

  const history = historyQuery.data ?? []

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Scenario Lab</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Simulate social trading conditions and predict risk levels
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Controls panel */}
        <div className="xl:col-span-1 space-y-4">
          <div className="card">
            <h2 className="text-base font-semibold text-white mb-4">Scenario Parameters</h2>

            {/* Presets */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => applyPreset(BASELINE)}
                className="flex-1 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              >
                Baseline
              </button>
              <button
                onClick={() => applyPreset(GME_2021_PEAK)}
                className="flex-1 py-1.5 text-xs font-medium bg-red-900/40 hover:bg-red-900/60 text-red-400 border border-red-700/40 rounded-lg transition-colors"
              >
                GME Jan 27 '21
              </button>
            </div>

            <div className="space-y-5">
              <SliderField
                label="Social Mention Growth"
                value={params.mention_growth}
                min={0}
                max={10}
                step={0.1}
                onChange={v => setParams(p => ({ ...p, mention_growth: v }))}
                format={v => `${v.toFixed(1)}x`}
                description="Multiplier vs prior day baseline"
              />
              <SliderField
                label="Bullish Ratio"
                value={params.bullish_ratio}
                min={0}
                max={1}
                step={0.01}
                onChange={v => setParams(p => ({ ...p, bullish_ratio: v }))}
                format={v => `${(v * 100).toFixed(0)}%`}
                description="% of posts with bullish stance"
              />
              <SliderField
                label="Hype Score"
                value={params.hype_score}
                min={0}
                max={1}
                step={0.01}
                onChange={v => setParams(p => ({ ...p, hype_score: v }))}
                format={v => (v * 100).toFixed(0) + '%'}
                description="Average post hype intensity"
              />
              <SliderField
                label="Short Interest"
                value={params.short_interest}
                min={0}
                max={2}
                step={0.05}
                onChange={v => setParams(p => ({ ...p, short_interest: v }))}
                format={v => `${(v * 100).toFixed(0)}%`}
                description="% of float that is shorted"
              />
              <SliderField
                label="Influencer Posts"
                value={params.influencer_posts}
                min={0}
                max={20}
                step={1}
                onChange={v => setParams(p => ({ ...p, influencer_posts: v }))}
                format={v => String(v)}
                description="High-follower accounts posting"
              />
              <div className="space-y-3 pt-1 border-t border-slate-700">
                <ToggleField
                  label="Trading Restrictions Active"
                  value={params.trading_restricted}
                  onChange={v => setParams(p => ({ ...p, trading_restricted: v }))}
                  description="Broker halts buying (Robinhood effect)"
                />
                <ToggleField
                  label="High Options Activity"
                  value={params.options_activity_high}
                  onChange={v => setParams(p => ({ ...p, options_activity_high: v }))}
                  description="Gamma squeeze dynamics detected"
                />
              </div>
            </div>

            <button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
              className="mt-5 w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
            >
              <Play size={16} />
              {runMutation.isPending ? 'Running...' : 'Run Scenario'}
            </button>
          </div>
        </div>

        {/* Result panel */}
        <div className="xl:col-span-2 space-y-4">
          {!result ? (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <FlaskConical size={40} className="text-slate-600 mb-3" />
              <div className="text-slate-400 text-sm">
                Adjust the parameters and click <strong className="text-white">Run Scenario</strong> to see the risk assessment
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Try the "GME Jan 27 '21" preset to simulate peak conditions
              </div>
            </div>
          ) : (
            <>
              {/* Risk output */}
              <div className="card">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="flex-shrink-0">
                    <RiskMeter
                      score={Math.min(result.risk_score, 10)}
                      label={result.label}
                      size={220}
                    />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <div className="text-sm text-slate-400 mb-1">Risk Assessment</div>
                    <div
                      className="text-3xl font-bold mb-2"
                      style={{ color: RISK_COLORS[result.label] ?? '#22c55e' }}
                    >
                      {result.label}
                    </div>
                    <div className="text-slate-300 text-sm leading-relaxed">
                      {result.explanation}
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Rule Score: </span>
                        <span className="text-white font-semibold">{result.rule_score.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Final Score: </span>
                        <span className="text-white font-semibold">{result.risk_score.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drivers + Radar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="card">
                  <h2 className="text-base font-semibold text-white mb-3">Risk Drivers</h2>
                  {result.drivers.length === 0 ? (
                    <div className="text-slate-500 text-sm text-center py-4">No elevated risk factors</div>
                  ) : (
                    <div className="space-y-2">
                      {result.drivers.map((d, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-3 py-2 bg-slate-700/40 rounded-lg"
                        >
                          <span className="text-sm text-slate-300">{d.factor}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{d.value}</span>
                            <span className="text-xs font-bold text-white bg-slate-600 px-1.5 py-0.5 rounded">
                              +{d.points}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card">
                  <h2 className="text-base font-semibold text-white mb-1">Risk Profile Radar</h2>
                  <RadarChart result={result} />
                </div>
              </div>
            </>
          )}

          {/* History */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-slate-400" />
              <h2 className="text-base font-semibold text-white">Scenario History</h2>
              <span className="text-xs text-slate-500">({history.length} runs)</span>
            </div>
            {history.length === 0 ? (
              <div className="text-slate-500 text-sm text-center py-6">
                No scenario history yet. Run your first scenario above.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {history.map(run => (
                  <HistoryItem key={run.run_id} run={run} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
