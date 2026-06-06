import { eq, desc, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { customers } from '../db/schema.js'
import type { Customer, CreateCustomerInput } from '../types.js'

export const customerRepository = {
  async findById(id: string): Promise<Customer | null> {
    const [row] = await db.select().from(customers).where(eq(customers.id, id))
    return row ?? null
  },

  async findByKeycloakId(keycloakId: string): Promise<Customer | null> {
    const [row] = await db.select().from(customers).where(eq(customers.keycloak_id, keycloakId))
    return row ?? null
  },

  async findAll(): Promise<Customer[]> {
    return db.select().from(customers).orderBy(desc(customers.created_at))
  },

  async upsert(data: CreateCustomerInput): Promise<Customer> {
    const [row] = await db
      .insert(customers)
      .values({
        keycloak_id: data.keycloak_id,
        full_name:   data.full_name,
        mobile:      data.mobile,
        email:       data.email,
        address:     data.address ?? null,
        tfa:         data.tfa ?? 'sms',
      })
      .onConflictDoUpdate({
        target: customers.keycloak_id,
        set: {
          full_name:  sql`excluded.full_name`,
          mobile:     sql`excluded.mobile`,
          email:      sql`excluded.email`,
          address:    sql`COALESCE(excluded.address, ${customers.address})`,
          updated_at: sql`now()`,
        },
      })
      .returning()
    return row
  },

  async updateStatus(id: string, status: string): Promise<Customer | null> {
    const [row] = await db
      .update(customers)
      .set({ status, updated_at: new Date() })
      .where(eq(customers.id, id))
      .returning()
    return row ?? null
  },
}
