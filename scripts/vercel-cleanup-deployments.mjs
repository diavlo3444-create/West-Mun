/**
 * Prunes old WEST MUN Vercel deployments.
 *
 * Safety:
 * - Keeps the newest 3 deployments overall.
 * - Keeps the newest 3 Production deployments.
 * - Keeps the currently active Production deployment.
 * - Keeps any deployment with an alias.
 * - Only considers deployments at least MIN_AGE_HOURS old.
 * - Only deletes completed deployments (READY, ERROR, CANCELED).
 *
 * Vercel may retain deleted deployment data during its recovery period,
 * so deletion does not guarantee an immediate storage-meter reduction.
 */

const API = "https://api.vercel.com";
const PROJECT_ID = "prj_WztjiUnC1gSenYZbQPub19D0Gq60";
const TEAM_ID = "team_a9B6p57oh8mW7vrKjKybUTLW";
const TOKEN = process.env.VERCEL_TOKEN;
const MIN_AGE_HOURS = Number(process.env.MIN_AGE_HOURS || "24");

if (!TOKEN) {
  throw new Error("Missing VERCEL_TOKEN. Add it as a GitHub Actions repository secret.");
}
if (!Number.isFinite(MIN_AGE_HOURS) || MIN_AGE_HOURS < 24) {
  throw new Error("MIN_AGE_HOURS must be at least 24.");
}

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(options.headers || {}),
    },
  });
  const body = await response.text();
  let data;
  try { data = body ? JSON.parse(body) : {}; } catch { data = { raw: body }; }
  if (!response.ok) {
    const error = new Error(`Vercel API ${response.status}: ${JSON.stringify(data)}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function listAllDeployments() {
  const all = [];
  let until;
  for (let page = 0; page < 30; page += 1) {
    const params = new URLSearchParams({
      projectId: PROJECT_ID,
      teamId: TEAM_ID,
      limit: "100",
    });
    if (until !== undefined) params.set("until", String(until));
    const result = await api(`/v6/deployments?${params}`);
    const items = result.deployments || [];
    if (items.length === 0) break;
    all.push(...items);
    const oldest = Math.min(...items.map(item => Number(item.createdAt || Infinity)));
    if (!Number.isFinite(oldest) || items.length < 100 || oldest >= (until ?? Infinity)) break;
    until = oldest - 1;
  }
  const unique = new Map();
  for (const deployment of all) {
    const id = deployment.uid || deployment.id;
    if (id) unique.set(id, { ...deployment, uid: id });
  }
  return [...unique.values()].sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
}

async function main() {
  const [deployments, project] = await Promise.all([
    listAllDeployments(),
    api(`/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}`),
  ]);

  const latestOverall = new Set(deployments.slice(0, 3).map(d => d.uid));
  const production = deployments.filter(d => d.target === "production");
  const latestProduction = new Set(production.slice(0, 3).map(d => d.uid));
  const activeProductionId =
    project.latestDeployment?.id ||
    project.latestDeployment?.uid ||
    project.targets?.production?.id ||
    null;

  const cutoff = Date.now() - MIN_AGE_HOURS * 60 * 60 * 1000;
  const candidates = deployments.filter(d => {
    if (latestOverall.has(d.uid) || latestProduction.has(d.uid)) return false;
    if (d.uid === activeProductionId) return false;
    if (Array.isArray(d.alias) && d.alias.length > 0) return false;
    if (Array.isArray(d.aliases) && d.aliases.length > 0) return false;
    if (Number(d.createdAt) > cutoff) return false;
    if (!["READY", "ERROR", "CANCELED"].includes(d.readyState)) return false;
    return true;
  });

  console.log(`Found ${deployments.length} deployments; ${candidates.length} eligible for deletion.`);
  console.log(`Keeping 3 newest overall, 3 newest Production, active Production, and aliased deployments.`);

  let deleted = 0;
  let skipped = 0;
  for (const deployment of candidates) {
    const label = deployment.url || deployment.uid;
    try {
      await api(`/v13/deployments/${encodeURIComponent(deployment.uid)}?teamId=${TEAM_ID}`, {
        method: "DELETE",
      });
      deleted += 1;
      console.log(`Deleted: ${label} (${deployment.readyState}, ${new Date(deployment.createdAt).toISOString()})`);
    } catch (error) {
      skipped += 1;
      console.log(`Skipped: ${label} — ${error.message}`);
    }
  }

  console.log(`Finished. Deleted: ${deleted}; skipped/protected: ${skipped}.`);
  console.log("Note: Vercel's recovery period can delay permanent storage reclamation.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
