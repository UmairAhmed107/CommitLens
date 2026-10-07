// Mocha Unit Tests for Impact Engine (Test Plan Section 8: UT-01 to UT-08)
const { expect } = require('chai');
const {
  matchesPattern,
  matchPatterns,
  scanTags,
  calculateReductionPercentage,
  calculateCoveragePercentage,
  computeImpact
} = require('../src/services/impactEngine');

describe('Impact Engine Unit Tests (Test Plan UT-01 to UT-08)', () => {
  // UT-01: Pattern matcher - match valid path
  it('UT-01: matchesPattern should return true for src/auth/LoginService.js against src/auth/**', () => {
    const matched = matchesPattern('src/auth/LoginService.js', 'src/auth/**');
    expect(matched).to.be.true;
  });

  // UT-02: Pattern matcher - reject non-matching path
  it('UT-02: matchesPattern should return false for src/cart/CartService.js against src/auth/**', () => {
    const matched = matchesPattern('src/cart/CartService.js', 'src/auth/**');
    expect(matched).to.be.false;
  });

  // UT-03: Tag scanner - extracts REQ-01 from comment
  it('UT-03: scanTags should return [\'REQ-01\'] for file text containing // @req REQ-01', () => {
    const fileContent = `
      // Authentication helper
      // @req REQ-01
      export class LoginService {
        login() {}
      }
    `;
    const tags = scanTags(fileContent);
    expect(tags).to.deep.equal(['REQ-01']);
  });

  // UT-04: Tag scanner - returns empty array for file without tag
  it('UT-04: scanTags should return [] for file with no requirement tag', () => {
    const fileContent = `
      // General utility without annotations
      export function add(a, b) {
        return a + b;
      }
    `;
    const tags = scanTags(fileContent);
    expect(tags).to.deep.equal([]);
  });

  // UT-05: Impact engine - two files matching two requirements returns union of tests
  it('UT-05: computeImpact with two files matching two requirements returns union of both requirements\' tests', () => {
    const commit = {
      sha: 'commit-ut-05',
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

    const result = computeImpact(commit, rules, tests);

    expect(result.impactedRequirements).to.include.members(['REQ-01', 'REQ-02']);
    // Union of REQ-01 (TC-01, TC-02) and REQ-02 (TC-03)
    expect(result.recommendedTestIds).to.deep.equal(['TC-01', 'TC-02', 'TC-03']);
    expect(result.recommendedTestIds).to.not.include('TC-04');
    expect(result.unmappedFiles).to.deep.equal([]);
  });

  // UT-06: Impact engine - same requirement matched by pattern and tag produces one requirement with two reasons
  it('UT-06: computeImpact when requirement is matched by pattern and tag returns one requirement with two reasons [\'pattern\', \'tag\']', () => {
    const commit = {
      sha: 'commit-ut-06',
      files: [
        {
          path: 'src/auth/LoginService.js',
          status: 'modified',
          content: '// @req REQ-01\nexport class LoginService {}'
        }
      ]
    };

    const rules = [
      { pattern: 'src/auth/**', requirementId: 'REQ-01' }
    ];

    const tests = [
      { testId: 'TC-01', requirementIds: ['REQ-01'] }
    ];

    const result = computeImpact(commit, rules, tests);

    // Must return exactly one impacted requirement
    expect(result.impacted).to.have.lengthOf(1);
    const impactedReq = result.impacted[0];
    expect(impactedReq.requirementId).to.equal('REQ-01');
    expect(impactedReq.reasons).to.include('pattern');
    expect(impactedReq.reasons).to.include('tag');
    expect(impactedReq.reasons).to.have.lengthOf(2);
  });

  // UT-07: Reduction percentage calculator - 3 of 8 total = 62.5%
  it('UT-07: calculateReductionPercentage should return 62.5 for 3 recommended tests of 8 total', () => {
    const reduction = calculateReductionPercentage(3, 8);
    expect(reduction).to.equal(62.5);
  });

  // UT-08: Coverage percentage calculator - 3 of 4 requirements = 75%
  it('UT-08: calculateCoveragePercentage should return 75 for 3 covered requirements of 4 total', () => {
    const coverage = calculateCoveragePercentage(3, 4);
    expect(coverage).to.equal(75);
  });

  // Section 3 Algorithm Pure Functions & Edge Cases
  describe('Section 3 Algorithm Pure Functions & Edge Cases', () => {
    it('matchPatterns: matches multiple files against multiple rules', () => {
      const files = ['src/auth/LoginService.js', 'src/cart/CartService.js', 'README.md'];
      const rules = [
        { pattern: 'src/auth/**', requirementId: 'REQ-01' },
        { pattern: 'src/cart/**', requirementId: 'REQ-02' }
      ];
      const result = matchPatterns(files, rules);
      expect(result.matches).to.have.lengthOf(2);
      expect(result.matchedFiles).to.deep.equal(['src/auth/LoginService.js', 'src/cart/CartService.js']);
      expect(result.matchedRequirements).to.deep.equal(['REQ-01', 'REQ-02']);
      expect(result.requirementMap['REQ-01']).to.deep.equal(['src/auth/LoginService.js']);
    });

    it('scanTags: scans an object mapping of file paths to content', () => {
      const fileContents = {
        'src/auth/LoginService.js': '// @req REQ-01\nexport class LoginService {}',
        'src/cart/CartService.js': '// @req REQ-02 Shopping cart\nexport class CartService {}',
        'README.md': '# Readme with no tags'
      };
      const result = scanTags(fileContents);
      expect(result.requirementIds).to.deep.equal(['REQ-01', 'REQ-02']);
      expect(result.tagMap['REQ-01']).to.deep.equal(['src/auth/LoginService.js']);
      expect(result.tagMap['REQ-02']).to.deep.equal(['src/cart/CartService.js']);
    });

    it('computeImpact: commit with no matches returns empty recommendation and lists all files as unmapped', () => {
      const commit = {
        sha: 'c-unmapped',
        files: ['README.md', 'docs/architecture.png']
      };
      const rules = [{ pattern: 'src/auth/**', requirementId: 'REQ-01' }];
      const tests = [{ testId: 'TC-01', requirementIds: ['REQ-01'] }];

      const result = computeImpact(commit, rules, tests);
      expect(result.impacted).to.be.an('array').that.is.empty;
      expect(result.recommendedTestIds).to.be.an('array').that.is.empty;
      expect(result.unmappedFiles).to.deep.equal(['README.md', 'docs/architecture.png']);
      expect(result.reductionPct).to.equal(100);
    });

    it('computeImpact: ignores missing tag target (REQ-99 does not exist) when validReqIds provided', () => {
      const commit = {
        sha: 'c-missing-tag',
        files: [
          {
            path: 'src/utils/Helper.js',
            status: 'modified',
            content: '// @req REQ-99 Nonexistent requirement\nexport function help() {}'
          }
        ]
      };
      const rules = [];
      const tests = [{ testId: 'TC-01', requirementIds: ['REQ-01'] }];
      const validReqIds = ['REQ-01', 'REQ-02'];

      const result = computeImpact(commit, rules, tests, {}, validReqIds);
      expect(result.impacted).to.be.an('array').that.is.empty;
      expect(result.recommendedTestIds).to.be.an('array').that.is.empty;
      expect(result.unmappedFiles).to.deep.equal(['src/utils/Helper.js']);
    });

    it('computeImpact: does not scan removed files for tags', () => {
      const commit = {
        sha: 'c-removed-file',
        files: [
          {
            path: 'src/auth/OldService.js',
            status: 'removed',
            content: '// @req REQ-01 Removed'
          }
        ]
      };
      const rules = [];
      const tests = [{ testId: 'TC-01', requirementIds: ['REQ-01'] }];

      const result = computeImpact(commit, rules, tests);
      expect(result.impacted).to.be.an('array').that.is.empty;
    });
  });
});
