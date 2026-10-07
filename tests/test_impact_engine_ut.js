// Automated Verification Script for Test Plan UT-01 to UT-08 and FR-IMP-01 to FR-IMP-08
const assert = require('assert');
const {
  matchesPattern,
  matchPatterns,
  scanTags,
  calculateReductionPercentage,
  calculateCoveragePercentage,
  computeImpact
} = require('../server/src/services/impactEngine');

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

console.log('=== Running Impact Engine Unit Tests (UT-01 to UT-08) ===');

it('UT-01: Match src/auth/LoginService.js against src/auth/**', () => {
  assert.strictEqual(matchesPattern('src/auth/LoginService.js', 'src/auth/**'), true);
});

it('UT-02: Match src/cart/CartService.js against src/auth/**', () => {
  assert.strictEqual(matchesPattern('src/cart/CartService.js', 'src/auth/**'), false);
});

it('UT-03: Scan tag from file text containing // @req REQ-01', () => {
  const tags = scanTags('// @req REQ-01\nclass LoginService {}');
  assert.deepStrictEqual(tags, ['REQ-01']);
});

it('UT-04: Scan file with no tag returns empty array', () => {
  const tags = scanTags('console.log("No tag here");');
  assert.deepStrictEqual(tags, []);
});

it('UT-05: Two files matching two requirements returns union of both requirements tests', () => {
  const commit = {
    sha: 'c1',
    files: [
      { path: 'src/auth/LoginService.js', status: 'modified' },
      { path: 'src/cart/CartService.js', status: 'modified' }
    ]
  };
  const rules = [
    { pattern: 'src/auth/**', requirementId: 'REQ-01' },
    { pattern: 'src/cart/**', requirementId: 'REQ-02' }
  ];
  const tests = [
    { testId: 'TC-01', requirementIds: ['REQ-01'] },
    { testId: 'TC-02', requirementIds: ['REQ-01'] },
    { testId: 'TC-03', requirementIds: ['REQ-02'] },
    { testId: 'TC-04', requirementIds: ['REQ-03'] }
  ];
  const res = computeImpact(commit, rules, tests);
  assert.deepStrictEqual(res.recommendedTestIds.sort(), ['TC-01', 'TC-02', 'TC-03']);
});

it('UT-06: Same requirement matched by pattern and tag returns one requirement with two reasons', () => {
  const commit = {
    sha: 'c2',
    files: [
      { path: 'src/auth/LoginService.js', status: 'modified', content: '// @req REQ-01\nclass LoginService {}' }
    ]
  };
  const rules = [{ pattern: 'src/auth/**', requirementId: 'REQ-01' }];
  const tests = [{ testId: 'TC-01', requirementIds: ['REQ-01'] }];
  const res = computeImpact(commit, rules, tests);
  assert.strictEqual(res.impacted.length, 1);
  assert.strictEqual(res.impacted[0].requirementId, 'REQ-01');
  assert.strictEqual(res.impacted[0].reasons.includes('pattern'), true);
  assert.strictEqual(res.impacted[0].reasons.includes('tag'), true);
});

it('UT-07: Reduction percentage: 3 recommended of 8 total = 62.5%', () => {
  assert.strictEqual(calculateReductionPercentage(3, 8), 62.5);
});

it('UT-08: Coverage percentage: 3 of 4 requirements = 75%', () => {
  assert.strictEqual(calculateCoveragePercentage(3, 4), 75);
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
