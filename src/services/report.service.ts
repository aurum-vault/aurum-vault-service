import { reportRepository } from '../repositories/report.repository.js'
import { assetRepository } from '../repositories/asset.repository.js'
import { ticketRepository } from '../repositories/ticket.repository.js'
import { customerRepository } from '../repositories/customer.repository.js'
import { staffRepository } from '../repositories/staff.repository.js'
import { auditRepository } from '../repositories/audit.repository.js'
import { AppError, type AuthUser, type CreateReportInput, type UpdateReportInput } from '../types.js'

const isStaff = (user: AuthUser) => user.roles.includes('admin') || user.roles.includes('ticket_manager')
const PUBLISHED = new Set(['certified', 'provisional'])

export const reportService = {
  async list(user: AuthUser) {
    if (isStaff(user)) return reportRepository.findAll()
    const customer = await customerRepository.findByKeycloakId(user.keycloakId)
    if (!customer) return []
    return reportRepository.findByCustomerId(customer.id)
  },

  async getByTicketId(ticketId: string, user: AuthUser) {
    const report = await reportRepository.findByTicketId(ticketId)
    if (!report) throw new AppError(404, 'Report not found')
    if (!isStaff(user)) {
      const ticket = await ticketRepository.findById(ticketId)
      const customer = await customerRepository.findByKeycloakId(user.keycloakId)
      if (!customer || ticket?.customer_id !== customer.id) throw new AppError(403, 'Forbidden')
    }
    return report
  },

  async create(data: CreateReportInput, user: AuthUser) {
    if (!isStaff(user)) throw new AppError(403, 'Forbidden')
    const staff = await staffRepository.findByKeycloakId(user.keycloakId)
    if (!staff) throw new AppError(403, 'Staff profile not found')

    const report = await reportRepository.create(staff.id, data)

    if (PUBLISHED.has(report.status)) {
      await assetRepository.updateAppraisedValue(report.asset_id, report.appraised_value)
    }

    await auditRepository.insert(user.username, 'REPORT_CREATED', 'report', report.report_ref, `Appraised at ₹${report.appraised_value}`)
    return report
  },

  async update(id: string, data: UpdateReportInput, user: AuthUser) {
    if (!isStaff(user)) throw new AppError(403, 'Forbidden')
    const report = await reportRepository.update(id, data)
    if (!report) throw new AppError(404, 'Report not found')

    if (data.status && PUBLISHED.has(data.status)) {
      await assetRepository.updateAppraisedValue(report.asset_id, report.appraised_value)
    }

    await auditRepository.insert(user.username, 'REPORT_UPDATED', 'report', report.report_ref, `Status: ${report.status}`)
    return report
  },
}
