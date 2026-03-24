import { Pool } from "pg";

import { env } from "../config/env.js";

let pool: Pool | null = null;

export function getPool(): Pool | null {
  // Returning null is intentional: the rest of the app treats this as a signal
  // to use mock data instead of failing hard during local UI development.
  if (env.USE_MOCK_DATA || !env.DATABASE_URL) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
    });
  }

  return pool;
}
