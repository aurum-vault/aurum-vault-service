import { ratesRepository } from '../repositories/rates.repository.js'
import { AppError, type AuthUser } from '../types.js'

export const ratesService = {
  async getCurrent() {
    return ratesRepository.findLatest()
  },

  async update(gold: number, silver: number, platinum: number, diamond_usd: number, user: AuthUser) {
    if (!user.roles.includes('admin')) throw new AppError(403, 'Forbidden')
    return ratesRepository.insert(gold, silver, platinum, diamond_usd)
  },
}
