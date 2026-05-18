import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST ?? "localhost",
  port: Number(process.env.MYSQL_PORT ?? 3306),
  database: process.env.MYSQL_DATABASE ?? "zimrecruit",
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  ssl: process.env.MYSQL_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  timezone: "Z",
  dateStrings: false,
});

export const db = {
  query: pool.query.bind(pool),
  execute: pool.execute.bind(pool),
  close: pool.end.bind(pool),

  async transaction<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      const result = await fn(conn);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
};
