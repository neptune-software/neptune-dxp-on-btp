import { Client } from "pg";
import express from "express";
import xsenv from "@sap/xsenv";

const app = express();

app.listen(process.env.PORT, async () => {
  console.log(`Example app listening on port ${process.env.PORT}`);

  const pg = xsenv.serviceCredentials({ label: "postgresql-db" });

  const client = new Client({
    user: pg.username as string,
    password: pg.password as string,
    host: pg.hostname as string,
    port: pg.port as number,
    database: pg.dbname as string,
    ssl: {
      rejectUnauthorized: false,
      ca: pg.sslcert as string,
    },
  });

  await client.connect();

  try {
    const res = await client.query("CREATE SCHEMA IF NOT EXISTS planet9;");
    console.log(res);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
});

app.get("/", async (req, res) => {
  res.send("App is running");
});
