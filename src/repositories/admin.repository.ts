import { eq, notInArray, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { customers, assets, serviceTickets } from '../db/schema.js'

export const adminRepository = {
  async getDashboardStats() {
    const [active, totalAssets, totalTickets, openTickets] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(customers).where(eq(customers.status, 'active')),
      db.select({ count: sql<number>`count(*)::int` }).from(assets),
      db.select({ count: sql<number>`count(*)::int` }).from(serviceTickets),
      db.select({ count: sql<number>`count(*)::int` }).from(serviceTickets)
        .where(notInArray(serviceTickets.status, ['closed', 'cancelled'])),
    ])
    return {
      active_customers: active[0].count,
      total_assets:     totalAssets[0].count,
      total_tickets:    totalTickets[0].count,
      open_tickets:     openTickets[0].count,
    }
  },
}
