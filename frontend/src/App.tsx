import React, { useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import {
  Activity, PlayCircle, Bell, FlaskConical, TrendingUp, Menu, Search, ShieldCheck,
  CalendarDays, Download, UserCircle2
} from 'lucide-react'
import MarketPulse from './pages/MarketPulse'
import EventReplay from './pages/EventReplay'
import AlertCenter from './pages/AlertCenter'
import ScenarioLab from './pages/ScenarioLab'

const NAV_ITEMS = [
  { to: '/', icon: Activity, label: '市場脈動' },
  { to: '/replay', icon: PlayCircle, label: '事件回放' },
  { to: '/alerts', icon: Bell, label: '風險警示' },
  { to: '/scenario', icon: FlaskConical, label: '情境模擬' },
]

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#080d14] text-slate-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30 w-[17.5rem] bg-[#09111d] border-r border-slate-700/50
          flex flex-col transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-950 border border-teal-700/50 flex items-center justify-center">
              <TrendingUp size={18} className="text-teal-300" />
            </div>
            <div>
              <div className="font-bold text-white text-sm leading-tight tracking-wide">GME Intel</div>
              <div className="text-slate-500 text-xs">社群交易風險分析平台</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="card-compact">
              <div className="text-slate-500">案例資產</div>
              <div className="finance-number text-slate-100 mt-0.5">GME</div>
            </div>
            <div className="card-compact">
              <div className="text-slate-500">資料期間</div>
              <div className="finance-number text-slate-100 mt-0.5">2021 Q1</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            Analytics
          </div>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-teal-500/10 text-teal-200 border border-teal-600/30'
                    : 'text-slate-500 hover:bg-slate-800/70 hover:text-slate-200'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-700/50">
          <div className="flex items-center gap-2 text-xs text-teal-200 mb-2">
            <span className="status-dot" />
            教育展示模式
          </div>
          <div className="text-xs text-slate-500 leading-relaxed">
            以 GameStop 2021 事件為案例，僅供教學與研究展示使用。
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#09111d] border-b border-slate-700/50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-teal-300" />
            <span className="font-semibold text-sm text-white">GME Intel</span>
          </div>
        </header>

        <header className="hidden lg:flex items-center justify-between px-6 py-3 bg-[#0a111d]/95 border-b border-slate-700/50">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-[0.18em]">Social Trading Intelligence</div>
            <div className="text-sm text-slate-300">GameStop 社群驅動交易風險分析</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden xl:flex toolbar-chip">
              <Search size={14} />
              <span>GME / 2021 Case Replay</span>
            </div>
            <div className="toolbar-chip">
              <CalendarDays size={14} />
              <span>60D Window</span>
            </div>
            <button className="toolbar-chip hover:border-slate-500 hover:text-white transition-colors">
              <Download size={14} />
              <span>匯出</span>
            </button>
            <div className="flex items-center gap-2 rounded-lg bg-teal-500/10 border border-teal-700/40 px-3 py-2 text-xs text-teal-200">
              <ShieldCheck size={14} />
              <span>教育展示模式</span>
            </div>
            <div className="toolbar-chip px-2.5">
              <UserCircle2 size={16} />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[#080d14]">
          <Routes>
            <Route path="/" element={<MarketPulse />} />
            <Route path="/replay" element={<EventReplay />} />
            <Route path="/alerts" element={<AlertCenter />} />
            <Route path="/scenario" element={<ScenarioLab />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
