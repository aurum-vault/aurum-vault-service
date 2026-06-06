import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { FastifyRequest, FastifyReply } from 'fastify'
import type {} from './types.js'

const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? 'http://localhost:8080'
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM ?? 'aurum-vault'
const ISSUER = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`
const JWKS_URI = `${ISSUER}/protocol/openid-connect/certs`

const JWKS = createRemoteJWKSet(new URL(JWKS_URI), {
  cacheMaxAge: 5 * 60 * 1000,
})

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing authorization header' })
  }
  const token = auth.slice(7)
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER })
    req.user = {
      keycloakId: payload.sub!,
      username: (payload.preferred_username as string) ?? '',
      email: (payload.email as string) ?? '',
      roles: ((payload.realm_access as { roles?: string[] })?.roles) ?? [],
    }
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles: string[]) {
  return async function(req: FastifyRequest, reply: FastifyReply) {
    if (!req.user) {
      return reply.status(401).send({ error: 'Not authenticated' })
    }
    if (!roles.some((r) => req.user!.roles.includes(r))) {
      return reply.status(403).send({ error: 'Forbidden' })
    }
  }
}

export const isAdmin = (req: FastifyRequest) => req.user?.roles.includes('admin') ?? false
export const isStaff = (req: FastifyRequest) =>
  (req.user?.roles.includes('admin') || req.user?.roles.includes('ticket_manager')) ?? false
