import { Pool, type PoolClient, type QueryResult } from "pg";

type Params = readonly unknown[];
type QueryTuple = [unknown[], QueryResult];

export interface DbConnection {
  query(sql: string, params?: Params): Promise<QueryTuple>;
  execute(sql: string, params?: Params): Promise<QueryTuple>;
}

function translateParameters(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function requireConnectionString(): string {
  const value = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
  if (!value) {
    throw new Error("SUPABASE_DB_URL must be configured for the Supabase Postgres database.");
  }
  return value;
}

const pool = new Pool({
  connectionString: requireConnectionString(),
  ssl: process.env.SUPABASE_DB_SSL === "false" ? false : { rejectUnauthorized: false },
  max: Number(process.env.SUPABASE_DB_POOL_MAX ?? 10),
});

async function run(client: Pool | PoolClient, sql: string, params: Params = []): Promise<QueryTuple> {
  const result = await client.query(translateParameters(sql), [...params]);
  return [result.rows, result];
}

function connection(client: Pool | PoolClient): DbConnection {
  return {
    query: (sql, params) => run(client, sql, params),
    execute: (sql, params) => run(client, sql, params),
  };
}

export const db = {
  ...connection(pool),
  close: () => pool.end(),

  async transaction<T>(fn: (conn: DbConnection) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    await client.query("BEGIN");
    try {
      const result = await fn(connection(client));
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
};
