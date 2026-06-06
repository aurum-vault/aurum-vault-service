import { eq, desc, getTableColumns } from 'drizzle-orm'
import { db } from '../db/index.js'
import { reports, staff, serviceTickets } from '../db/schema.js'
import type { Report, CreateReportInput, UpdateReportInput } from '../types.js'

type ReportWithAppraiser = Report & { appraiser_name?: string | null }

export const reportRepository = {
  async findAll(): Promise<ReportWithAppraiser[]> {
    return db
      .select({ ...getTableColumns(reports), appraiser_name: staff.full_name })
      .from(reports)
      .leftJoin(staff, eq(reports.appraised_by, staff.id))
      .orderBy(desc(reports.created_at))
  },

  async findByCustomerId(customerId: string): Promise<ReportWithAppraiser[]> {
    return db
      .select({ ...getTableColumns(reports), appraiser_name: staff.full_name })
      .from(reports)
      .leftJoin(staff, eq(reports.appraised_by, staff.id))
      .innerJoin(serviceTickets, eq(reports.ticket_id, serviceTickets.id))
      .where(eq(serviceTickets.customer_id, customerId))
      .orderBy(desc(reports.created_at))
  },

  async findByTicketId(ticketId: string): Promise<ReportWithAppraiser | null> {
    const [row] = await db
      .select({ ...getTableColumns(reports), appraiser_name: staff.full_name })
      .from(reports)
      .leftJoin(staff, eq(reports.appraised_by, staff.id))
      .where(eq(reports.ticket_id, ticketId))
    return row ?? null
  },

  async findById(id: string): Promise<Report | null> {
    const [row] = await db.select().from(reports).where(eq(reports.id, id))
    return row ?? null
  },

  async create(appraisedBy: string, data: CreateReportInput): Promise<Report> {
    const [row] = await db
      .insert(reports)
      .values({
        ticket_id:       data.ticket_id,
        asset_id:        data.asset_id,
        appraised_value: data.appraised_value,
        notes:           data.notes ?? null,
        images:          data.images ?? [],
        status:          data.status ?? 'under_review',
        appraised_by:    appraisedBy,
      })
      .returning()
    return row
  },

  async update(id: string, data: UpdateReportInput): Promise<Report | null> {
    const [row] = await db
      .update(reports)
      .set({
        appraised_value: data.appraised_value,
        notes:           data.notes,
        images:          data.images,
        status:          data.status,
        updated_at:      new Date(),
      })
      .where(eq(reports.id, id))
      .returning()
    return row ?? null
  },
}
