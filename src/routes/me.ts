import type { FastifyInstance } from 'fastify'
import { authenticate } from '../auth.js'
import { customerRepository } from '../repositories/customer.repository.js'
import { AppError } from '../types.js'

export async function meRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // Returns customer profile for customers, or a lightweight staff identity for staff
  app.get('/me', async (req, reply) => {
    const user = req.user!
    if (user.roles.includes('admin') || user.roles.includes('ticket_manager')) {
      return reply.send({ type: 'staff', roles: user.roles, email: user.email, username: user.username })
    }
    const customer = await customerRepository.findByKeycloakId(user.keycloakId)
    if (!customer) throw new AppError(404, 'Customer profile not found')
    return reply.send(customer)
  })

  // Upsert customer profile — called after first login or on profile update
  app.post('/me', async (req, reply) => {
    const user = req.user!
    const data = req.body as { full_name: string; mobile: string; email?: string; address?: string; tfa?: string }
    if (!data.full_name || !data.mobile) throw new AppError(400, 'full_name and mobile are required')
    const customer = await customerRepository.upsert({
      keycloak_id: user.keycloakId,
      full_name: data.full_name,
      mobile: data.mobile,
      email: data.email ?? user.email,
      address: data.address,
      tfa: data.tfa,
    })
    return reply.status(200).send(customer)
  })
}