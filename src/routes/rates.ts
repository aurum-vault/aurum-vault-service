import type { FastifyInstance } from 'fastify'
import { authenticate } from '../auth.js'
import { ratesService } from '../services/rates.service.js'

export async function ratesRoutes(app: FastifyInstance) {
  app.get('/rates', async (_req, reply) =>
    reply.send(await ratesService.getCurrent())
  )

  app.put('/rates', { preHandler: authenticate }, async (req, reply) => {
    const { gold, silver, platinum, diamond_usd } = req.body as Record<string, number>
    return reply.send(await ratesService.update(gold, silver, platinum, diamond_usd, req.user!))
  })
}
