import { Router } from "express";
import { Horizon } from "@stellar/stellar-sdk";

const r = Router();
const horizon = new Horizon.Server(process.env.HORIZON_URL!);

r.get("/balances/:account", async (req, res, next) => {
  try {
    const { account } = req.params;
    const acc = await horizon.loadAccount(account);
    const balances = acc.balances.map((b: any) => {
      if (b.asset_type === "native") return { code: "XLM", issuer: null, balance: b.balance };
      return { code: b.asset_code || "UNKNOWN", issuer: b.asset_issuer || null, balance: b.balance };
    });
    const xlm = balances.find(b => b.code === "XLM")?.balance ?? "0";
    res.json({ ok: true, account, xlm, balances });
  } catch (e) { next(e); }
});

export default r;