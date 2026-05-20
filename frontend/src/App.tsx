import React, { useState } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import {
  Activity, PlayCircle, Bell, FlaskConical, TrendingUp, Menu, X
} from 'lucide-react'
import MarketPulse from './pages/MarketPulse'
import EventReplay from './pages/EventReplay'
import AlertCenter from './pages/AlertCenter'
import ScenarioLab from './pages/ScenarioLab'

const NAV_ITEMS = [
  { to: '/', icon: Activity, label: 'Market Pulse' },
  { to: '/replay', icon: PlayCircle, label: 'Event Replay' },
  { to: '/alerts', icon: Bell, label: 'Alert Center' },
  { to: '/scenario', icon: FlaskConical, label: 'Scenario Lab' },
]

function getRiskColor(path: string): string {
  return 'from-slate-900 to-slate-800'
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
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
          fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 border-r border-slate-700/60
          flex flex-col transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/60">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-900/30">
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">GME Intel</div>
            <div className="text-slate-400 text-xs">Social Trading Platform</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-700/60">
          <div className="text-xs text-slate-500 leading-relaxed">
            Based on the GameStop 2021 case study. Educational purposes only.
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-700/60">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-green-500" />
            <span className="font-semibold text-sm text-white">GME Intel</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
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
