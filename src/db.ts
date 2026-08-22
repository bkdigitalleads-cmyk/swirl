import * as SQLite from 'expo-sqlite';

export type WineType =
  | 'Red'
  | 'White'
  | 'Rosé'
  | 'Sparkling'
  | 'Dessert'
  | 'Fortified'
  | '';

/** Fixed wine categories (chips in the form, section headers in the report). */
export const WINE_TYPES: Exclude<WineType, ''>[] = [
  'Red',
  'White',
  'Rosé',
  'Sparkling',
  'Dessert',
  'Fortified',
];

export interface Tasting {
  id: number;
  name: string; // the wine, e.g. "Caymus Cabernet Sauvignon"
  producer: string; // winery / producer
  vintage: number; // year; 0 = non-vintage / unspecified
  type: WineType;
  varietal: string; // grape(s), e.g. "Cabernet Sauvignon"
  region: string; // e.g. "Napa Valley"
  rating: number; // 0–5 stars; 0 = unrated
  priceCents: number;
  wouldBuy: boolean;
  notes: string;
  createdAt: number;
  updatedAt: number;
  photoCount: number;
  coverPath: string | null; // first photo, for list thumbnails
}

export interface Photo {
  id: number;
  tastingId: number;
  path: string; // filename inside the app photos directory
  createdAt: number;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('swirl.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS tastings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          producer TEXT NOT NULL DEFAULT '',
          vintage INTEGER NOT NULL DEFAULT 0,
          type TEXT NOT NULL DEFAULT '',
          varietal TEXT NOT NULL DEFAULT '',
          region TEXT NOT NULL DEFAULT '',
          rating INTEGER NOT NULL DEFAULT 0,
          price_cents INTEGER NOT NULL DEFAULT 0,
          would_buy INTEGER NOT NULL DEFAULT 0,
          notes TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS photos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tasting_id INTEGER NOT NULL REFERENCES tastings(id) ON DELETE CASCADE,
          path TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_photos_tasting ON photos(tasting_id);
        CREATE INDEX IF NOT EXISTS idx_tastings_type ON tastings(type);
      `);
      return db;
    })();
  }
  return dbPromise;
}

const TASTING_SELECT = `
  SELECT t.*,
    (SELECT COUNT(*) FROM photos p WHERE p.tasting_id = t.id) AS photo_count,
    (SELECT p.path FROM photos p WHERE p.tasting_id = t.id ORDER BY p.id ASC LIMIT 1) AS cover_path
  FROM tastings t
`;

function rowToTasting(row: any): Tasting {
  return {
    id: row.id,
    name: row.name,
    producer: row.producer ?? '',
    vintage: row.vintage ?? 0,
    type: (row.type ?? '') as WineType,
    varietal: row.varietal ?? '',
    region: row.region ?? '',
    rating: row.rating ?? 0,
    priceCents: row.price_cents ?? 0,
    wouldBuy: !!row.would_buy,
    notes: row.notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photoCount: row.photo_count ?? 0,
    coverPath: row.cover_path ?? null,
  };
}

// ---------- tastings ----------

export interface TastingInput {
  name: string;
  producer: string;
  vintage: number;
  type: WineType;
  varietal: string;
  region: string;
  rating: number;
  priceCents: number;
  wouldBuy: boolean;
  notes: string;
}

export async function insertTasting(input: TastingInput): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const res = await db.runAsync(
    `INSERT INTO tastings
       (name, producer, vintage, type, varietal, region, rating, price_cents, would_buy, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name.trim(),
      input.producer.trim(),
      input.vintage,
      input.type,
      input.varietal.trim(),
      input.region.trim(),
      input.rating,
      input.priceCents,
      input.wouldBuy ? 1 : 0,
      input.notes.trim(),
      now,
      now,
    ]
  );
  return res.lastInsertRowId;
}

export async function updateTasting(id: number, input: TastingInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE tastings SET
       name = ?, producer = ?, vintage = ?, type = ?, varietal = ?, region = ?,
       rating = ?, price_cents = ?, would_buy = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
    [
      input.name.trim(),
      input.producer.trim(),
      input.vintage,
      input.type,
      input.varietal.trim(),
      input.region.trim(),
      input.rating,
      input.priceCents,
      input.wouldBuy ? 1 : 0,
      input.notes.trim(),
      Date.now(),
      id,
    ]
  );
}

/** Returns paths of this tasting's photos so the caller can delete the files. */
export async function deleteTasting(id: number): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT path FROM photos WHERE tasting_id = ?', [id]);
  await db.runAsync('DELETE FROM tastings WHERE id = ?', [id]);
  return rows.map((r) => r.path);
}

export async function getTasting(id: number): Promise<Tasting | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(`${TASTING_SELECT} WHERE t.id = ?`, [id]);
  return row ? rowToTasting(row) : null;
}

export async function getTastings(opts?: {
  type?: WineType;
  query?: string;
}): Promise<Tasting[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: any[] = [];
  if (opts?.type) {
    where.push('t.type = ?');
    params.push(opts.type);
  }
  if (opts?.query) {
    const escaped = opts.query.replace(/([%_\\])/g, '\\$1');
    where.push(
      `(t.name LIKE ? ESCAPE '\\' OR t.producer LIKE ? ESCAPE '\\' OR t.varietal LIKE ? ESCAPE '\\' OR t.region LIKE ? ESCAPE '\\' OR t.notes LIKE ? ESCAPE '\\')`
    );
    const like = `%${escaped}%`;
    params.push(like, like, like, like, like);
  }
  const sql = `${TASTING_SELECT}${
    where.length ? ' WHERE ' + where.join(' AND ') : ''
  } ORDER BY t.updated_at DESC LIMIT 2000`;
  const rows = await db.getAllAsync<any>(sql, params);
  return rows.map(rowToTasting);
}

export async function countTastings(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT COUNT(*) AS n FROM tastings');
  return row?.n ?? 0;
}

export interface Stats {
  tastingCount: number;
  avgRating: number; // over rated tastings only; 0 if none rated
  ratedCount: number;
  typesUsed: number;
  photoCount: number;
  wouldBuyCount: number;
}

export async function getStats(): Promise<Stats> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT
       COUNT(*) AS n,
       COALESCE(AVG(CASE WHEN rating > 0 THEN rating END), 0) AS avg_rating,
       COUNT(CASE WHEN rating > 0 THEN 1 END) AS rated,
       COUNT(DISTINCT CASE WHEN type <> '' THEN type END) AS types,
       COUNT(CASE WHEN would_buy = 1 THEN 1 END) AS would_buy
     FROM tastings`
  );
  const p = await db.getFirstAsync<any>('SELECT COUNT(*) AS n FROM photos');
  return {
    tastingCount: row?.n ?? 0,
    avgRating: row?.avg_rating ?? 0,
    ratedCount: row?.rated ?? 0,
    typesUsed: row?.types ?? 0,
    photoCount: p?.n ?? 0,
    wouldBuyCount: row?.would_buy ?? 0,
  };
}

// ---------- photos ----------

export async function addPhoto(tastingId: number, path: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO photos (tasting_id, path, created_at) VALUES (?, ?, ?)', [
    tastingId,
    path,
    Date.now(),
  ]);
}

export async function getPhotos(tastingId: number): Promise<Photo[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM photos WHERE tasting_id = ? ORDER BY id ASC',
    [tastingId]
  );
  return rows.map((r) => ({
    id: r.id,
    tastingId: r.tasting_id,
    path: r.path,
    createdAt: r.created_at,
  }));
}

export async function deletePhoto(id: number): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT path FROM photos WHERE id = ?', [id]);
  await db.runAsync('DELETE FROM photos WHERE id = ?', [id]);
  return row?.path ?? null;
}

/** All tastings grouped by wine type, for the tasting-notebook report. */
export async function getTastingsGroupedByType(): Promise<
  { type: string; tastings: Tasting[] }[]
> {
  const tastings = await getTastings();
  const order = new Map<string, number>(WINE_TYPES.map((t, i) => [t, i]));
  const groups = new Map<string, Tasting[]>();
  for (const t of tastings) {
    const key = t.type || 'Other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }
  return [...groups.entries()]
    .sort((a, b) => {
      const ra = order.has(a[0]) ? order.get(a[0])! : 99;
      const rb = order.has(b[0]) ? order.get(b[0])! : 99;
      return ra - rb || a[0].localeCompare(b[0]);
    })
    .map(([type, list]) => ({ type, tastings: list }));
}

export async function deleteAllData(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT path FROM photos');
  await db.execAsync('DELETE FROM photos; DELETE FROM tastings;');
  return rows.map((r) => r.path);
}

/** CSV export (RFC-4180). */
export async function exportCsv(): Promise<string> {
  const tastings = await getTastings();
  const q = (s: string) => '"' + s.replace(/"/g, '""') + '"';
  const lines = [
    'date,wine,producer,vintage,type,varietal,region,rating_5,price_usd,would_buy,notes',
  ];
  for (const t of [...tastings].reverse()) {
    lines.push(
      [
        new Date(t.createdAt).toISOString().slice(0, 10),
        q(t.name),
        q(t.producer),
        t.vintage > 0 ? String(t.vintage) : '',
        q(t.type),
        q(t.varietal),
        q(t.region),
        t.rating > 0 ? String(t.rating) : '',
        t.priceCents > 0 ? (t.priceCents / 100).toFixed(2) : '',
        t.wouldBuy ? 'yes' : '',
        q(t.notes),
      ].join(',')
    );
  }
  return lines.join('\r\n');
}
