import { eq, desc, getTableColumns } from 'drizzle-orm'
import { db } from '../db/index.js'
import { transactions, customers, assets } from '../db/schema.js'
import type { Transaction } from '../types.js'

type TransactionWithRelations = Transaction & { customer_name?: string | null; asset_name?: string | null }

export const transactionRepository = {
  async findAll(): Promise<TransactionWithRelations[]> {
    return db
      .select({ ...getTableColumns(transactions), customer_name: customers.full_name, asset_name: assets.name })
      .from(transactions)
      .leftJoin(customers, eq(transactions.customer_id, customers.id))
      .leftJoin(assets, eq(transactions.asset_id, assets.id))
      .orderBy(desc(transactions.created_at))
  },

  async create(data: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
    const [row] = await db
      .insert(transactions)
      .values({
        customer_id:  data.customer_id,
        ticket_id:    data.ticket_id,
        asset_id:     data.asset_id,
        service_type: data.service_type,
        amount:       data.amount,
        status:       data.status,
      })
      .returning()
    return row
  },
}
