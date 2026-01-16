/* scripts/dataset_issue_bot.js
 * Flow:
 * - On issues opened/edited: validate fields and comment feedback.
 * - On issues labeled with "dataset:approved": re-validate; if OK, open PR updating site/data/datasets.json.
 */

const fs = require("fs");
const path = require("path");
const github = require("@actions/github");

const DATASETS_PATH = "site/data/datasets.json";
const APPROVE_LABEL = "dataset:approved";
const CREATED_LABEL = "dataset:pr-created";
const NEEDS_INFO_LABEL = "dataset:needs-info";

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function parseIssueForm(body) {
  // GitHub issue forms render as markdown like:
  // ### Dataset ID
  // MINC-2500
  // We'll parse "### <label>\n<value>" blocks.
  const sections = {};
  const re = /^###\s+(.+?)\s*\n([\s\S]*?)(?=\n###\s+|\n$)/gm;
  let m;
  while ((m = re.exec(body)) !== null) {
    const key = m[1].trim().toLowerCase();
    const raw = m[2].trim();
    sections[key] = raw === "_No response_" ? "" : raw;
  }

  const get = (label) => sections[label.toLowerCase()] || "";

  // Helpers for comma-separated lists
  const list = (s) =>
    (s || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const record = {
    dataset: {
      id: get("Dataset ID"),
      name: get("Dataset Name"),
      year: get("Year"),
      authors: get("Authors"),
      doi: get("DOI (optional)"),
      paper_url: get("Paper URL (optional)"),
      access: get("Access URL"),
      license: get("License"),
      data_modality: get("Data Modality"),
      annotation_types: list(get("Annotation Types")),
      potential_tasks: list(get("Potential Tasks")),
    },
    submission: {
      submitter: {
        name: get("Submitter Name"),
        email: get("Submitter Email"),
        affiliation: get("Submitter Affiliation"),
        github: get("Submitter GitHub (optional)"),
      },
      authorship: {
        // store normalized status; map from dropdown text
        status: "",
        permission_statement: get("Permission statement (required if third-party)"),
      },
      agreements: {
        // Issue forms checkboxes show as "- [x] text" in body, but the "Agreements" section
        // itself won't appear as a simple value reliably.
        // We'll detect checked boxes from full body text.
        confirm_contact_is_current: false,
        confirm_metadata_accuracy: false,
        confirm_license_accuracy: false,
        confirm_no_private_data: false,
        agree_to_publication: false,
      },
    },
    _raw: { sections, body },
  };

  const auth = get("Authorship");
  if (auth.includes("author")) record.submission.authorship.status = "author";
  else if (auth.includes("third party")) record.submission.authorship.status = "third_party_with_permission";

  // detect checkbox states
  const checked = (needle) => new RegExp(`- \\[x\\] ${escapeRegExp(needle)}`, "i").test(body);

  record.submission.agreements.confirm_contact_is_current = checked("My contact information is current.");
  record.submission.agreements.confirm_metadata_accuracy = checked(
    "I confirm the metadata is accurate to the best of my knowledge."
  );
  record.submission.agreements.confirm_license_accuracy = checked("I confirm the license information is accurate.");
  record.submission.agreements.confirm_no_private_data = checked("This submission contains no private/sensitive information.");
  record.submission.agreements.agree_to_publication = checked("I agree this record may be published in OpenConstruction.");

  return record;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeLicense(s) {
  // Keep this minimal; you can expand allowlist/aliases later.
  const t = (s || "").trim();
  const map = {
    "CC-BY 4.0": "CC BY 4.0",
    "CC BY4.0": "CC BY 4.0",
    "Apache 2.0": "APACHE-2.0",
    "Apache-2": "APACHE-2.0",
  };
  return map[t] || t;
}

function validate(parsed) {
  const errs = [];
  const warn = [];

  const d = parsed.dataset;
  const s = parsed.submission;

  // Required core fields
  const req = [
    ["Dataset ID", d.id],
    ["Dataset Name", d.name],
    ["Year", d.year],
    ["Authors", d.authors],
    ["Access URL", d.access],
    ["License", d.license],
    ["Data Modality", d.data_modality],
  ];
  for (const [k, v] of req) if (!String(v || "").trim()) errs.push(`Missing **${k}**.`);

  if (!Array.isArray(d.annotation_types) || d.annotation_types.length === 0)
    errs.push("Missing **Annotation Types** (provide at least 1).");
  if (!Array.isArray(d.potential_tasks) || d.potential_tasks.length === 0)
    errs.push("Missing **Potential Tasks** (provide at least 1).");

  // ID format
  if (d.id && !/^[A-Za-z0-9][A-Za-z0-9\-_.]*$/.test(d.id))
    errs.push("Dataset ID must use only letters/numbers and `- _ .` (no spaces).");

  // Year integer
  if (d.year) {
    const y = Number(String(d.year).trim());
    if (!Number.isInteger(y)) errs.push("Year must be an integer (e.g., 2015).");
    else if (y < 1900 || y > new Date().getFullYear() + 1) warn.push("Year looks unusual—please double-check.");
  }

  // URLs basic check
  const urlFields = [
    ["Access URL", d.access],
    ["DOI", d.doi],
    ["Paper URL", d.paper_url],
  ];
  for (const [k, v] of urlFields) {
    if (v && v.trim() && !/^https?:\/\//i.test(v.trim())) warn.push(`${k} should be a full URL starting with http(s)://`);
  }

  // Submitter info
  const sreq = [
    ["Submitter Name", s.submitter.name],
    ["Submitter Email", s.submitter.email],
    ["Submitter Affiliation", s.submitter.affiliation],
  ];
  for (const [k, v] of sreq) if (!String(v || "").trim()) errs.push(`Missing **${k}**.`);

  // Authorship rules
  if (!s.authorship.status) errs.push("Missing **Authorship** selection.");
  if (s.authorship.status === "third_party_with_permission" && !String(s.authorship.permission_statement || "").trim())
    errs.push("Permission statement is required for third-party submissions.");

  // Agreements must all be true
  const a = s.agreements;
  for (const [k, v] of Object.entries(a)) {
    if (v !== true) errs.push(`Agreement not confirmed: **${k}**.`);
  }

  // License normalization + allowlist warning (not hard fail)
  const lic = normalizeLicense(d.license);
  if (lic !== d.license) warn.push(`License will be normalized to \`${lic}\`.`);

  return { ok: errs.length === 0, errs, warn, normalized_license: lic };
}

function buildDatasetsJsonUpdate(existingObj, parsed, normalized_license) {
  const d = parsed.dataset;

  // This record shape should match your datasets.json “entry” format.
  // Keep fields you already use; add more later.
  const entry = {
    name: d.name.trim(),
    authors: d.authors.trim(),
    year: Number(String(d.year).trim()),
    doi: d.doi?.trim() || undefined,
    paper_url: d.paper_url?.trim() || undefined,
    access: d.access.trim(),
    license: normalized_license,
    data_modality: d.data_modality.trim(),
    annotation_types: d.annotation_types,
    potential_tasks: d.potential_tasks,
  };

  // Remove undefined keys
  for (const k of Object.keys(entry)) if (entry[k] === undefined) delete entry[k];

  existingObj[d.id] = entry;
  return existingObj;
}

function formatJson(obj) {
  // stable-ish: sort top-level keys
  const sorted = {};
  for (const k of Object.keys(obj).sort((a, b) => a.localeCompare(b))) sorted[k] = obj[k];
  return JSON.stringify(sorted, null, 2) + "\n";
}

async function main() {
  const token = mustEnv("GITHUB_TOKEN");
  const repoFull = mustEnv("REPO");
  const issueNumber = Number(mustEnv("ISSUE_NUMBER"));
  const action = mustEnv("ACTION");
  const labelName = process.env.LABEL_NAME || "";

  const [owner, repo] = repoFull.split("/");
  const octokit = github.getOctokit(token);

  const issue = await octokit.rest.issues.get({ owner, repo, issue_number: issueNumber });
  const body = issue.data.body || "";
  const parsed = parseIssueForm(body);
  const result = validate(parsed);

  // Always comment validation on opened/edited; also on labeled (so maintainer sees final status)
  const header = result.ok ? "✅ Dataset submission validation: PASS" : "❌ Dataset submission validation: FAIL";
  const lines = [
    header,
    "",
    result.ok
      ? "This issue is valid. A maintainer may apply label `dataset:approved` to trigger PR creation."
      : "Please fix the following and edit the issue. The bot will re-check automatically.",
    "",
  ];

  if (result.errs.length) {
    lines.push("### Errors");
    for (const e of result.errs) lines.push(`- ${e}`);
    lines.push("");
  }
  if (result.warn.length) {
    lines.push("### Warnings");
    for (const w of result.warn) lines.push(`- ${w}`);
    lines.push("");
  }

  // Avoid spamming: only comment on opened/edited or when labeled approved.
  const shouldComment =
    action === "opened" ||
    action === "edited" ||
    (action === "labeled" && labelName === APPROVE_LABEL);

  if (shouldComment) {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: lines.join("\n"),
    });
  }

  // If labeled "dataset:approved", and valid => open PR
  if (action === "labeled" && labelName === APPROVE_LABEL) {
    if (!result.ok) {
      // Optionally add needs-info label
      await safeAddLabel(octokit, owner, repo, issueNumber, NEEDS_INFO_LABEL);
      return;
    }

    // Create a branch
    const baseBranch = "main";
    const dsPath = DATASETS_PATH;

    const ref = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${baseBranch}` });
    const baseSha = ref.data.object.sha;
    const branchName = `bot/dataset-${parsed.dataset.id}-${issueNumber}`.toLowerCase();

    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });

    // Read datasets.json from base
    const file = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: dsPath,
      ref: baseBranch,
    });

    if (!("content" in file.data)) throw new Error(`Unable to read ${dsPath}`);
    const decoded = Buffer.from(file.data.content, file.data.encoding).toString("utf8");
    const existing = JSON.parse(decoded);

    const updated = buildDatasetsJsonUpdate(existing, parsed, result.normalized_license);
    const newContent = formatJson(updated);

    // Commit updated datasets.json
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: dsPath,
      message: `Add/update dataset: ${parsed.dataset.id}`,
      content: Buffer.from(newContent, "utf8").toString("base64"),
      sha: file.data.sha,
      branch: branchName,
      committer: { name: "OpenConstruction Bot", email: "bot@openconstruction.org" },
      author: { name: "OpenConstruction Bot", email: "bot@openconstruction.org" },
    });

    // Open PR
    const pr = await octokit.rest.pulls.create({
      owner,
      repo,
      title: `Add/update dataset: ${parsed.dataset.id}`,
      head: branchName,
      base: baseBranch,
      body: [
        `Closes #${issueNumber}`,
        "",
        "### Submission summary",
        `- Dataset ID: \`${parsed.dataset.id}\``,
        `- Authorship: \`${parsed.submission.authorship.status}\``,
        "",
        "Maintainer: please verify authorship/permission and metadata reasonableness before merging.",
      ].join("\n"),
    });

    // Label issue as PR created
    await safeAddLabel(octokit, owner, repo, issueNumber, CREATED_LABEL);

    // Comment PR link
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: `✅ PR created: ${pr.data.html_url}\n\nOnce the PR is approved (CODEOWNERS), it can be merged.`,
    });
  }
}

async function safeAddLabel(octokit, owner, repo, issueNumber, label) {
  try {
    await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: issueNumber,
      labels: [label],
    });
  } catch {
    // ignore if label doesn't exist
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
