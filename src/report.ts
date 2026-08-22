/**
 * Tasting-notebook PDF, generated fully on-device with expo-print.
 * A shareable record of every wine you've tasted — labels, ratings,
 * notes, producers and regions — grouped by type.
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getTastingsGroupedByType, getPhotos, getStats, Tasting } from './db';
import { photoThumbBase64 } from './photos';
import { formatCents } from './money';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function starsHtml(rating: number): string {
  if (rating <= 0) return '<span class="unrated">unrated</span>';
  const full = '★'.repeat(rating);
  const empty = '☆'.repeat(5 - rating);
  return `<span class="stars">${full}<span class="starsdim">${empty}</span></span>`;
}

async function tastingRow(t: Tasting): Promise<string> {
  let thumb = '';
  if (t.photoCount > 0) {
    const photos = await getPhotos(t.id);
    if (photos.length > 0) {
      const b64 = await photoThumbBase64(photos[0].path);
      if (b64) {
        thumb = `<img src="data:image/jpeg;base64,${b64}" style="width:56px;height:56px;object-fit:cover;border-radius:6px;" />`;
      }
    }
  }
  const sub: string[] = [];
  if (t.producer) sub.push(esc(t.producer));
  if (t.vintage > 0) sub.push(String(t.vintage));
  if (t.varietal) sub.push(esc(t.varietal));
  if (t.region) sub.push(esc(t.region));
  const extra: string[] = [];
  if (t.priceCents > 0) extra.push(formatCents(t.priceCents));
  if (t.wouldBuy) extra.push('Buy again');
  return `
    <tr>
      <td class="thumb">${thumb}</td>
      <td>
        <div class="name">${esc(t.name)}</div>
        ${sub.length ? `<div class="meta">${sub.join(' · ')}</div>` : ''}
        ${t.notes ? `<div class="notes">${esc(t.notes)}</div>` : ''}
        ${extra.length ? `<div class="extra">${extra.join(' · ')}</div>` : ''}
      </td>
      <td class="rating">${starsHtml(t.rating)}</td>
    </tr>`;
}

export async function buildReportHtml(): Promise<string> {
  const groups = await getTastingsGroupedByType();
  const stats = await getStats();
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let sections = '';
  for (const g of groups) {
    const rows: string[] = [];
    for (const t of g.tastings) rows.push(await tastingRow(t));
    sections += `
      <h2>${esc(g.type)} <span class="count">${g.tastings.length}</span></h2>
      <table>${rows.join('')}</table>`;
  }

  const avg = stats.ratedCount > 0 ? stats.avgRating.toFixed(1) : '—';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #2a1518; margin: 32px; }
  h1 { font-size: 22px; margin: 0 0 2px; }
  .sub { color: #6e585b; font-size: 12px; margin-bottom: 4px; }
  .summary { background: #f7edf0; border: 1px solid #e6c4cf; border-radius: 10px; padding: 12px 16px; margin: 16px 0 8px; font-size: 13px; }
  .summary b { font-size: 16px; }
  h2 { font-size: 15px; border-bottom: 2px solid #7b1e3b; padding-bottom: 4px; margin: 22px 0 6px; }
  .count { float: right; color: #7b1e3b; font-weight: 600; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; }
  td { border-bottom: 1px solid #ecdcd9; padding: 8px 6px; vertical-align: top; font-size: 12px; }
  td.thumb { width: 60px; }
  td.rating { text-align: right; white-space: nowrap; width: 92px; }
  .name { font-weight: 600; font-size: 13px; }
  .meta { color: #6e585b; font-size: 11px; margin-top: 2px; }
  .notes { color: #3f2a2e; font-size: 11px; margin-top: 3px; line-height: 1.35; }
  .extra { color: #7b1e3b; font-size: 11px; margin-top: 3px; font-weight: 600; }
  .stars { color: #7b1e3b; font-size: 13px; letter-spacing: 1px; }
  .starsdim { color: #d8b9c2; }
  .unrated { color: #a8918f; font-size: 11px; font-style: italic; }
  .footer { margin-top: 28px; color: #a8918f; font-size: 10px; text-align: center; }
</style></head>
<body>
  <h1>My Wine Tasting Journal</h1>
  <div class="sub">Generated ${today} · Swirl for iPhone · All data stored on-device</div>
  <div class="summary">
    <b>${stats.tastingCount}</b> wine${stats.tastingCount === 1 ? '' : 's'} tasted
    &nbsp;·&nbsp; average rating <b>${avg}</b>${stats.ratedCount > 0 ? ' / 5' : ''}
    &nbsp;·&nbsp; ${stats.wouldBuyCount} to buy again
  </div>
  ${sections}
  <div class="footer">Cheers — poured and noted with Swirl.</div>
</body></html>`;
}

export async function generateAndSharePdf(): Promise<void> {
  const html = await buildReportHtml();
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Your wine tasting journal',
      UTI: 'com.adobe.pdf',
    });
  }
}
