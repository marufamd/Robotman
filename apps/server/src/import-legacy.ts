import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { applyPlan } from './legacy-import/apply.js';
import { planImport, type LegacyExport } from './legacy-import/plan.js';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const file = args[args.indexOf('--file') + 1];
if (!file || file.startsWith('--')) { console.error('Usage: import-legacy --file <export.json> [--dry-run] [--json]'); process.exit(2); }
const data = JSON.parse(readFileSync(file, 'utf8')) as LegacyExport;
if (!Array.isArray(data.auto_responses) || !Array.isArray(data.history)) { console.error('The export must contain auto_responses and history arrays.'); process.exit(2); }

const plan = planImport(data);
const dryRun = flag('--dry-run');
let written: Record<string, number> | undefined;
if (!dryRun) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('DATABASE_URL is required.'); process.exit(2); }
  const sql = postgres(url, { max: 1 });
  try { written = await applyPlan(sql, plan); } finally { await sql.end(); }
}
const report = { dryRun, imported: { responses: plan.responses.length, recommendations: plan.recommendations.length, history: plan.history.length }, skipped: plan.skipped, written: written ?? null, warnings: plan.warnings, unmapped: plan.unmapped };
if (flag('--json')) console.log(JSON.stringify(report));
else {
  if (written) console.log(`Wrote ${written.responses} new Responses, ${written.recommendations} new Recommendation Entries and ${written.history} new history events (already present rows were left alone).`);
  else console.log(`Dry run: the export contains ${report.imported.responses} Responses, ${report.imported.recommendations} Recommendation Entries and ${report.imported.history} history events; nothing was written.`);
  if (plan.skipped.recommendationHistory) console.log(`Left out ${plan.skipped.recommendationHistory} history events for recommendations that no longer exist.`);
  for (const issue of [...plan.warnings, ...plan.unmapped]) console.log(`- ${issue.reason}: ${issue.name ?? ''} (legacy #${issue.legacyId ?? '?'}, guild ${issue.guild ?? '?'}) ${issue.detail ?? ''}`);
}
