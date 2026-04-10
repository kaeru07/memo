import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <TopBar />
        <div className="main-content">{children}</div>
      </div>
    </div>
  )
}
