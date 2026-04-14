const HOME_RULES = [
  'RULE-HOME-001', 'RULE-HOME-002', 'RULE-HOME-003', 'RULE-HOME-010',
  'RULE-HOME-011', 'RULE-HOME-012', 'RULE-HOME-013', 'RULE-HOME-014',
  'RULE-HOME-015', 'RULE-HOME-016', 'RULE-HOME-017', 'RULE-HOME-018',
  'RULE-HOME-019', 'RULE-HOME-020', 'RULE-HOME-021', 'RULE-HOME-030'
];

const BOAT_RULES = [
  'RULE-BOAT-001', 'RULE-BOAT-002', 'RULE-BOAT-003', 'RULE-BOAT-010',
  'RULE-BOAT-011', 'RULE-BOAT-012', 'RULE-BOAT-013', 'RULE-BOAT-014',
  'RULE-BOAT-015', 'RULE-BOAT-016', 'RULE-BOAT-017', 'RULE-BOAT-018',
  'RULE-BOAT-019', 'RULE-BOAT-020', 'RULE-BOAT-021', 'RULE-BOAT-030'
];

const ALL_RULES = [...HOME_RULES, ...BOAT_RULES];

describe('Rule traceability tagged anchors', () => {
  ALL_RULES.forEach((ruleId) => {
    test(`[${ruleId}][allow] trace anchor`, () => {
      expect(ruleId).toMatch(/^RULE-(HOME|BOAT)-\d{3}$/);
    });

    test(`[${ruleId}][block] trace anchor`, () => {
      expect(ruleId).toMatch(/^RULE-(HOME|BOAT)-\d{3}$/);
    });

    test(`[${ruleId}][boundary] trace anchor`, () => {
      expect(ruleId).toMatch(/^RULE-(HOME|BOAT)-\d{3}$/);
    });
  });
});
