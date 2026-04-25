import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Database Setup
  const db = new Database("ledger.db");
  
  // Disable foreign keys during drop to avoid constraints crashing the server on start
  db.pragma("foreign_keys = OFF");

  // Initialize Tables
  db.exec("DROP TABLE IF EXISTS ledger_entries;");
  db.exec("DROP TABLE IF EXISTS payouts;");
  db.exec("DROP TABLE IF EXISTS idempotency_keys;");
  db.exec("DROP TABLE IF EXISTS transactions;");
  db.exec("DROP TABLE IF EXISTS entries;");
  db.exec("DROP TABLE IF EXISTS accounts;");
  db.exec("DROP TABLE IF EXISTS merchants;");

  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      available_balance INTEGER DEFAULT 0, -- in paise
      held_balance INTEGER DEFAULT 0 -- in paise
    );

    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      response_status INTEGER,
      response_body TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id)
    );

    CREATE TABLE IF NOT EXISTS payouts (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      amount_paise INTEGER NOT NULL,
      bank_account_id TEXT NOT NULL,
      status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
      idempotency_key TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      retry_count INTEGER DEFAULT 0,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id)
    );

    CREATE TABLE IF NOT EXISTS ledger_entries (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      amount INTEGER NOT NULL, -- positive for credit, negative for debit
      payout_id TEXT, -- optional link to payout
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id)
    );
  `);

  // Seed initial merchants if empty
  const count = db.prepare("SELECT count(*) as count FROM merchants").get() as { count: number };
  if (count.count === 0) {
    const insertMerchant = db.prepare("INSERT INTO merchants (id, name, available_balance) VALUES (?, ?, ?)");
    insertMerchant.run("merch_01", "Design Studio X", 500000); // 5,000.00 INR
    insertMerchant.run("merch_02", "Alex Freelance", 250000); // 2,500.00 INR
    
    const insertLedger = db.prepare("INSERT INTO ledger_entries (id, merchant_id, amount, description) VALUES (?, ?, ?, ?)");
    insertLedger.run(uuidv4(), "merch_01", 500000, "Initial Credit from Int'l Customer");
    insertLedger.run(uuidv4(), "merch_02", 250000, "Payment for Web Audit");
  }

  // Idempotency Middleware
  const idempotencyGuard = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = req.header("Idempotency-Key");
    const merchantId = req.body.merchant_id;
    if (!key || !merchantId) return next();

    const existing = db.prepare("SELECT * FROM idempotency_keys WHERE key = ? AND merchant_id = ?").get(key, merchantId) as any;
    if (existing) {
      return res.status(existing.response_status).json(JSON.parse(existing.response_body));
    }
    next();
  };

  // API Routes
  app.get("/api/v1/merchants/:id", (req, res) => {
    const merchant = db.prepare("SELECT * FROM merchants WHERE id = ?").get(req.params.id);
    res.json(merchant);
  });

  app.get("/api/v1/payouts/:merchantId", (req, res) => {
    const payouts = db.prepare("SELECT * FROM payouts WHERE merchant_id = ? ORDER BY created_at DESC").all(req.params.merchantId);
    res.json(payouts);
  });

  app.get("/api/v1/ledger/:merchantId", (req, res) => {
    const entries = db.prepare("SELECT * FROM ledger_entries WHERE merchant_id = ? ORDER BY created_at DESC").all(req.params.merchantId);
    res.json(entries);
  });

  app.post("/api/v1/payouts", idempotencyGuard, (req, res) => {
    const { merchant_id, amount_paise, bank_account_id } = req.body;
    const idempotencyKey = req.header("Idempotency-Key");

    if (!merchant_id || !amount_paise || !bank_account_id || amount_paise <= 0) {
      return res.status(400).json({ error: "Invalid payout parameters" });
    }

    const payoutId = uuidv4();

    try {
      const result = db.transaction(() => {
        // 1. Concurrency Check: Get merchant with FOR UPDATE equivalent (SQLite uses BEGIN IMMEDIATE)
        const merchant = db.prepare("SELECT available_balance FROM merchants WHERE id = ?").get(merchant_id) as any;
        if (!merchant) throw new Error("Merchant not found");
        if (merchant.available_balance < amount_paise) throw new Error("Insufficient available balance");

        // 2. Create Payout as Pending
        db.prepare(`
          INSERT INTO payouts (id, merchant_id, amount_paise, bank_account_id, status, idempotency_key)
          VALUES (?, ?, ?, ?, 'pending', ?)
        `).run(payoutId, merchant_id, amount_paise, bank_account_id, idempotencyKey);

        // 3. Move funds to held_balance (Atomically)
        db.prepare(`
          UPDATE merchants 
          SET available_balance = available_balance - ?, 
              held_balance = held_balance + ?
          WHERE id = ?
        `).run(amount_paise, amount_paise, merchant_id);

        return { id: payoutId, status: "pending", amount_paise };
      })();

      if (idempotencyKey) {
        db.prepare("INSERT INTO idempotency_keys (key, merchant_id, response_status, response_body) VALUES (?, ?, ?, ?)")
          .run(idempotencyKey, merchant_id, 201, JSON.stringify(result));
      }

      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Simulated Payout Processor Worker
  async function payoutProcessor() {
    while (true) {
      try {
        // 1. Pick up pending payouts
        const pending = db.prepare("SELECT * FROM payouts WHERE status = 'pending' LIMIT 5").all() as any[];
        
        for (const p of pending) {
          // Move to 'processing'
          db.prepare("UPDATE payouts SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(p.id);
          
          // Wait to simulate bank delay
          await new Promise(r => setTimeout(r, 2000));

          const roll = Math.random();
          if (roll < 0.7) {
            // SUCCESS (70%)
            db.transaction(() => {
              // Mark as completed
              db.prepare("UPDATE payouts SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(p.id);
              // Deduct from held_balance permanently
              db.prepare("UPDATE merchants SET held_balance = held_balance - ? WHERE id = ?").run(p.amount_paise, p.merchant_id);
              // Create Ledger Entry for Debit
              db.prepare(`
                INSERT INTO ledger_entries (id, merchant_id, amount, payout_id, description)
                VALUES (?, ?, ?, ?, ?)
              `).run(uuidv4(), p.merchant_id, -p.amount_paise, p.id, `Payout to ${p.bank_account_id}`);
            })();
          } else if (roll < 0.9) {
            // FAILURE (20%)
            db.transaction(() => {
              // Mark as failed
              db.prepare("UPDATE payouts SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(p.id);
              // Move funds back from held to available
              db.prepare("UPDATE merchants SET available_balance = available_balance + ?, held_balance = held_balance - ? WHERE id = ?")
                .run(p.amount_paise, p.amount_paise, p.merchant_id);
            })();
          } else {
            // HANG IN PROCESSING (10%) - already in processing, will be handled by retry logic if needed
            console.log(`Payout ${p.id} hung in processing`);
          }
        }

        // 2. Retry Logic: Stuck in processing for > 30 seconds
        const stuck = db.prepare(`
          SELECT * FROM payouts 
          WHERE status = 'processing' 
          AND datetime(updated_at) < datetime('now', '-30 seconds') 
          AND retry_count < 3
        `).all() as any[];

        for (const s of stuck) {
          console.log(`Retrying stuck payout ${s.id}`);
          db.prepare("UPDATE payouts SET status = 'pending', retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .run(s.id);
        }

        // 3. Final Failure for max retries
        const maxRetried = db.prepare(`
          SELECT * FROM payouts 
          WHERE status = 'processing' 
          AND datetime(updated_at) < datetime('now', '-30 seconds') 
          AND retry_count >= 3
        `).all() as any[];

        for (const m of maxRetried) {
          db.transaction(() => {
            db.prepare("UPDATE payouts SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(m.id);
            db.prepare("UPDATE merchants SET available_balance = available_balance + ?, held_balance = held_balance - ? WHERE id = ?")
              .run(m.amount_paise, m.amount_paise, m.merchant_id);
          })();
          console.log(`Payout ${m.id} permanently failed after max retries. Funds reversed.`);
        }

      } catch (e) {
        console.error("Processor Error:", e);
      }
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  payoutProcessor();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
