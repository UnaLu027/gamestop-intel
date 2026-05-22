import React from 'react'
import ReactECharts from 'echarts-for-react'

export interface TimelineChartDataPoint {
  date: string
  price?: number | null
  volume?: number | null
  postCount?: number
  hypeScore?: number
  riskScore?: number
  bullishRatio?: number
  mentionGrowth?: number
}

interface TimelineChartProps {
  data: TimelineChartDataPoint[]
  height?: number
  showPrice?: boolean
  showVolume?: boolean
  showSocial?: boolean
  showRisk?: boolean
  markLines?: Array<{ date: string; label: string; color?: string }>
}

export default function TimelineChart({
  data,
  height = 380,
  showPrice = true,
  showVolume = true,
  showSocial = true,
  showRisk = false,
  markLines = [],
}: TimelineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-slate-500 text-sm"
      >
        目前沒有可顯示的資料
      </div>
    )
  }

  const dates = data.map(d => d.date.slice(0, 10))

  const markLineData = markLines.map(ml => ({
    xAxis: ml.date,
    label: {
      formatter: ml.label,
      color: ml.color ?? '#f97316',
      fontSize: 10,
    },
    lineStyle: {
      color: ml.color ?? '#f97316',
      type: 'dashed',
      width: 1.5,
    },
  }))

  const series: echarts.SeriesOption[] = []
  const yAxes: any[] = []
  let yIndex = 0

  if (showPrice) {
    yAxes.push({
      type: 'value',
      name: '股價 ($)',
      position: 'left',
      nameTextStyle: { color: '#64748b', fontSize: 11 },
      axisLabel: { color: '#64748b', fontSize: 10, formatter: '${value}' },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLine: { lineStyle: { color: '#334155' } },
    })
    series.push({
      name: '股價',
      type: 'line',
      yAxisIndex: yIndex,
      data: data.map(d => d.price ?? null),
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#14b8a6', width: 2.5 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#14b8a640' },
            { offset: 1, color: '#14b8a605' },
          ],
        },
      },
      markLine: markLines.length > 0 ? {
        silent: true,
        data: markLineData,
        symbol: ['none', 'none'],
      } : undefined,
    } as echarts.SeriesOption)
    yIndex++
  }

  if (showVolume) {
    yAxes.push({
      type: 'value',
      name: '成交量',
      position: showPrice ? 'right' : 'left',
      nameTextStyle: { color: '#64748b', fontSize: 11 },
      axisLabel: {
        color: '#64748b', fontSize: 10,
        formatter: (v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : String(v),
      },
      splitLine: { show: false },
      axisLine: { lineStyle: { color: '#334155' } },
    })
    series.push({
      name: '成交量',
      type: 'bar',
      yAxisIndex: yIndex,
      data: data.map(d => d.volume ?? null),
      itemStyle: { color: '#3b82f620', borderRadius: [2, 2, 0, 0] },
      barMaxWidth: 8,
    } as echarts.SeriesOption)
    yIndex++
  }

  if (showSocial) {
    yAxes.push({
      type: 'value',
      name: '社群聲量',
      position: showPrice && showVolume ? 'right' : (showPrice || showVolume ? 'right' : 'left'),
      offset: showPrice && showVolume ? 70 : 0,
      nameTextStyle: { color: '#64748b', fontSize: 11 },
      axisLabel: { color: '#64748b', fontSize: 10 },
      splitLine: { show: false },
      axisLine: { lineStyle: { color: '#334155' } },
    })
    series.push({
      name: '社群貼文',
      type: 'line',
      yAxisIndex: yIndex,
      data: data.map(d => d.postCount ?? null),
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#3b82f6', width: 2 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#3b82f640' },
            { offset: 1, color: '#3b82f605' },
          ],
        },
      },
    } as echarts.SeriesOption)
    series.push({
      name: '炒作熱度',
      type: 'line',
      yAxisIndex: yIndex,
      data: data.map(d => d.hypeScore != null ? d.hypeScore * 1000 : null),
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#d97706', width: 1.5, type: 'dashed' },
    } as echarts.SeriesOption)
    yIndex++
  }

  if (showRisk) {
    yAxes.push({
      type: 'value',
      name: '風險分數',
      min: 0,
      max: 10,
      position: 'right',
      nameTextStyle: { color: '#64748b', fontSize: 11 },
      axisLabel: { color: '#64748b', fontSize: 10 },
      splitLine: { show: false },
      axisLine: { lineStyle: { color: '#334155' } },
    })
    series.push({
      name: '風險分數',
      type: 'line',
      yAxisIndex: yIndex,
      data: data.map(d => d.riskScore ?? null),
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#dc2626', width: 2 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#dc262640' },
            { offset: 1, color: '#dc262605' },
          ],
        },
      },
    } as echarts.SeriesOption)
  }

  const option = {
    backgroundColor: 'transparent',
    grid: { left: 55, right: showPrice && showVolume ? 120 : 60, top: 30, bottom: 60 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      axisPointer: { type: 'cross', lineStyle: { color: '#475569' } },
    },
    legend: {
      bottom: 0,
      textStyle: { color: '#64748b', fontSize: 11 },
      icon: 'roundRect',
      itemWidth: 14,
      itemHeight: 4,
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
      },
      {
        type: 'slider',
        height: 18,
        bottom: 30,
        borderColor: '#334155',
        backgroundColor: '#0f172a',
        dataBackground: { lineStyle: { color: '#475569' }, areaStyle: { color: '#1e293b' } },
        selectedDataBackground: { lineStyle: { color: '#14b8a6' }, areaStyle: { color: '#14b8a620' } },
        handleStyle: { color: '#475569' },
        textStyle: { color: '#64748b', fontSize: 10 },
      },
    ],
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { color: '#64748b', fontSize: 10, rotate: 30 },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: yAxes,
    series,
  }

  return (
    <ReactECharts
      option={option}
      style={{ width: '100%', height }}
      opts={{ renderer: 'canvas' }}
      notMerge
    />
  )
}
