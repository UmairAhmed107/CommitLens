// Unit Tests for Impact Engine & Calculations (Test Plan Section 8: UT-01 to UT-08)
const test = require('node:test');
const assert = require('node:assert');
const {
  matchesPattern,
  scanContentForReqTags,
  calculateReductionPercentage,
  calculateCoveragePercentage
} = require('../src/services/impactService');

test('UT-01: Pattern matcher matches valid path', () => {
  const result = matchesPattern('src/auth/LoginService.js', 'src/auth/**');
  assert.strictEqual(result, true, 'LoginService.js should match src/auth/**');
});

test('UT-02: Pattern matcher rejects non-matching path', () => {
  const result = matchesPattern('src/cart/CartService.js', 'src/auth/**');
  assert.strictEqual(result, false, 'CartService.js should not match src/auth/**');
});

test('UT-03: Tag scanner extracts @req tag from file content', () => {
  const content = `
    // User login service
    // @req REQ-01
    export class LoginService {}
  `;
  const tags = scanContentForReqTags(content);
  assert.deepStrictEqual(tags, ['REQ-01']);
});

test('UT-04: Tag scanner returns empty array when no tag is present', () => {
  const content = 'console.log("no requirement annotations here");';
  const tags = scanContentForReqTags(content);
  assert.deepStrictEqual(tags, []);
});

test('UT-05: Tag scanner extracts multiple distinct tags', () => {
  const content = `
    /*
     * @req REQ-01
     * @req REQ-02
     */
  `;
  const tags = scanContentForReqTags(content);
  assert.strictEqual(tags.includes('REQ-01'), true);
  assert.strictEqual(tags.includes('REQ-02'), true);
});

test('UT-07: Reduction percentage calculation', () => {
  // 3 recommended out of 8 total tests = 62.5% reduction
  const reduction = calculateReductionPercentage(3, 8);
  assert.strictEqual(reduction, 62.5);
});

test('UT-08: Requirement coverage percentage calculation', () => {
  // 3 covered out of 4 total requirements = 75% coverage
  const coverage = calculateCoveragePercentage(3, 4);
  assert.strictEqual(coverage, 75);
});
