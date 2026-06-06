import type { FastifyInstance } from 'fastify'
import { authenticate } from '../auth.js'
import { reportService } from '../services/report.service.js'

export async function reportRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/reports', async (req, reply) =>
    reply.send(await reportService.list(req.user!))
  )

  app.get<{ Params: { ticketId: string } }>('/reports/ticket/:ticketId', async (req, reply) =>
    reply.send(await reportService.getByTicketId(req.params.ticketId, req.user!))
  )

  app.post('/reports', async (req, reply) =>
    reply.status(201).send(await reportService.create(req.body as never, req.user!))
  )

  app.put<{ Params: { id: string } }>('/reports/:id', async (req, reply) =>
    reply.send(await reportService.update(req.params.id, req.body as never, req.user!))
  )
}
