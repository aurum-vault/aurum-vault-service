import type { FastifyInstance } from 'fastify'
import { keycloakService } from '../services/keycloak.service.js'
import { customerRepository } from '../repositories/customer.repository.js'
import { authenticate } from '../auth.js'
import { AppError } from '../types.js'

export async function authRoutes(app: FastifyInstance) {
  /**
   * POST /auth/login
   * Body: { username: string, password: string }
   * username is the customer's mobile number or staff username
   */
  app.post('/auth/login', async (req, reply) => {
    const { username, password } = req.body as { username?: string; password?: string }
    if (!username || !password) throw new AppError(400, 'username and password are required')
    const tokens = await keycloakService.login(username, password)
    return reply.send(tokens)
  })

  /**
   * POST /auth/register
   * Customer self-registration. Creates a Keycloak user (username = mobile),
   * assigns the 'customer' role, syncs to our DB, and returns tokens.
   * Body: { full_name, mobile, email, password, address?, tfa? }
   */
  app.post('/auth/register', async (req, reply) => {
    const b = req.body as {
      full_name?: string
      mobile?:    string
      email?:     string
      password?:  string
      address?:   string
      tfa?:       string
    }
    if (!b.full_name || !b.mobile || !b.email || !b.password) {
      throw new AppError(400, 'full_name, mobile, email and password are required')
    }

    const [firstName, ...rest] = b.full_name.trim().split(' ')
    const keycloakId = await keycloakService.createUser({
      username:  b.mobile,
      email:     b.email,
      firstName,
      lastName:  rest.join(' ') || '-',
      password:  b.password,
    })

    await customerRepository.upsert({
      keycloak_id: keycloakId,
      full_name:   b.full_name,
      mobile:      b.mobile,
      email:       b.email,
      address:     b.address,
      tfa:         b.tfa,
    })

    // Log the new user straight in so the frontend has tokens immediately
    const tokens = await keycloakService.login(b.mobile, b.password)
    return reply.status(201).send(tokens)
  })

  /**
   * POST /auth/refresh
   * Body: { refresh_token: string }
   */
  app.post('/auth/refresh', async (req, reply) => {
    const { refresh_token } = req.body as { refresh_token?: string }
    if (!refresh_token) throw new AppError(400, 'refresh_token is required')
    const tokens = await keycloakService.refresh(refresh_token)
    return reply.send(tokens)
  })

  /**
   * POST /auth/logout
   * Body: { refresh_token: string }
   * Revokes the session in Keycloak.
   */
  app.post('/auth/logout', async (req, reply) => {
    const { refresh_token } = req.body as { refresh_token?: string }
    if (!refresh_token) throw new AppError(400, 'refresh_token is required')
    await keycloakService.logout(refresh_token)
    return reply.status(204).send()
  })
}
