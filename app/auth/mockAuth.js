const AUTH_STORAGE_KEY = 'mockSamlAuth'
const ENABLE_MOCK_SAML = process.env.NEXT_PUBLIC_ENABLE_MOCK_SAML !== 'false'

export function isMockAuthEnabled() {
  return ENABLE_MOCK_SAML
}

export function getMockAuth() {
  if (!ENABLE_MOCK_SAML || typeof window === 'undefined') return null
  try {
    return JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY) ?? 'null')
  } catch {
    return null
  }
}

export function getMockRoles() {
  const auth = getMockAuth()
  return Array.isArray(auth?.roles) ? auth.roles : []
}

export function hasMockRole(role) {
  return getMockRoles().includes(role)
}

export function addMockRole(role) {
  if (!ENABLE_MOCK_SAML || typeof window === 'undefined') return
  const current = getMockAuth()
  const roles = Array.isArray(current?.roles) ? [...current.roles] : []
  if (!roles.includes(role)) {
    roles.push(role)
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ roles }))
}

export function setMockRoles(roles) {
  if (!ENABLE_MOCK_SAML || typeof window === 'undefined') return
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ roles }))
}

export function clearMockAuth() {
  if (!ENABLE_MOCK_SAML || typeof window === 'undefined') return
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}
