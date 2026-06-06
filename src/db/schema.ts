import {
  pgTable, pgSequence, uuid, varchar, text, numeric, timestamp, date,
  jsonb, serial,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ─── Sequences for human-readable refs ───────────────────────────────────────

export const assetSeq  = pgSequence('asset_seq',  { startWith: 1 })
export const ticketSeq = pgSequence('ticket_seq', { startWith: 1 })
export const reportSeq = pgSequence('report_seq', { startWith: 1 })

// ─── Tables ───────────────────────────────────────────────────────────────────

export const customers = pgTable('customers', {
  id:          uuid('id').primaryKey().defaultRandom(),
  keycloak_id: varchar('keycloak_id', { length: 255 }).unique().notNull(),
  full_name:   varchar('full_name', { length: 255 }).notNull(),
  mobile:      varchar('mobile', { length: 15 }).unique().notNull(),
  email:       varchar('email', { length: 255 }).unique().notNull(),
  address:     text('address'),
  tfa:         varchar('tfa', { length: 10 }).notNull().default('sms'),
  status:      varchar('status', { length: 20 }).notNull().default('active'),
  created_at:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const staff = pgTable('staff', {
  id:          uuid('id').primaryKey().defaultRandom(),
  keycloak_id: varchar('keycloak_id', { length: 255 }).unique(),
  full_name:   varchar('full_name', { length: 255 }).notNull(),
  email:       varchar('email', { length: 255 }).unique().notNull(),
  mobile:      varchar('mobile', { length: 15 }),
  role:        varchar('role', { length: 30 }).notNull().$type<'admin' | 'ticket_manager'>(),
  status:      varchar('status', { length: 20 }).notNull().default('invited'),
  last_login:  timestamp('last_login', { withTimezone: true }),
  created_at:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const assets = pgTable('assets', {
  id:              uuid('id').primaryKey().defaultRandom(),
  asset_ref:       varchar('asset_ref', { length: 20 }).notNull().unique()
                     .default(sql`'ORN-' || lpad(nextval('asset_seq')::text, 4, '0')`),
  customer_id:     uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  name:            varchar('name', { length: 255 }).notNull(),
  category:        varchar('category', { length: 100 }).notNull(),
  perspective:     varchar('perspective', { length: 20 }).notNull().default('customer'),
  metal:           varchar('metal', { length: 50 }).notNull(),
  purity:          varchar('purity', { length: 20 }).notNull(),
  huid:            varchar('huid', { length: 50 }),
  gross:           numeric('gross', { precision: 10, scale: 3 }).notNull().$type<number>(),
  deduction:       numeric('deduction', { precision: 10, scale: 3 }).notNull().default('0').$type<number>(),
  net:             numeric('net', { precision: 10, scale: 3 }).notNull().$type<number>(),
  purchase_price:  numeric('purchase_price', { precision: 12, scale: 2 }).notNull().default('0').$type<number>(),
  purchase_date:   date('purchase_date'),
  purchased_from:  varchar('purchased_from', { length: 255 }),
  invoice_ref:     varchar('invoice_ref', { length: 100 }),
  provenance:      text('provenance'),
  occasion:        varchar('occasion', { length: 100 }),
  gifted_by:       varchar('gifted_by', { length: 255 }),
  location_type:   varchar('location_type', { length: 60 }),
  location_detail: jsonb('location_detail').notNull().$type<Record<string, string>>().default({}),
  last_verified:   timestamp('last_verified', { withTimezone: true }),
  status:          varchar('status', { length: 20 }).notNull().default('pending'),
  images:          text('images').array().notNull().default(sql`'{}'`),
  appraised_value: numeric('appraised_value', { precision: 12, scale: 2 }).$type<number>(),
  created_at:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const serviceTickets = pgTable('service_tickets', {
  id:               uuid('id').primaryKey().defaultRandom(),
  ticket_ref:       varchar('ticket_ref', { length: 20 }).notNull().unique()
                      .default(sql`'TKT-' || lpad(nextval('ticket_seq')::text, 4, '0')`),
  customer_id:      uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  asset_id:         uuid('asset_id').notNull().references(() => assets.id),
  service_type:     varchar('service_type', { length: 30 }).notNull(),
  status:           varchar('status', { length: 30 }).notNull().default('submitted'),
  priority:         varchar('priority', { length: 10 }).notNull().default('medium'),
  assigned_to:      uuid('assigned_to').references(() => staff.id),
  customer_notes:   text('customer_notes'),
  preferred_date:   date('preferred_date'),
  time_slot:        varchar('time_slot', { length: 50 }),
  visit_type:       varchar('visit_type', { length: 30 }),
  dispatch_address: text('dispatch_address'),
  extra:            jsonb('extra').notNull().$type<Record<string, unknown>>().default({}),
  created_at:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:       timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const reports = pgTable('reports', {
  id:              uuid('id').primaryKey().defaultRandom(),
  report_ref:      varchar('report_ref', { length: 30 }).notNull().unique()
                     .default(sql`'BIS-AV-' || lpad(nextval('report_seq')::text, 6, '0')`),
  ticket_id:       uuid('ticket_id').notNull().references(() => serviceTickets.id, { onDelete: 'cascade' }),
  asset_id:        uuid('asset_id').notNull().references(() => assets.id),
  appraised_value: numeric('appraised_value', { precision: 12, scale: 2 }).notNull().$type<number>(),
  notes:           text('notes'),
  images:          text('images').array().notNull().default(sql`'{}'`),
  status:          varchar('status', { length: 20 }).notNull().default('under_review'),
  appraised_by:    uuid('appraised_by').references(() => staff.id),
  appraised_at:    timestamp('appraised_at', { withTimezone: true }).notNull().defaultNow(),
  created_at:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const documents = pgTable('documents', {
  id:           uuid('id').primaryKey().defaultRandom(),
  asset_id:     uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  customer_id:  uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  type:         varchar('type', { length: 20 }),
  filename:     varchar('filename', { length: 255 }).notNull(),
  storage_path: text('storage_path').notNull(),
  status:       varchar('status', { length: 20 }).notNull().default('pending'),
  created_at:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const transactions = pgTable('transactions', {
  id:           uuid('id').primaryKey().defaultRandom(),
  customer_id:  uuid('customer_id').references(() => customers.id),
  ticket_id:    uuid('ticket_id').references(() => serviceTickets.id),
  asset_id:     uuid('asset_id').references(() => assets.id),
  service_type: varchar('service_type', { length: 30 }),
  amount:       numeric('amount', { precision: 12, scale: 2 }).notNull().$type<number>(),
  status:       varchar('status', { length: 20 }).notNull().default('pending'),
  created_at:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const auditLog = pgTable('audit_log', {
  id:          uuid('id').primaryKey().defaultRandom(),
  actor:       varchar('actor', { length: 255 }).notNull(),
  action:      varchar('action', { length: 100 }).notNull(),
  entity_type: varchar('entity_type', { length: 50 }),
  entity_id:   varchar('entity_id', { length: 100 }),
  detail:      text('detail'),
  metadata:    jsonb('metadata').notNull().$type<Record<string, unknown>>().default({}),
  created_at:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const rates = pgTable('rates', {
  id:          serial('id').primaryKey(),
  gold:        numeric('gold', { precision: 12, scale: 2 }).notNull().$type<number>(),
  silver:      numeric('silver', { precision: 12, scale: 2 }).notNull().$type<number>(),
  platinum:    numeric('platinum', { precision: 12, scale: 2 }).notNull().$type<number>(),
  diamond_usd: numeric('diamond_usd', { precision: 12, scale: 2 }).notNull().$type<number>(),
  fetched_at:  timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CustomerRow    = typeof customers.$inferSelect
export type StaffRow       = typeof staff.$inferSelect
export type AssetRow       = typeof assets.$inferSelect
export type TicketRow      = typeof serviceTickets.$inferSelect
export type ReportRow      = typeof reports.$inferSelect
export type DocumentRow    = typeof documents.$inferSelect
export type TransactionRow = typeof transactions.$inferSelect
export type AuditRow       = typeof auditLog.$inferSelect
export type RatesRow       = typeof rates.$inferSelect
