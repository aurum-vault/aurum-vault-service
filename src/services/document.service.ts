import { documentRepository } from '../repositories/document.repository.js'
import { customerRepository } from '../repositories/customer.repository.js'
import { AppError, type AuthUser } from '../types.js'

const isStaff = (user: AuthUser) => user.roles.includes('admin') || user.roles.includes('ticket_manager')

export const documentService = {
  async list(user: AuthUser) {
    if (isStaff(user)) return documentRepository.findAll()
    const customer = await customerRepository.findByKeycloakId(user.keycloakId)
    if (!customer) throw new AppError(403, 'Customer profile not found')
    return documentRepository.findByCustomerId(customer.id)
  },

  async create(
    data: { asset_id: string; type: string; filename: string; storage_path: string },
    user: AuthUser
  ) {
    const customer = await customerRepository.findByKeycloakId(user.keycloakId)
    if (!customer) throw new AppError(403, 'Customer profile not found')
    return documentRepository.create(customer.id, data.asset_id, data.type, data.filename, data.storage_path)
  },

  async updateStatus(id: string, status: string, user: AuthUser) {
    if (!isStaff(user)) throw new AppError(403, 'Forbidden')
    const doc = await documentRepository.updateStatus(id, status)
    if (!doc) throw new AppError(404, 'Document not found')
    return doc
  },
}
