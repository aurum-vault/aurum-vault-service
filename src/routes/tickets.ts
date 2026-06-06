import type { FastifyInstance } from 'fastify'
import { authenticate } from '../auth.js'
import { ticketService } from '../services/ticket.service.js'

export async function ticketRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/tickets', async (req, reply) =>
    reply.send(await ticketService.list(req.user!))
  )

  app.post('/tickets', async (req, reply) =>
    reply.status(201).send(await ticketService.create(req.body as never, req.user!))
  )

  app.get<{ Params: { id: string } }>('/tickets/:id', async (req, reply) =>
    reply.send(await ticketService.getById(req.params.id, req.user!))
  )

  app.patch<{ Params: { id: string } }>('/tickets/:id/assign', async (req, reply) => {
    const { staff_id, priority } = req.body as { staff_id: string; priority?: string }
    return reply.send(await ticketService.assign(req.params.id, staff_id, priority, req.user!))
  })

  app.patch<{ Params: { id: string } }>('/tickets/:id/status', async (req, reply) => {
    const { status, extra } = req.body as { status: string; extra?: Record<string, unknown> }
    return reply.send(await ticketService.updateStatus(req.params.id, status, extra, req.user!))
  })
}
