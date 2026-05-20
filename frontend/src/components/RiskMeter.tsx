import React from 'react'
import ReactECharts from 'echarts-for-react'

interface RiskMeterProps {
  score: number
  label: string
  size?: number
}

const RISK_COLORS: Record<string, string> = {
  Normal: '#22c55e',
  HeatingUp: '#eab308',
  SqueezeRisk: '#f97316',
  ReversalRisk: '#ef4444',
}

const RISK_LABELS: Record<string, string> = {
  Normal: 'Normal',
  HeatingUp: 'Heating Up',
  SqueezeRisk: 'Squeeze Risk',
  ReversalRisk: 'Reversal Risk',
}

export default function RiskMeter({ score, label, size = 220 }: RiskMeterProps) {
  const color = RISK_COLORS[label] ?? '#22c55e'
  const displayLabel = RISK_LABELS[label] ?? label
  const normalizedScore = Math.min(Math.max(score, 0), 10)

  const option = {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'gauge',
        center: ['50%', '65%'],
        radius: '90%',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 10,
        splitNumber: 5,
        itemStyle: {
          color: color,
          shadowColor: color + '80',
          shadowBlur: 10,
        },
        progress: {
          show: true,
          width: 14,
          roundCap: true,
        },
        pointer: {
          show: true,
          length: '55%',
          width: 5,
          itemStyle: { color },
        },
        axisLine: {
          lineStyle: {
            width: 14,
            color: [[1, '#1e293b']],
          },
        },
        axisTick: {
          distance: -22,
          splitNumber: 5,
          lineStyle: {
            width: 1,
            color: '#475569',
          },
        },
        splitLine: {
          distance: -28,
          length: 10,
          lineStyle: {
            width: 2,
            color: '#475569',
          },
        },
        axisLabel: {
          distance: -45,
          color: '#64748b',
          fontSize: 11,
          formatter: (v: number) => String(v),
        },
        anchor: {
          show: false,
        },
        title: {
          show: true,
          offsetCenter: [0, '20%'],
          fontSize: 13,
          fontWeight: 600,
          color: color,
        },
        detail: {
          valueAnimation: true,
          width: '60%',
          lineHeight: 40,
          borderRadius: 8,
          offsetCenter: [0, '-15%'],
          fontSize: 28,
          fontWeight: 700,
          color: '#f1f5f9',
          formatter: (v: number) => v.toFixed(1),
        },
        data: [
          {
            value: normalizedScore,
            name: displayLabel,
          },
        ],
      },
    ],
  }

  return (
    <ReactECharts
      option={option}
      style={{ width: size, height: size }}
      opts={{ renderer: 'canvas' }}
    />
  )
}
