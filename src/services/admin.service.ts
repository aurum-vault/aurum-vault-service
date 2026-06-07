import { adminRepository } from '../repositories/admin.repository.js'
import { customerRepository } from '../repositories/customer.repository.js'
import { staffRepository } from '../repositories/staff.repository.js'
import { transactionRepository } from '../repositories/transaction.repository.js'
import { auditRepository } from '../repositories/audit.repository.js'
import { keycloakService } from './keycloak.service.js'
import { AppError, type AuthUser, type CreateCustomerInput, type CreateStaffInput, type UpdateStaffInput } from '../types.js'

const isAdmin = (user: AuthUser) => user.roles.includes('admin')

export const adminService = {
  // ─── Customers ───────────────────────────────────────────────────────────────

  async listCustomers() {
    return customerRepository.findAll()
  },

  async getCustomer(id: string) {
    const customer = await customerRepository.findById(id)
    if (!customer) throw new AppError(404, 'Customer not found')
    return customer
  },

  async setCustomerStatus(id: string, status: string, user: AuthUser) {
    if (!isAdmin(user)) throw new AppError(403, 'Forbidden')
    const customer = await customerRepository.updateStatus(id, status)
    if (!customer) throw new AppError(404, 'Customer not found')
    await auditRepository.insert(user.username, 'CUSTOMER_STATUS_CHANGED', 'customer', id, `Status → ${status}`)
    return customer
  },

  async syncCustomer(data: CreateCustomerInput, user: AuthUser) {
    // Any authenticated user can sync their own profile; admins can sync any
    if (!isAdmin(user) && data.keycloak_id !== user.keycloakId) {
      throw new AppError(403, 'Forbidden')
    }
    return customerRepository.upsert(data)
  },

  // ─── Staff ───────────────────────────────────────────────────────────────────

  async listStaff() {
    return staffRepository.findAll()
  },

  async inviteStaff(data: CreateStaffInput, user: AuthUser) {
    if (!isAdmin(user)) throw new AppError(403, 'Forbidden')
    const nameParts = data.full_name.trim().split(/\s+/)
    const firstName = nameParts[0]
    const lastName  = nameParts.slice(1).join(' ') || '-'
    const keycloakId = await keycloakService.createStaffUser({
      email: data.email, firstName, lastName, role: data.role,
    })
    const staff = await staffRepository.create({ ...data, keycloak_id: keycloakId })
    await auditRepository.insert(user.username, 'STAFF_INVITED', 'staff', staff.id, `Invited ${data.email} as ${data.role}`)
    return staff
  },

  async updateStaff(id: string, data: UpdateStaffInput, user: AuthUser) {
    if (!isAdmin(user)) throw new AppError(403, 'Forbidden')
    const staff = await staffRepository.update(id, data)
    if (!staff) throw new AppError(404, 'Staff not found')
    return staff
  },

  // ─── Transactions ─────────────────────────────────────────────────────────────

  async listTransactions() {
    return transactionRepository.findAll()
  },

  // ─── Audit log ────────────────────────────────────────────────────────────────

  async getAuditLog(limit: number) {
    return auditRepository.findRecent(Math.min(limit, 500))
  },

  // ─── Dashboard stats ──────────────────────────────────────────────────────────

  async getDashboardStats() {
    return adminRepository.getDashboardStats()
  },
}
