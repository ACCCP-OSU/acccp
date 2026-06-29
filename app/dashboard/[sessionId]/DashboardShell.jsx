'use client'

import { useEffect, useState } from 'react'
import { getMockRoles, addMockRole, clearMockAuth, isMockAuthEnabled } from '../../auth/mockAuth'
import AcccpDemo from '../../components/AcccpDemo.jsx'

export default function DashboardShell({ sessionId }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const mockEnabled = isMockAuthEnabled()

  useEffect(() => {
    if (!mockEnabled) {
      setAuthenticated(true)
      setInitialized(true)
      return
    }

    setAuthenticated(getMockRoles().includes('dashboard'))
    setInitialized(true)
  }, [mockEnabled])

  const handleSimulateLogin = () => {
    addMockRole('dashboard')
    setAuthenticated(true)
  }

  const handleSignOut = () => {
    clearMockAuth()
    setAuthenticated(false)
  }

  if (!initialized) {
    return null
  }

  if (!authenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f5f5f5', color: '#111' }}>
        <div style={{ maxWidth: 560, width: '100%', background: 'white', borderRadius: 16, boxShadow: '0 24px 80px rgba(0,0,0,0.08)', padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Simulated SAML SSO</div>
          <p style={{ margin: '0 0 24px', color: '#555', lineHeight: 1.6 }}>
            This dashboard route is protected by a simulated SAML sign-on flow. Click the button below to mock authentication for session <strong>{sessionId}</strong>.
          </p>
          <button
            onClick={handleSimulateLogin}
            style={{ background: '#0060df', color: 'white', border: 'none', borderRadius: 10, padding: '14px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            Simulate SAML login
          </button>
          <div style={{ marginTop: 18, fontSize: 13, color: '#777' }}>
            The mock auth state is stored locally in your browser.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 999 }}>
        <button
          onClick={handleSignOut}
          style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 14px', fontSize: 13, cursor: 'pointer' }}
        >
          Sign out
        </button>
      </div>
      <AcccpDemo sessionId={sessionId} />
    </div>
  )
}
