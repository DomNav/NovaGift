import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ContactUpsert, ContactQuery } from "../schemas/contact";

const r = Router();

/** List with search + tag */
r.get("/", async (req, res, next) => {
  try {
    const { q, tag, page, pageSize } = ContactQuery.parse(req.query);
    const where: any = {
      AND: [
        q
          ? {
              OR: [
                { displayName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { wallet: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
        tag ? { tags: { array_contains: tag } } : {},
      ],
    };
    const [items, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.contact.count({ where }),
    ]);
    res.json({ items, total, page, pageSize });
  } catch (e) {
    next(e);
  }
});

/** Create */
r.post("/", async (req, res, next) => {
  try {
    const body = ContactUpsert.parse(req.body);
    if (!body.email && !body.wallet) throw new Error("email or wallet is required");
    const created = await prisma.contact.create({ data: { ...body, tags: body.tags } });
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

/** Update */
r.put("/:id", async (req, res, next) => {
  try {
    const id = z.string().cuid().parse(req.params.id);
    const body = ContactUpsert.parse(req.body);
    const updated = await prisma.contact.update({ where: { id }, data: { ...body, tags: body.tags } });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/** Delete (single or bulk via ids query) */
r.delete("/", async (req, res, next) => {
  try {
    const ids = z.array(z.string().cuid()).parse(
      Array.isArray(req.query.id) ? req.query.id : String(req.query.id || "").split(",").filter(Boolean)
    );
    const result = await prisma.contact.deleteMany({ where: { id: { in: ids } } });
    res.json({ deleted: result.count });
  } catch (e) {
    next(e);
  }
});

/** CSV import */
r.post("/import", async (req, res, next) => {
  try {
    const { csv } = z.object({ csv: z.string().min(1) }).parse(req.body);
    const rows = csv.trim().split(/\r?\n/).slice(1);
    const toCreate = [] as any[];
    for (const raw of rows) {
      const [displayName, email, wallet, tagsCsv] = raw.split(",").map((s) => s?.trim() ?? "");
      const parsed = ContactUpsert.parse({
        displayName,
        email: email || undefined,
        wallet: wallet || undefined,
        tags: tagsCsv ? tagsCsv.split("|").map((t) => t.trim()).filter(Boolean) : [],
      });
      if (!parsed.email && !parsed.wallet) continue;
      toCreate.push(parsed);
    }
    const created = await prisma.$transaction(
      toCreate.map((data) => prisma.contact.create({ data: { ...data, tags: data.tags } })),
      { timeout: 15_000 }
    );
    res.json({ created: created.length });
  } catch (e) {
    next(e);
  }
});

export default r;
