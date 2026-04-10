import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout/Layout'
import { Dashboard } from './components/Dashboard/Dashboard'
import { NetworkMap } from './components/NetworkMap/NetworkMap'
import { AttackConsole } from './components/AttackConsole/AttackConsole'
import { TrafficLog } from './components/TrafficLog/TrafficLog'
import { Defense } from './components/Defense/Defense'
import { Scenarios } from './components/Scenarios/Scenarios'
import { Results } from './components/Results/Results'
import { initMockData } from './data/mockData'

export default function App() {
  useEffect(() => {
    initMockData()
  }, [])

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/network-map" element={<NetworkMap />} />
        <Route path="/attack-console" element={<AttackConsole />} />
        <Route path="/traffic-log" element={<TrafficLog />} />
        <Route path="/defense" element={<Defense />} />
        <Route path="/scenarios" element={<Scenarios />} />
        <Route path="/results" element={<Results />} />
      </Routes>
    </Layout>
  )
}
