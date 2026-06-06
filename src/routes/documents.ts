import type { FastifyInstance } from 'fastify'
import { authenticate } from '../auth.js'
import { documentService } from '../services/document.service.js'

export async function documentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/documents', async (req, reply) =>
    reply.send(await documentService.list(req.user!))
  )

  app.post('/documents', async (req, reply) =>
    reply.status(201).send(await documentService.create(req.body as never, req.user!))
  )

  app.patch<{ Params: { id: string } }>('/documents/:id/status', async (req, reply) => {
    const { status } = req.body as { status: string }
    return reply.send(await documentService.updateStatus(req.params.id, status, req.user!))
  })
}
