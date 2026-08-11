import { pool } from '../../db';

describe('Database schema constraints', () => {
  it('inventory table has warehouse column with default Ganga', async () => {
    const res = await pool.query(`
      SELECT column_name, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'inventory' AND column_name = 'warehouse'
    `);
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].column_default).toContain('Ganga');
    expect(res.rows[0].is_nullable).toBe('NO');
  });

  it('inventory has composite unique index on (product_id, warehouse)', async () => {
    const res = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'inventory' AND indexdef ILIKE '%product_id%warehouse%'
    `);
    expect(res.rows.length).toBeGreaterThan(0);
  });

  it('stock_movements has warehouse column', async () => {
    const res = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'stock_movements' AND column_name = 'warehouse'
    `);
    expect(res.rows.length).toBe(1);
  });

  it('orders table has warehouse column', async () => {
    const res = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'warehouse'
    `);
    expect(res.rows.length).toBe(1);
  });

  it('users table enforces unique email constraint', async () => {
    await expect(
      pool.query(`
        INSERT INTO users (name, email, password_hash, role)
        VALUES ('Dup Test', 'admin@toyshop.com', 'hash', 'staff')
      `)
    ).rejects.toThrow(/unique/i);
  });
});
