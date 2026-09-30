import os
import psycopg

conn_str = "postgresql://postgres:Pradeep%402006%23@db.zylqnskatrwnqjyqrftr.supabase.co:5432/postgres"

print("Connecting to Supabase PostgreSQL...")
try:
    with psycopg.connect(conn_str) as conn:
        with conn.cursor() as cur:
            with open(r"r:\discover\schema_supabase.sql", "r", encoding="utf-8") as f:
                sql = f.read()
            print("Executing schema_supabase.sql...")
            cur.execute(sql)
            conn.commit()
            print("SUCCESS: schema_supabase.sql applied successfully to Supabase!")
            
            cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
            tables = [row[0] for row in cur.fetchall()]
            print("Tables in public schema:", tables)
except Exception as e:
    print("ERROR:", e)
