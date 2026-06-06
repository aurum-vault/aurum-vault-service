import type { FastifyInstance } from 'fastify'
import { authenticate, requireRole } from '../auth.js'
import { adminService } from '../services/admin.service.js'

export async function adminRoutes(app: FastifyInstance) {
  // All admin routes require at minimum staff-level auth
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireRole('admin', 'ticket_manager'))

  // ─── Customers ───────────────────────────────────────────────────────────────

  app.get('/admin/customers', async (_req, reply) =>
    reply.send(await adminService.listCustomers())
  )

  app.get<{ Params: { id: string } }>('/admin/customers/:id', async (req, reply) =>
    reply.send(await adminService.getCustomer(req.params.id))
  )

  app.patch<{ Params: { id: string } }>('/admin/customers/:id/status', async (req, reply) => {
    const { status } = req.body as { status: string }
    return reply.send(await adminService.setCustomerStatus(req.params.id, status, req.user!))
  })

  // ─── Staff ───────────────────────────────────────────────────────────────────

  app.get('/admin/staff', async (_req, reply) =>
    reply.send(await adminService.listStaff())
  )

  app.post('/admin/staff', async (req, reply) =>
    reply.status(201).send(await adminService.inviteStaff(req.body as never, req.user!))
  )

  app.put<{ Params: { id: string } }>('/admin/staff/:id', async (req, reply) =>
    reply.send(await adminService.updateStaff(req.params.id, req.body as never, req.user!))
  )

  // ─── Transactions & Audit ─────────────────────────────────────────────────────

  app.get('/admin/transactions', async (_req, reply) =>
    reply.send(await adminService.listTransactions())
  )

  app.get('/admin/audit', async (req, reply) => {
    const limit = Number((req.query as Record<string, string>).limit ?? 100)
    return reply.send(await adminService.getAuditLog(limit))
  })

  // ─── Dashboard ────────────────────────────────────────────────────────────────

  app.get('/admin/dashboard', async (_req, reply) =>
    reply.send(await adminService.getDashboardStats())
  )
}
