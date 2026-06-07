// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  keycloakId: string
  username: string
  email: string
  roles: string[]
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser
  }
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message)
    this.name = 'AppError'
  }
}

// ─── DB row types ─────────────────────────────────────────────────────────────

export interface Customer {
  id: string
  keycloak_id: string
  full_name: string
  mobile: string
  email: string
  address: string | null
  tfa: string
  status: string
  created_at: Date
  updated_at: Date
}

export interface Staff {
  id: string
  keycloak_id: string | null
  full_name: string
  email: string
  mobile: string | null
  role: 'admin' | 'ticket_manager'
  status: string
  last_login: Date | null
  created_at: Date
  updated_at: Date
}

export interface Asset {
  id: string
  asset_ref: string
  customer_id: string
  name: string
  category: string
  perspective: string
  metal: string
  purity: string
  huid: string | null
  gross: number
  deduction: number
  net: number
  purchase_price: number
  purchase_date: string | null
  purchased_from: string | null
  invoice_ref: string | null
  provenance: string | null
  occasion: string | null
  gifted_by: string | null
  location_type: string | null
  location_detail: Record<string, string>
  last_verified: Date | null
  status: string
  images: string[]
  appraised_value: number | null
  created_at: Date
  updated_at: Date
}

export interface ServiceTicket {
  id: string
  ticket_ref: string
  customer_id: string
  asset_id: string
  service_type: string
  status: string
  priority: string
  assigned_to: string | null
  customer_notes: string | null
  preferred_date: string | null
  time_slot: string | null
  visit_type: string | null
  dispatch_address: string | null
  extra: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

export interface Report {
  id: string
  report_ref: string
  ticket_id: string
  asset_id: string
  appraised_value: number
  notes: string | null
  images: string[]
  status: string
  appraised_by: string | null
  appraised_at: Date
  created_at: Date
  updated_at: Date
}

export interface Document {
  id: string
  asset_id: string
  customer_id: string
  type: string | null
  filename: string
  storage_path: string
  status: string
  created_at: Date
  updated_at: Date
}

export interface Transaction {
  id: string
  customer_id: string | null
  ticket_id: string | null
  asset_id: string | null
  service_type: string | null
  amount: number
  status: string
  created_at: Date
}

export interface AuditEntry {
  id: string
  actor: string
  action: string
  entity_type: string | null
  entity_id: string | null
  detail: string | null
  metadata: Record<string, unknown>
  created_at: Date
}

export interface Rates {
  id: number
  gold: number
  silver: number
  platinum: number
  diamond_usd: number
  fetched_at: Date
}

// ─── Input types ──────────────────────────────────────────────────────────────

export type CreateAssetInput = Pick<
  Asset,
  'name' | 'category' | 'metal' | 'purity' | 'gross' | 'net'
> & Partial<Omit<Asset, 'id' | 'asset_ref' | 'customer_id' | 'status' | 'appraised_value' | 'last_verified' | 'created_at' | 'updated_at'>>

export type UpdateAssetInput = Partial<Omit<Asset, 'id' | 'asset_ref' | 'customer_id' | 'created_at'>>

export type CreateTicketInput = Pick<ServiceTicket, 'asset_id' | 'service_type'> &
  Partial<Omit<ServiceTicket, 'id' | 'ticket_ref' | 'customer_id' | 'status' | 'priority' | 'assigned_to' | 'created_at' | 'updated_at'>>

export type CreateReportInput = Pick<Report, 'ticket_id' | 'asset_id' | 'appraised_value'> &
  Partial<Omit<Report, 'id' | 'report_ref' | 'appraised_by' | 'appraised_at' | 'created_at' | 'updated_at'>>

export type UpdateReportInput = Partial<Pick<Report, 'appraised_value' | 'notes' | 'images' | 'status'>>

export type CreateCustomerInput = Pick<Customer, 'keycloak_id' | 'full_name' | 'mobile' | 'email'> &
  Partial<Pick<Customer, 'address' | 'tfa'>>

export type CreateStaffInput = Pick<Staff, 'full_name' | 'email' | 'role'> & Partial<Pick<Staff, 'mobile' | 'keycloak_id'>>

export type UpdateStaffInput = Partial<Pick<Staff, 'full_name' | 'email' | 'mobile' | 'role' | 'status'>>
