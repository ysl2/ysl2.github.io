const assert = require('assert');
const {
  resolveEndpointFromUrl,
  normalizeEndpoint,
  resolveLocaleByEndpoint,
  resolveTranslateTargetFromCookie,
  resolveActiveEndpoint,
  resolveEndpointTransition,
  resolveDisplayLocale
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

test('query endpoint should keep user case', () => {
  assert.strictEqual(resolveEndpointFromUrl('https://example.com/post?__lang_ep=ZH-CN'), 'ZH-CN');
});

test('query endpoint should be passed through even if non-standard', () => {
  assert.strictEqual(resolveEndpointFromUrl('https://example.com/post?__lang_ep=invalid_token_123'), 'invalid_token_123');
});

test('path endpoint should still be extracted from first path segment', () => {
  assert.strictEqual(resolveEndpointFromUrl('https://example.com/cn/post'), 'cn');
});

test('path first segment is always treated as endpoint when no query hint', () => {
  assert.strictEqual(resolveEndpointFromUrl('https://example.com/about/'), 'about');
});

test('locale resolver passes through endpoint values directly', () => {
  assert.strictEqual(resolveLocaleByEndpoint('cn'), 'cn');
  assert.strictEqual(resolveLocaleByEndpoint('jp'), 'jp');
  assert.strictEqual(resolveLocaleByEndpoint('zh-cn'), 'zh-cn');
  assert.strictEqual(resolveLocaleByEndpoint('pt-br'), 'pt-br');
  assert.strictEqual(resolveLocaleByEndpoint('ZH-CN'), 'ZH-CN');
  assert.strictEqual(resolveLocaleByEndpoint(''), null);
});

test('normalize helper still provides lowercase canonical form for locale logic', () => {
  assert.strictEqual(normalizeEndpoint('ZH_CN'), 'zh-cn');
});

test('translate cookie parser extracts target language', () => {
  assert.strictEqual(resolveTranslateTargetFromCookie('googtrans=%2Fauto%2Ffr; path=/'), 'fr');
  assert.strictEqual(resolveTranslateTargetFromCookie('x=1; googtrans=/auto/zh-CN; y=2'), 'zh-CN');
});

test('translate cookie parser returns null for auto or missing cookie', () => {
  assert.strictEqual(resolveTranslateTargetFromCookie('googtrans=/auto/auto; path=/'), null);
  assert.strictEqual(resolveTranslateTargetFromCookie('x=1; y=2'), null);
});

test('active endpoint should prefer explicit URL endpoint over stale translate cookie', () => {
  const endpoint = resolveActiveEndpoint(
    'https://example.com/post?__lang_ep=en',
    'x=1; googtrans=/auto/fr; y=2'
  );
  assert.strictEqual(endpoint, 'en');
});

test('active endpoint should ignore stale translate cookie when URL endpoint is absent', () => {
  const endpoint = resolveActiveEndpoint(
    'https://example.com/post',
    'x=1; googtrans=/auto/fr; y=2'
  );
  assert.strictEqual(endpoint, null);
});

test('active endpoint should be null when both URL endpoint and cookie are absent', () => {
  const endpoint = resolveActiveEndpoint(
    'https://example.com/post',
    'x=1; y=2'
  );
  assert.strictEqual(endpoint, null);
});

test('endpoint transition should clear when both explicit and translated endpoints are absent', () => {
  assert.deepStrictEqual(
    resolveEndpointTransition(null, null, 'fr'),
    { nextEndpoint: null, shouldClear: true }
  );
});

test('endpoint transition should switch to translated endpoint when present', () => {
  assert.deepStrictEqual(
    resolveEndpointTransition(null, 'de', 'fr'),
    { nextEndpoint: 'de', shouldClear: false }
  );
});

test('endpoint transition should keep explicit endpoint when translated is absent', () => {
  assert.deepStrictEqual(
    resolveEndpointTransition('en', null, 'fr'),
    { nextEndpoint: 'en', shouldClear: false }
  );
});

test('display locale should use browser default when endpoint is absent', () => {
  assert.strictEqual(resolveDisplayLocale('fr', null, 'fr', 'en-US', true), 'en-US');
});

test('display locale should keep current when endpoint exists but translation is not ready', () => {
  assert.strictEqual(resolveDisplayLocale('fr', 'de', null, 'en-US', false), 'fr');
  assert.strictEqual(resolveDisplayLocale('fr', 'de', 'fr', 'en-US', false), 'fr');
  assert.strictEqual(resolveDisplayLocale('fr', 'de', 'de', 'en-US', false), 'fr');
});

test('display locale should switch to endpoint locale only when translation target matches endpoint', () => {
  assert.strictEqual(resolveDisplayLocale('fr', 'de', 'de', 'en-US', true), 'de');
});

test('display locale should keep previous locale when invalid endpoint does not match translation', () => {
  assert.strictEqual(resolveDisplayLocale('fr', 'ee', 'fr', 'en-US', true), 'fr');
});

test('display locale should keep previous locale when translation is not applied even if target matches endpoint', () => {
  assert.strictEqual(resolveDisplayLocale('fr', 'fr-ca', 'fr-ca', 'en-US', false), 'fr');
});

test('display locale should fall back to browser default when nothing has been applied yet', () => {
  assert.strictEqual(resolveDisplayLocale(null, 'ee', null, 'en-US', false), 'en-US');
});

test('display locale should ignore stale translated target after endpoint is cleared', () => {
  assert.strictEqual(resolveDisplayLocale('fr', null, 'fr', 'en-US', true), 'en-US');
});

if (process.exitCode) {
  process.exit(process.exitCode);
}
