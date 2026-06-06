import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema.js'

// Make the pg driver return NUMERIC/DECIMAL as JS numbers (not strings)
pg.types.setTypeParser(pg.types.builtins.NUMERIC, parseFloat)
pg.types.setTypeParser(pg.types.builtins.INT8, parseInt)

const { Pool } = pg

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })
pool.on('error', (err) => console.error('Unexpected pg pool error', err))

export const db = drizzle(pool, { schema })
