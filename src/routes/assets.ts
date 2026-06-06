import type { FastifyInstance } from 'fastify'
import { authenticate } from '../auth.js'
import { assetService } from '../services/asset.service.js'

export async function assetRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/assets', async (req, reply) =>
    reply.send(await assetService.list(req.user!))
  )

  app.post('/assets', async (req, reply) =>
    reply.status(201).send(await assetService.create(req.body as never, req.user!))
  )

  app.get<{ Params: { id: string } }>('/assets/:id', async (req, reply) =>
    reply.send(await assetService.getById(req.params.id, req.user!))
  )

  app.put<{ Params: { id: string } }>('/assets/:id', async (req, reply) =>
    reply.send(await assetService.update(req.params.id, req.body as never, req.user!))
  )

  app.delete<{ Params: { id: string } }>('/assets/:id', async (req, reply) => {
    await assetService.remove(req.params.id, req.user!)
    return reply.status(204).send()
  })
}
