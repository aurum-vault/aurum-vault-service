import { ticketRepository } from '../repositories/ticket.repository.js'
import { customerRepository } from '../repositories/customer.repository.js'
import { staffRepository } from '../repositories/staff.repository.js'
import { auditRepository } from '../repositories/audit.repository.js'
import { AppError, type AuthUser, type CreateTicketInput } from '../types.js'

const isAdmin = (user: AuthUser) => user.roles.includes('admin')
const isStaff = (user: AuthUser) => user.roles.includes('admin') || user.roles.includes('ticket_manager')

async function requireCustomerId(user: AuthUser): Promise<string> {
  const customer = await customerRepository.findByKeycloakId(user.keycloakId)
  if (!customer) throw new AppError(403, 'Customer profile not found')
  return customer.id
}

export const ticketService = {
  async list(user: AuthUser) {
    if (isAdmin(user)) return ticketRepository.findAll()
    if (isStaff(user)) {
      const staff = await staffRepository.findByKeycloakId(user.keycloakId)
      if (!staff) throw new AppError(403, 'Staff profile not found')
      return ticketRepository.findByAssignedStaff(staff.id)
    }
    const customerId = await requireCustomerId(user)
    return ticketRepository.findByCustomerId(customerId)
  },

  async getById(id: string, user: AuthUser) {
    const ticket = await ticketRepository.findById(id)
    if (!ticket) throw new AppError(404, 'Ticket not found')
    if (!isStaff(user)) {
      const customerId = await requireCustomerId(user)
      if (ticket.customer_id !== customerId) throw new AppError(403, 'Forbidden')
    }
    return ticket
  },

  async create(data: CreateTicketInput, user: AuthUser) {
    const customerId = await requireCustomerId(user)
    const ticket = await ticketRepository.create(customerId, data)
    await auditRepository.insert(user.username, 'TICKET_CREATED', 'ticket', ticket.ticket_ref, `${data.service_type} ticket created`)
    return ticket
  },

  async assign(id: string, staffId: string, priority: string | undefined, user: AuthUser) {
    if (!isAdmin(user)) throw new AppError(403, 'Forbidden')
    const ticket = await ticketRepository.assign(id, staffId, priority)
    if (!ticket) throw new AppError(404, 'Ticket not found')
    await auditRepository.insert(user.username, 'TICKET_ASSIGNED', 'ticket', ticket.ticket_ref, `Assigned to staff ${staffId}`)
    return ticket
  },

  async updateStatus(id: string, status: string, extraPatch: Record<string, unknown> | undefined, user: AuthUser) {
    const existing = await ticketRepository.findById(id)
    if (!existing) throw new AppError(404, 'Ticket not found')
    if (!isStaff(user)) {
      const customerId = await requireCustomerId(user)
      if (existing.customer_id !== customerId) throw new AppError(403, 'Forbidden')
    }
    const ticket = await ticketRepository.updateStatus(id, status, extraPatch)
    await auditRepository.insert(user.username, 'TICKET_STATUS_CHANGED', 'ticket', ticket!.ticket_ref, `Status → ${status}`)
    return ticket!
  },
}
