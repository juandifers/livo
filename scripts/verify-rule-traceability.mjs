import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RULE_DOCS = [
  path.join(ROOT, 'docs/rules/rulesBOATS.md'),
  path.join(ROOT, 'docs/rules/rulesHOMES.md')
];
const TEST_DIR = path.join(ROOT, 'tests/booking-rules');
const TAG_PATTERN = /\[(RULE-(?:HOME|BOAT)-\d{3})\]\[(allow|block|boundary)\]/g;

const walkFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walkFiles(full);
      return full;
    })
  );
  return files.flat();
};

const collectRulesFromDocs = async () => {
  const ruleSet = new Set();

  for (const file of RULE_DOCS) {
    const content = await fs.readFile(file, 'utf8');
    const matches = content.match(/RULE-(?:HOME|BOAT)-\d{3}/g) || [];
    matches.forEach((ruleId) => ruleSet.add(ruleId));
  }

  return [...ruleSet].sort();
};

const collectTaggedCases = async () => {
  const files = (await walkFiles(TEST_DIR)).filter((filePath) =>
    filePath.endsWith('.test.js') || filePath.endsWith('.trace-tags.txt')
  );
  const casesByRule = new Map();

  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf8');
    const matches = [...content.matchAll(TAG_PATTERN)];

    for (const [, ruleId, caseType] of matches) {
      if (!casesByRule.has(ruleId)) {
        casesByRule.set(ruleId, new Set());
      }
      casesByRule.get(ruleId).add(caseType);
    }
  }

  return { files, casesByRule };
};

const main = async () => {
  const ruleIds = await collectRulesFromDocs();
  const { files, casesByRule } = await collectTaggedCases();

  if (ruleIds.length !== 32) {
    console.error(`Expected 32 canonical rules but found ${ruleIds.length}.`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error('No booking rule test files found for traceability.');
    process.exit(1);
  }

  const missing = [];

  for (const ruleId of ruleIds) {
    const cases = casesByRule.get(ruleId) || new Set();
    for (const requiredCase of ['allow', 'block', 'boundary']) {
      if (!cases.has(requiredCase)) {
        missing.push(`${ruleId} -> missing [${requiredCase}]`);
      }
    }
  }

  if (missing.length > 0) {
    console.error('Rule traceability check failed. Missing tagged scenarios:');
    missing.forEach((line) => console.error(`- ${line}`));
    process.exit(1);
  }

  console.log(`Rule traceability check passed: ${ruleIds.length} rules fully tagged.`);
};

main().catch((error) => {
  console.error('Rule traceability verifier crashed:', error);
  process.exit(1);
});
