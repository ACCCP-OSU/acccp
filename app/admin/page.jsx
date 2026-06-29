'use client'

import { useEffect, useState } from 'react'
import { getMockRoles, addMockRole, clearMockAuth, isMockAuthEnabled } from '../auth/mockAuth'

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const mockEnabled = isMockAuthEnabled()

  useEffect(() => {
    if (!mockEnabled) {
      setAuthenticated(true)
      setInitialized(true)
      return
    }

    setAuthenticated(getMockRoles().includes('admin'))
    setInitialized(true)
  }, [mockEnabled])

  const handleSimulateLogin = () => {
    addMockRole('admin')
    setAuthenticated(true)
  }

  const handleSignOut = () => {
    clearMockAuth()
    setAuthenticated(false)
  }

  if (!initialized) return null

  if (mockEnabled && !authenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f5f5f5', color: '#111' }}>
        <div style={{ maxWidth: 560, width: '100%', background: 'white', borderRadius: 16, boxShadow: '0 24px 80px rgba(0,0,0,0.08)', padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Admin SSO</div>
          <p style={{ margin: '0 0 24px', color: '#555', lineHeight: 1.6 }}>
            This admin area requires admin authentication. Click below to simulate SAML login for the admin role.
          </p>
          <button
            onClick={handleSimulateLogin}
            style={{ background: '#111', color: 'white', border: 'none', borderRadius: 10, padding: '14px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            Simulate Admin login
          </button>
          <div style={{ marginTop: 18, fontSize: 13, color: '#777' }}>
            The mock auth state is stored locally in your browser.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', padding: 32, background: '#f3f4f6' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32 }}>Admin Dashboard</h1>
          <p style={{ margin: '8px 0 0', color: '#555' }}>Manage users and system settings.</p>
        </div>
        <button
          onClick={handleSignOut}
          style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 10, padding: '12px 16px', fontSize: 13, cursor: 'pointer' }}
        >
          Sign out
        </button>
      </div>
      <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 16px 40px rgba(0,0,0,0.06)' }}>
        <p style={{ margin: 0, color: '#333' }}>
          This is the admin page placeholder. You can add admin-specific controls and reports here.
        </p>
      </div>
    </div>
  )
}
