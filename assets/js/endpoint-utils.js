(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.EndpointUtils = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var ENDPOINT_HINT_KEY = '__lang_ep';

  function normalizeEndpoint(endpoint) {
    if (!endpoint) return null;
    return String(endpoint).toLowerCase().replace(/_/g, '-');
  }

  function firstPathSegment(path) {
    var m = String(path || '/').match(/^\/([^/]+)(?:\/|$)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function resolveEndpointFromUrl(urlLike) {
    var u;
    try {
      u = new URL(String(urlLike), 'http://localhost');
    } catch (e) {
      return null;
    }

    var hint = u.searchParams.get(ENDPOINT_HINT_KEY);
    if (hint) return hint;

    var fromPath = firstPathSegment(u.pathname);
    return fromPath || null;
  }

  function resolveEndpointHintFromUrl(urlLike) {
    var u;
    try {
      u = new URL(String(urlLike), 'http://localhost');
    } catch (e) {
      return null;
    }

    var hint = u.searchParams.get(ENDPOINT_HINT_KEY);
    return hint || null;
  }

  function resolveLocaleByEndpoint(endpoint) {
    if (!endpoint) return null;
    return String(endpoint);
  }

  function resolveUserLocale(endpoint, navigatorLanguages, navigatorLanguage) {
    function firstSupported(candidates) {
      var list = [];
      (candidates || []).forEach(function (item) {
        if (!item) return;
        list.push(String(item));
      });
      if (list.length === 0) return null;

      for (var i = 0; i < list.length; i += 1) {
        try {
          var supported = Intl.DateTimeFormat.supportedLocalesOf([list[i]]);
          if (supported.length > 0) return supported[0];
        } catch (e) {}
      }

      return null;
    }

    var endpointLocale = resolveLocaleByEndpoint(endpoint);
    var fromEndpoint = firstSupported(endpointLocale ? [endpointLocale] : []);
    if (fromEndpoint) return fromEndpoint;

    var fromNavigatorList = firstSupported(navigatorLanguages || []);
    if (fromNavigatorList) return fromNavigatorList;

    var fromNavigatorLanguage = firstSupported(navigatorLanguage ? [navigatorLanguage] : []);
    if (fromNavigatorLanguage) return fromNavigatorLanguage;

    return null;
  }

  function resolveTranslateTargetFromCookie(cookieString) {
    var rawCookie = String(cookieString || '');
    var m = rawCookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
    if (!m) return null;

    var decoded;
    try {
      decoded = decodeURIComponent(m[1] || '');
    } catch (e) {
      decoded = m[1] || '';
    }

    var matched = decoded.match(/^\/auto\/([^/]+)/);
    if (!matched) return null;

    var target = matched[1];
    if (!target || String(target).toLowerCase() === 'auto') return null;
    return target;
  }

  function resolveActiveEndpoint(urlLike, cookieString) {
    var hint = resolveEndpointHintFromUrl(urlLike);
    if (hint) return hint;
    return null;
  }

  function resolveEndpointTransition(explicitEndpoint, translatedEndpoint, currentEndpoint) {
    var nextEndpoint = translatedEndpoint || explicitEndpoint || null;
    var shouldClear = !nextEndpoint && !!currentEndpoint;
    return {
      nextEndpoint: nextEndpoint,
      shouldClear: shouldClear
    };
  }

  function resolveDisplayLocale(currentLocale, activeEndpoint, translatedEndpoint, browserLocale, translationReady) {
    var browser = browserLocale || null;
    var current = currentLocale || browser;
    var active = activeEndpoint ? String(activeEndpoint) : null;
    var translated = translatedEndpoint ? String(translatedEndpoint) : null;

    if (!active) return browser;
    if (!translationReady || !translated || translated !== active) return current;

    var endpointLocale = resolveUserLocale(active, browser ? [browser] : [], browser);
    return endpointLocale || current || browser;
  }

  return {
    ENDPOINT_HINT_KEY: ENDPOINT_HINT_KEY,
    normalizeEndpoint: normalizeEndpoint,
    firstPathSegment: firstPathSegment,
    resolveEndpointFromUrl: resolveEndpointFromUrl,
    resolveEndpointHintFromUrl: resolveEndpointHintFromUrl,
    resolveLocaleByEndpoint: resolveLocaleByEndpoint,
    resolveUserLocale: resolveUserLocale,
    resolveTranslateTargetFromCookie: resolveTranslateTargetFromCookie,
    resolveActiveEndpoint: resolveActiveEndpoint,
    resolveEndpointTransition: resolveEndpointTransition,
    resolveDisplayLocale: resolveDisplayLocale
  };
});
