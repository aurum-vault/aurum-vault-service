import { AppError } from '../types.js'

const BASE    = process.env.KEYCLOAK_URL   ?? 'http://localhost:8080'
const REALM   = process.env.KEYCLOAK_REALM ?? 'aurum-vault'
const TOKEN_URL  = `${BASE}/realms/${REALM}/protocol/openid-connect/token`
const LOGOUT_URL = `${BASE}/realms/${REALM}/protocol/openid-connect/logout`
const ADMIN_URL  = `${BASE}/admin/realms/${REALM}`
const WEB_CLIENT = 'aurum-vault-web'
const API_CLIENT = process.env.KEYCLOAK_CLIENT_ID     ?? 'aurum-vault-api'
const API_SECRET = process.env.KEYCLOAK_CLIENT_SECRET ?? 'aurum-api-secret'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token:  string
  refresh_token: string
  expires_in:    number
  token_type:    string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function post(url: string, body: Record<string, string>, headers: Record<string, string> = {}) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
    body: new URLSearchParams(body),
  })
}

async function getAdminToken(): Promise<string> {
  const res = await post(TOKEN_URL, {
    grant_type:    'client_credentials',
    client_id:     API_CLIENT,
    client_secret: API_SECRET,
  })
  if (!res.ok) throw new AppError(503, 'Keycloak admin auth failed')
  const data = await res.json() as TokenResponse
  return data.access_token
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const keycloakService = {
  async login(username: string, password: string): Promise<TokenResponse> {
    const res = await post(TOKEN_URL, {
      grant_type: 'password',
      client_id:  WEB_CLIENT,
      username,
      password,
    })
    if (res.status === 401) throw new AppError(401, 'Invalid credentials')
    if (!res.ok)            throw new AppError(502, 'Authentication service error')
    return res.json()
  },

  async refresh(refreshToken: string): Promise<TokenResponse> {
    const res = await post(TOKEN_URL, {
      grant_type:    'refresh_token',
      client_id:     WEB_CLIENT,
      refresh_token: refreshToken,
    })
    if (!res.ok) throw new AppError(401, 'Invalid or expired refresh token')
    return res.json()
  },

  async logout(refreshToken: string): Promise<void> {
    await post(LOGOUT_URL, { client_id: WEB_CLIENT, refresh_token: refreshToken })
  },

  async createUser(data: {
    username:  string
    email:     string
    firstName: string
    lastName:  string
    password:  string
  }): Promise<string> {
    const token = await getAdminToken()

    const res = await fetch(`${ADMIN_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        username:      data.username,
        email:         data.email,
        firstName:     data.firstName,
        lastName:      data.lastName,
        enabled:       true,
        emailVerified: true,
        credentials:   [{ type: 'password', value: data.password, temporary: false }],
      }),
    })

    if (res.status === 409) throw new AppError(409, 'Username or email already exists')
    if (!res.ok)            throw new AppError(502, 'Failed to create user')

    // Keycloak returns the new user URL in the Location header
    const location = res.headers.get('Location') ?? ''
    const userId   = location.split('/').pop()
    if (!userId)   throw new AppError(502, 'Could not determine new user ID')

    await this.assignRealmRole(userId, 'customer', token)
    return userId
  },

  async createStaffUser(data: {
    email:     string
    firstName: string
    lastName:  string
    role:      string
  }): Promise<string> {
    const token = await getAdminToken()

    const res = await fetch(`${ADMIN_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        username:        data.email,
        email:           data.email,
        firstName:       data.firstName,
        lastName:        data.lastName,
        enabled:         true,
        emailVerified:   false,
        requiredActions: ['UPDATE_PASSWORD'],
      }),
    })

    if (res.status === 409) throw new AppError(409, 'Email already exists in auth service')
    if (!res.ok)            throw new AppError(502, 'Failed to create staff user in auth service')

    const location = res.headers.get('Location') ?? ''
    const userId   = location.split('/').pop()
    if (!userId)   throw new AppError(502, 'Could not determine new user ID')

    await this.assignRealmRole(userId, data.role, token)

    const emailRes = await fetch(`${ADMIN_URL}/users/${userId}/execute-actions-email`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify(['UPDATE_PASSWORD']),
    })
    if (!emailRes.ok) {
      const detail = await emailRes.text().catch(() => '')
      throw new AppError(502, `User created but failed to send invite email: ${detail}`)
    }

    return userId
  },

  async assignRealmRole(userId: string, roleName: string, adminToken?: string): Promise<void> {
    const token = adminToken ?? await getAdminToken()

    const roleRes = await fetch(`${ADMIN_URL}/roles/${roleName}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!roleRes.ok) throw new AppError(502, `Role '${roleName}' not found in auth service`)
    const role = await roleRes.json() as { id: string; name: string }

    const assignRes = await fetch(`${ADMIN_URL}/users/${userId}/role-mappings/realm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify([{ id: role.id, name: role.name }]),
    })
    if (!assignRes.ok) throw new AppError(502, 'Failed to assign role')
  },
}
