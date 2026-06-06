import { desc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { rates } from '../db/schema.js'
import type { Rates } from '../types.js'

export const ratesRepository = {
  async findLatest(): Promise<Rates | null> {
    const [row] = await db.select().from(rates).orderBy(desc(rates.fetched_at)).limit(1)
    return row ?? null
  },

  async insert(gold: number, silver: number, platinum: number, diamond_usd: number): Promise<Rates> {
    const [row] = await db.insert(rates).values({ gold, silver, platinum, diamond_usd }).returning()
    return row
  },
}
