import { assetRepository } from '../repositories/asset.repository.js'
import { customerRepository } from '../repositories/customer.repository.js'
import { auditRepository } from '../repositories/audit.repository.js'
import { AppError, type AuthUser, type CreateAssetInput, type UpdateAssetInput } from '../types.js'

async function requireCustomerId(user: AuthUser): Promise<string> {
  const customer = await customerRepository.findByKeycloakId(user.keycloakId)
  if (!customer) throw new AppError(403, 'Customer profile not found')
  return customer.id
}

const isStaff = (user: AuthUser) => user.roles.includes('admin') || user.roles.includes('ticket_manager')

export const assetService = {
  async list(user: AuthUser) {
    if (isStaff(user)) return assetRepository.findAllWithCustomer()
    const customerId = await requireCustomerId(user)
    return assetRepository.findByCustomerId(customerId)
  },

  async getById(id: string, user: AuthUser) {
    const asset = await assetRepository.findById(id)
    if (!asset) throw new AppError(404, 'Asset not found')
    if (!isStaff(user)) {
      const customerId = await requireCustomerId(user)
      if (asset.customer_id !== customerId) throw new AppError(403, 'Forbidden')
    }
    return asset
  },

  async create(data: CreateAssetInput, user: AuthUser) {
    const customerId = await requireCustomerId(user)
    const asset = await assetRepository.create(customerId, data)
    await auditRepository.insert(user.username, 'ASSET_CREATED', 'asset', asset.asset_ref, `Created ${asset.name}`)
    return asset
  },

  async update(id: string, data: UpdateAssetInput, user: AuthUser) {
    const existing = await assetRepository.findById(id)
    if (!existing) throw new AppError(404, 'Asset not found')
    if (!isStaff(user)) {
      const customerId = await requireCustomerId(user)
      if (existing.customer_id !== customerId) throw new AppError(403, 'Forbidden')
    }
    if (!Object.keys(data).length) throw new AppError(400, 'No fields to update')
    const asset = await assetRepository.update(id, data)
    await auditRepository.insert(user.username, 'ASSET_UPDATED', 'asset', asset!.asset_ref, `Updated ${asset!.name}`)
    return asset!
  },

  async remove(id: string, user: AuthUser) {
    const existing = await assetRepository.findById(id)
    if (!existing) throw new AppError(404, 'Asset not found')
    if (!isStaff(user)) {
      const customerId = await requireCustomerId(user)
      if (existing.customer_id !== customerId) throw new AppError(403, 'Forbidden')
    }
    await assetRepository.delete(id)
    await auditRepository.insert(user.username, 'ASSET_DELETED', 'asset', existing.asset_ref, `Deleted ${existing.name}`)
  },
}
