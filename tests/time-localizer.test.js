const assert = require('assert');
const {
  ENDPOINT_HINT_KEY,
  resolveEndpointFromUrl,
  normalizeEndpoint,
  resolveLocaleByEndpoint,
  resolveUserLocale
} = require('../assets/js/endpoint-utils');

function test(name, fn) {
  try {
    fn();
    console.log('PASS', name);
  } catch (e) {
    console.error('FAIL', name);
    console.error(e && e.stack ? e.stack : e);
    process.exitCode = 1;
  }
}

test('prefers endpoint hint query over path (preserve user case)', () => {
  const endpoint = resolveEndpointFromUrl(`https://example.com/en/post?${ENDPOINT_HINT_KEY}=zh-CN`);
  assert.strictEqual(endpoint, 'zh-CN');
});

test('uses path endpoint when query missing', () => {
  const endpoint = resolveEndpointFromUrl('https://example.com/fr/some-post');
  assert.strictEqual(endpoint, 'fr');
});

test('without query hint, first path segment is treated as endpoint', () => {
  const endpoint = resolveEndpointFromUrl('https://example.com/some-post');
  assert.strictEqual(endpoint, 'some-post');
});

test('normalizes underscore endpoint', () => {
  assert.strictEqual(normalizeEndpoint('zh_CN'), 'zh-cn');
});

test('passes through non-standard alias endpoints as-is', () => {
  assert.strictEqual(resolveLocaleByEndpoint('cn'), 'cn');
  assert.strictEqual(resolveLocaleByEndpoint('jp'), 'jp');
});

test('passes through standard endpoint tags without normalization', () => {
  assert.strictEqual(resolveLocaleByEndpoint('zh-cn'), 'zh-cn');
  assert.strictEqual(resolveLocaleByEndpoint('ja-jp'), 'ja-jp');
});

test('returns null for empty locale endpoint input', () => {
  assert.strictEqual(resolveLocaleByEndpoint(''), null);
});

test('falls back to browser locale when endpoint missing', () => {
  const locale = resolveUserLocale(null, ['en-GB', 'en-US'], 'en-US');
  assert.strictEqual(locale, 'en-GB');
});

test('falls back to browser locale when endpoint is invalid', () => {
  const locale = resolveUserLocale('invalid_token_123', ['en-GB', 'en-US'], 'en-US');
  assert.strictEqual(locale, 'en-GB');
});

test('returns null when no valid endpoint or browser locale exists', () => {
  const locale = resolveUserLocale('invalid_token_123', ['bad_locale'], 'also_bad');
  assert.strictEqual(locale, null);
});

if (process.exitCode) {
  process.exit(process.exitCode);
}
