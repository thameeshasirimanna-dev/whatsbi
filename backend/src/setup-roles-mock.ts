import pg from 'pg';
const { Client } = pg;

const databaseUrl = "postgresql://root:root%401234tks@46.250.237.10:5432/whatsbi_db";

async function run() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log("Connected successfully!");

    console.log("Checking and creating authenticated and service_role roles...");
    await client.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
              CREATE ROLE authenticated;
          END IF;
          IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
              CREATE ROLE service_role;
          END IF;
      END $$;
    `);
    console.log("Roles checked/created successfully!");
  } catch (err: any) {
    console.error("Failed:", err.message);
  } finally {
    await client.end();
  }
}

run();
