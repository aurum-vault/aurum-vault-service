import { eq, desc, getTableColumns } from 'drizzle-orm'
import { db } from '../db/index.js'
import { serviceTickets, customers, staff, assets } from '../db/schema.js'
import type { ServiceTicket, CreateTicketInput } from '../types.js'

type TicketRow = typeof serviceTickets.$inferSelect
type TicketWithRelations = TicketRow & {
  customer_name?: string
  assignee_name?: string | null
  asset_name?: string
  asset_ref?: string
}

const WITH_RELATIONS = {
  ...getTableColumns(serviceTickets),
  customer_name:  customers.full_name,
  assignee_name:  staff.full_name,
  asset_name:     assets.name,
  asset_ref:      assets.asset_ref,
}

export const ticketRepository = {
  async findById(id: string): Promise<TicketWithRelations | null> {
    const [row] = await db
      .select(WITH_RELATIONS)
      .from(serviceTickets)
      .innerJoin(customers, eq(serviceTickets.customer_id, customers.id))
      .leftJoin(staff, eq(serviceTickets.assigned_to, staff.id))
      .innerJoin(assets, eq(serviceTickets.asset_id, assets.id))
      .where(eq(serviceTickets.id, id))
    return row ?? null
  },

  async findByCustomerId(customerId: string): Promise<TicketWithRelations[]> {
    return db
      .select({ ...getTableColumns(serviceTickets), asset_name: assets.name, asset_ref: assets.asset_ref })
      .from(serviceTickets)
      .innerJoin(assets, eq(serviceTickets.asset_id, assets.id))
      .where(eq(serviceTickets.customer_id, customerId))
      .orderBy(desc(serviceTickets.created_at))
  },

  async findByAssignedStaff(staffId: string): Promise<TicketWithRelations[]> {
    return db
      .select({ ...getTableColumns(serviceTickets), customer_name: customers.full_name, asset_name: assets.name, asset_ref: assets.asset_ref })
      .from(serviceTickets)
      .innerJoin(customers, eq(serviceTickets.customer_id, customers.id))
      .innerJoin(assets, eq(serviceTickets.asset_id, assets.id))
      .where(eq(serviceTickets.assigned_to, staffId))
      .orderBy(desc(serviceTickets.created_at))
  },

  async findAll(): Promise<TicketWithRelations[]> {
    return db
      .select(WITH_RELATIONS)
      .from(serviceTickets)
      .innerJoin(customers, eq(serviceTickets.customer_id, customers.id))
      .leftJoin(staff, eq(serviceTickets.assigned_to, staff.id))
      .innerJoin(assets, eq(serviceTickets.asset_id, assets.id))
      .orderBy(desc(serviceTickets.created_at))
  },

  async create(customerId: string, data: CreateTicketInput): Promise<ServiceTicket> {
    const [row] = await db
      .insert(serviceTickets)
      .values({
        customer_id:      customerId,
        asset_id:         data.asset_id,
        service_type:     data.service_type,
        customer_notes:   data.customer_notes ?? null,
        preferred_date:   data.preferred_date ?? null,
        time_slot:        data.time_slot ?? null,
        visit_type:       data.visit_type ?? null,
        dispatch_address: data.dispatch_address ?? null,
        extra:            data.extra ?? {},
      })
      .returning()
    return row
  },

  async assign(id: string, staffId: string, priority?: string): Promise<ServiceTicket | null> {
    const [row] = await db
      .update(serviceTickets)
      .set({ assigned_to: staffId, status: 'assigned', priority: priority ?? undefined, updated_at: new Date() })
      .where(eq(serviceTickets.id, id))
      .returning()
    return row ?? null
  },

  async updateStatus(id: string, status: string, extraPatch?: Record<string, unknown>): Promise<ServiceTicket | null> {
    if (extraPatch) {
      const [current] = await db.select({ extra: serviceTickets.extra }).from(serviceTickets).where(eq(serviceTickets.id, id))
      if (!current) return null
      const merged = { ...(current.extra ?? {}), ...extraPatch }
      const [row] = await db
        .update(serviceTickets)
        .set({ status, extra: merged, updated_at: new Date() })
        .where(eq(serviceTickets.id, id))
        .returning()
      return row ?? null
    }
    const [row] = await db
      .update(serviceTickets)
      .set({ status, updated_at: new Date() })
      .where(eq(serviceTickets.id, id))
      .returning()
    return row ?? null
  },
}
