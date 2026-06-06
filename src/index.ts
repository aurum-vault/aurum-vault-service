import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'

import { AppError } from './types.js'
import { healthRoutes } from './routes/health.js'
import { ratesRoutes } from './routes/rates.js'
import { assetRoutes } from './routes/assets.js'
import { ticketRoutes } from './routes/tickets.js'
import { reportRoutes } from './routes/reports.js'
import { documentRoutes } from './routes/documents.js'
import { adminRoutes } from './routes/admin.js'
import { meRoutes } from './routes/me.js'
import { authRoutes } from './routes/auth.js'

const app = Fastify({ logger: { level: process.env.NODE_ENV === 'production' ? 'warn' : 'info' } })

await app.register(helmet, { contentSecurityPolicy: false })
await app.register(cors, { origin: true, credentials: true })

app.setErrorHandler((err, _req, reply) => {
  if (err instanceof AppError) {
    return reply.status(err.statusCode).send({ error: err.message })
  }
  app.log.error(err)
  return reply.status(500).send({ error: 'Internal server error' })
})

const PREFIX = '/api/v1'

await app.register(healthRoutes)
await app.register(authRoutes, { prefix: PREFIX })
await app.register(meRoutes, { prefix: PREFIX })
await app.register(ratesRoutes, { prefix: PREFIX })
await app.register(assetRoutes, { prefix: PREFIX })
await app.register(ticketRoutes, { prefix: PREFIX })
await app.register(reportRoutes, { prefix: PREFIX })
await app.register(documentRoutes, { prefix: PREFIX })
await app.register(adminRoutes, { prefix: PREFIX })

const port = Number(process.env.PORT ?? 3001)

try {
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`aurum-vault-service listening on :${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
