import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Clock, FlaskConical, Play } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import clsx from 'clsx'
import { scenarioApi, ScenarioHistoryItem, ScenarioResult } from '../api/client'
import RiskMeter from '../components/RiskMeter'
import { driverLabelZh, formatTaiwanDateTime, riskLabelZh, scenarioExplanationZh } from '../i18n'

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
        style={{ background: `linear-gradient(to right, #14b8a6 ${pct}%, #334155 ${pct}%)` }}
      />
      <div className="flex justify-between text-xs text-slate-600">
        <span>{format ? format(min) : min}</span>
        <span>{format ? format(max) : max}</span>
      </div>
    </div>
  )
}

function ToggleField({ label, value, onChange, description }: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  description?: string
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
          value ? 'bg-teal-700' : 'bg-slate-600'
        )}
        aria-label={label}
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
  Normal: '#14b8a6',
  HeatingUp: '#d97706',
  SqueezeRisk: '#ea580c',
  ReversalRisk: '#dc2626',
}

const RADAR_INDICATORS = [
  { key: 'Social Mentions', name: '社群提及量', max: 10 },
  { key: 'Hype Score', name: '炒作熱度', max: 10 },
  { key: 'Bullish Ratio', name: '看多比例', max: 10 },
  { key: 'Volume Anomaly', name: '成交量異常', max: 10 },
  { key: 'Volatility', name: '波動程度', max: 10 },
  { key: 'Coordination', name: '協同程度', max: 10 },
]

function RadarChart({ result }: { result: ScenarioResult }) {
  const drivers = result.drivers ?? []
  const driverMap: Record<string, number> = {}

  drivers.forEach(d => {
    const factor = d.factor.toLowerCase()
    if (factor.includes('mention') || factor.includes('social')) {
      driverMap['Social Mentions'] = (driverMap['Social Mentions'] ?? 0) + d.points * 2
    } else if (factor.includes('hype')) {
      driverMap['Hype Score'] = (driverMap['Hype Score'] ?? 0) + d.points * 2
    } else if (factor.includes('bullish')) {
      driverMap['Bullish Ratio'] = (driverMap['Bullish Ratio'] ?? 0) + d.points * 2
    } else if (factor.includes('volume')) {
      driverMap['Volume Anomaly'] = (driverMap['Volume Anomaly'] ?? 0) + d.points * 2
    } else if (factor.includes('volat')) {
      driverMap['Volatility'] = (driverMap['Volatility'] ?? 0) + d.points * 2
    } else if (factor.includes('coord')) {
      driverMap['Coordination'] = (driverMap['Coordination'] ?? 0) + d.points * 2
    }
  })

  const color = RISK_COLORS[result.label] ?? '#22c55e'
  const values = RADAR_INDICATORS.map(ind => Math.min(driverMap[ind.key] ?? 0, 10))

  const option = {
    backgroundColor: 'transparent',
    radar: {
      indicator: RADAR_INDICATORS.map(({ name, max }) => ({ name, max })),
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
            name: riskLabelZh(result.label),
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

  return <ReactECharts option={option} style={{ width: '100%', height: 280 }} opts={{ renderer: 'canvas' }} />
}

function HistoryItem({ run }: { run: ScenarioHistoryItem }) {
  const [open, setOpen] = useState(false)
  const color = RISK_COLORS[run.output_label] ?? '#22c55e'
  const params = run.input_params as Record<string, unknown>

  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 hover:bg-slate-800 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="text-lg font-bold" style={{ color }}>
            {run.output_score.toFixed(1)}
          </div>
          <div>
            <div className="text-sm font-medium text-white">{riskLabelZh(run.output_label)}</div>
            <div className="text-xs text-slate-500">{run.ticker} / {formatTaiwanDateTime(run.created_at)}</div>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 py-3 bg-slate-800/30 border-t border-slate-700/50 space-y-2">
          <div className="text-xs text-slate-300 leading-relaxed">
            {scenarioExplanationZh(run.output_label, run.output_explanation)}
          </div>
          <div className="grid grid-cols-2 gap-1 text-xs text-slate-400">
            {params && Object.entries(params).map(([k, v]) => (
              k !== 'ticker' && k !== 'user_id' && (
                <div key={k} className="flex justify-between">
                  <span>{PARAM_LABEL_ZH[k] ?? k.replace(/_/g, ' ')}</span>
                  <span className="text-slate-300">{formatParamValue(k, v)}</span>
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const PARAM_LABEL_ZH: Record<string, string> = {
  mention_growth: '提及量成長',
  bullish_ratio: '看多比例',
  hype_score: '炒作熱度',
  short_interest: '放空比例',
  influencer_posts: '意見領袖貼文',
  trading_restricted: '交易限制',
  options_activity_high: '選擇權活躍',
}

function formatParamValue(key: string, value: unknown): string {
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'number' && ['bullish_ratio', 'hype_score', 'short_interest'].includes(key)) {
    return `${(value * 100).toFixed(0)}%`
  }
  if (typeof value === 'number' && key === 'mention_growth') return `${value.toFixed(1)}x`
  return String(value)
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
    mutationFn: () => scenarioApi.run({ ...params, ticker: 'GME', user_id: 'demo_user' }),
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
      <div>
        <div className="section-kicker mb-2">Scenario Lab</div>
        <h1 className="text-2xl font-bold text-white tracking-tight">情境模擬</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          調整社群與市場條件，觀察系統如何判斷異常交易風險。
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-4">
          <div className="card">
            <h2 className="text-base font-semibold text-white mb-4">情境參數</h2>
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => applyPreset(BASELINE)}
                className="flex-1 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              >
                基準情境
              </button>
              <button
                onClick={() => applyPreset(GME_2021_PEAK)}
                className="flex-1 py-1.5 text-xs font-medium bg-red-900/40 hover:bg-red-900/60 text-red-400 border border-red-700/40 rounded-lg transition-colors"
              >
                GME 2021 高峰
              </button>
            </div>

            <div className="space-y-5">
              <SliderField
                label="社群提及量成長"
                value={params.mention_growth}
                min={0}
                max={10}
                step={0.1}
                onChange={v => setParams(p => ({ ...p, mention_growth: v }))}
                format={v => `${v.toFixed(1)}x`}
                description="相對於前一日基準的倍數"
              />
              <SliderField
                label="看多比例"
                value={params.bullish_ratio}
                min={0}
                max={1}
                step={0.01}
                onChange={v => setParams(p => ({ ...p, bullish_ratio: v }))}
                format={v => `${(v * 100).toFixed(0)}%`}
                description="貼文中被判定為看多的比例"
              />
              <SliderField
                label="炒作熱度"
                value={params.hype_score}
                min={0}
                max={1}
                step={0.01}
                onChange={v => setParams(p => ({ ...p, hype_score: v }))}
                format={v => `${(v * 100).toFixed(0)}%`}
                description="貼文煽動、迷因與行動呼籲強度"
              />
              <SliderField
                label="放空比例"
                value={params.short_interest}
                min={0}
                max={2}
                step={0.05}
                onChange={v => setParams(p => ({ ...p, short_interest: v }))}
                format={v => `${(v * 100).toFixed(0)}%`}
                description="流通股中被放空的估計比例"
              />
              <SliderField
                label="意見領袖貼文數"
                value={params.influencer_posts}
                min={0}
                max={20}
                step={1}
                onChange={v => setParams(p => ({ ...p, influencer_posts: v }))}
                format={v => String(v)}
                description="高影響力帳號參與討論的數量"
              />
              <div className="space-y-3 pt-1 border-t border-slate-700">
                <ToggleField
                  label="交易限制啟動"
                  value={params.trading_restricted}
                  onChange={v => setParams(p => ({ ...p, trading_restricted: v }))}
                  description="券商限制買進時的市場壓力"
                />
                <ToggleField
                  label="選擇權活動異常"
                  value={params.options_activity_high}
                  onChange={v => setParams(p => ({ ...p, options_activity_high: v }))}
                  description="可能觸發 gamma squeeze 的選擇權活動"
                />
              </div>
            </div>

            <button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
              className="btn-primary mt-5 w-full flex items-center justify-center gap-2 py-3 disabled:opacity-60"
            >
              <Play size={16} />
              {runMutation.isPending ? '計算中...' : '執行情境'}
            </button>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-4">
          {!result ? (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <FlaskConical size={40} className="text-slate-600 mb-3" />
              <div className="text-slate-400 text-sm">
                調整參數後點擊 <strong className="text-white">執行情境</strong>，即可查看風險判斷結果。
              </div>
              <div className="mt-3 text-xs text-slate-500">
                可先使用「GME 2021 高峰」預設，模擬事件高點條件。
              </div>
            </div>
          ) : (
            <>
              <div className="card">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="flex-shrink-0">
                    <RiskMeter score={Math.min(result.risk_score, 10)} label={result.label} size={220} />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <div className="text-sm text-slate-400 mb-1">風險評估</div>
                    <div className="text-3xl font-bold mb-2" style={{ color: RISK_COLORS[result.label] ?? '#22c55e' }}>
                      {riskLabelZh(result.label)}
                    </div>
                    <div className="text-slate-300 text-sm leading-relaxed">
                      {scenarioExplanationZh(result.label, result.explanation)}
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">規則分數：</span>
                        <span className="text-white font-semibold">{result.rule_score.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">最終分數：</span>
                        <span className="text-white font-semibold">{result.risk_score.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="card">
                  <h2 className="text-base font-semibold text-white mb-3">風險成因</h2>
                  {result.drivers.length === 0 ? (
                    <div className="text-slate-500 text-sm text-center py-4">目前沒有升高的風險因子</div>
                  ) : (
                    <div className="space-y-2">
                      {result.drivers.map((d, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-700/40 rounded-lg">
                          <span className="text-sm text-slate-300">{driverLabelZh(d.factor)}</span>
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
                  <h2 className="text-base font-semibold text-white mb-1">風險雷達圖</h2>
                  <RadarChart result={result} />
                </div>
              </div>
            </>
          )}

          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-slate-400" />
              <h2 className="text-base font-semibold text-white">情境歷史</h2>
              <span className="text-xs text-slate-500">（{history.length} 筆）</span>
            </div>
            {history.length === 0 ? (
              <div className="text-slate-500 text-sm text-center py-6">
                尚無情境紀錄，請先執行一次模擬。
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
