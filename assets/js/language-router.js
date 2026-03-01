(function () {
  var ORIGIN = window.location.origin;
  var utils = window.EndpointUtils || {};
  var ENDPOINT_HINT_KEY = utils.ENDPOINT_HINT_KEY || '__lang_ep';
  var ACTIVE_ENDPOINT_EVENT = 'language:endpoint-change';

  var url = new URL(window.location.href);
  var path = url.pathname;

  function firstSegment(p) {
    if (utils.firstPathSegment) return utils.firstPathSegment(p);
    var m = p.match(/^\/([^/]+)(?:\/|$)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function stripFirstSegment(p) {
    var stripped = p.replace(/^\/[^/]+(?=\/|$)/, '');
    return stripped === '' ? '/' : stripped;
  }

  function addEndpointPrefix(p, endpoint) {
    if (!endpoint) return p;
    if (firstSegment(p) === endpoint) return p;
    return '/' + encodeURIComponent(endpoint) + (p === '/' ? '' : p);
  }

  function isSkippablePath(p) {
    return (
      p.indexOf('/assets/') === 0 ||
      p === '/robots.txt' ||
      p === '/sitemap.xml' ||
      p === '/feed.xml'
    );
  }

  function rewriteInternalLinksToEndpoint(endpoint, previousEndpoint) {
    if (!endpoint && !previousEndpoint) return;

    var links = document.querySelectorAll('a[href]');
    links.forEach(function (a) {
      var raw = a.getAttribute('href');
      if (!raw) return;
      if (raw.indexOf('#') === 0) return;
      if (raw.indexOf('mailto:') === 0) return;
      if (raw.indexOf('tel:') === 0) return;
      if (raw.indexOf('javascript:') === 0) return;

      var parsed;
      try {
        parsed = new URL(raw, ORIGIN);
      } catch (e) {
        return;
      }

      if (parsed.origin !== ORIGIN) return;
      if (isSkippablePath(parsed.pathname)) return;

      var nextPath = parsed.pathname;
      if (previousEndpoint && firstSegment(nextPath) === previousEndpoint) {
        nextPath = stripFirstSegment(nextPath);
      }
      parsed.pathname = endpoint ? addEndpointPrefix(nextPath, endpoint) : nextPath;
      a.setAttribute('href', parsed.pathname + parsed.search + parsed.hash);
    });
  }

  function buildCleanUrl(p, searchParams, hash) {
    var out = p;
    var q = searchParams.toString();
    if (q) out += '?' + q;
    if (hash) out += hash;
    return out;
  }

  function show404Content() {
    var el = document.getElementById('language-404-content');
    if (el) el.style.display = '';
  }

  function emitActiveEndpointChange(endpoint) {
    var detail = { endpoint: endpoint || null };
    if (typeof window.CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent(ACTIVE_ENDPOINT_EVENT, { detail: detail }));
      return;
    }

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(ACTIVE_ENDPOINT_EVENT, false, false, detail);
    window.dispatchEvent(evt);
  }

  function publishActiveEndpoint(endpoint) {
    if (document.documentElement) {
      if (endpoint) {
        document.documentElement.setAttribute('data-active-endpoint', endpoint);
      } else {
        document.documentElement.removeAttribute('data-active-endpoint');
      }
    }
    emitActiveEndpointChange(endpoint);
  }

  function resolveTranslateTargetFromCookie(cookieString) {
    if (utils.resolveTranslateTargetFromCookie) {
      return utils.resolveTranslateTargetFromCookie(cookieString);
    }
    return null;
  }

  function resolveActiveEndpoint() {
    if (utils.resolveActiveEndpoint) {
      return utils.resolveActiveEndpoint(window.location.href, document.cookie);
    }

    var currentUrl;
    try {
      currentUrl = new URL(window.location.href);
    } catch (e) {
      currentUrl = null;
    }

    if (currentUrl) {
      var hint = currentUrl.searchParams.get(ENDPOINT_HINT_KEY);
      if (hint) return hint;
    }

    return null;
  }

  function applyEndpointState(endpoint, sourcePath, previousEndpoint) {
    rewriteInternalLinksToEndpoint(endpoint, previousEndpoint);

    var forHistory = new URL(window.location.href);
    forHistory.searchParams.delete(ENDPOINT_HINT_KEY);
    var canonicalSourcePath = sourcePath;
    if (previousEndpoint && firstSegment(canonicalSourcePath) === previousEndpoint) {
      canonicalSourcePath = stripFirstSegment(canonicalSourcePath);
    }
    var targetPath = endpoint
      ? addEndpointPrefix(canonicalSourcePath, endpoint)
      : canonicalSourcePath;
    window.history.replaceState({}, '', buildCleanUrl(targetPath, forHistory.searchParams, forHistory.hash));

    publishActiveEndpoint(endpoint || null);
  }

  function translateToTarget(endpoint, onFailure) {
    if (!endpoint) return;

    if (document.getElementById('google_translate_element') === null) {
      var holder = document.createElement('div');
      holder.id = 'google_translate_element';
      holder.style.display = 'none';
      document.body.appendChild(holder);
    }

    var cookieValue = '/auto/' + endpoint;
    document.cookie = 'googtrans=' + cookieValue + ';path=/';
    document.cookie = 'googtrans=' + cookieValue + ';path=/;domain=' + window.location.hostname;

    var failed = false;
    function failOnce() {
      if (failed) return;
      failed = true;
      onFailure();
    }

    function initTranslateElement() {
      try {
        if (window.google && window.google.translate && window.google.translate.TranslateElement) {
          new window.google.translate.TranslateElement(
            {
              pageLanguage: 'auto',
              includedLanguages: endpoint,
              autoDisplay: false,
              layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
            },
            'google_translate_element'
          );
        } else {
          failOnce();
        }
      } catch (e) {
        failOnce();
      }
    }

    window.googleTranslateElementInit = initTranslateElement;

    var existing = document.getElementById('google-translate-script');
    if (!existing) {
      var s = document.createElement('script');
      s.id = 'google-translate-script';
      s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      s.async = true;
      s.onerror = failOnce;
      document.head.appendChild(s);
      return;
    }

    if (window.google && window.google.translate && window.google.translate.TranslateElement) {
      initTranslateElement();
      return;
    }

    if (!existing.dataset.boundLanguageError) {
      existing.addEventListener('error', failOnce, { once: true });
      existing.dataset.boundLanguageError = '1';
    }
  }

  function showTranslated404(endpoint) {
    show404Content();
    publishActiveEndpoint(endpoint);
    translateToTarget(endpoint, function () {});
  }

  function startActiveEndpointSync(sourcePath, stateRef) {
    if (!window.MutationObserver || !document.body) return;

    var queued = false;
    function syncFromState() {
      var explicitEndpoint = resolveActiveEndpoint();
      var translatedTarget = resolveTranslateTargetFromCookie(document.cookie);
      var transition = utils.resolveEndpointTransition
        ? utils.resolveEndpointTransition(explicitEndpoint, translatedTarget, stateRef.value)
        : {
            nextEndpoint: translatedTarget || explicitEndpoint || null,
            shouldClear: !(translatedTarget || explicitEndpoint) && !!stateRef.value
          };

      var nextEndpoint = transition.nextEndpoint;
      if (!transition.shouldClear && !nextEndpoint) return;
      if (!transition.shouldClear && nextEndpoint === stateRef.value) return;
      var previousEndpoint = stateRef.value;
      stateRef.value = nextEndpoint;
      applyEndpointState(nextEndpoint, sourcePath, previousEndpoint);
    }

    function scheduleSync() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () {
        queued = false;
        syncFromState();
      });
    }

    var observer = new MutationObserver(function () {
      scheduleSync();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    window.addEventListener('popstate', function () {
      scheduleSync();
    });
  }

  function startRouting() {
    var stateRef = { value: resolveActiveEndpoint() };
    var sourcePath = path;
    if (stateRef.value && firstSegment(sourcePath) === stateRef.value) {
      sourcePath = stripFirstSegment(sourcePath);
    }
    if (!stateRef.value) {
      publishActiveEndpoint(null);
      return;
    }

    applyEndpointState(stateRef.value, sourcePath, null);

    translateToTarget(stateRef.value, function () {
      var fallback = new URL(window.location.href);
      fallback.searchParams.delete(ENDPOINT_HINT_KEY);
      window.location.replace(buildCleanUrl(sourcePath, fallback.searchParams, fallback.hash));
    });

    startActiveEndpointSync(sourcePath, stateRef);
  }

  var is404Marker = document.getElementById('language-404-marker') !== null;

  if (is404Marker) {
    if (path === '/404.html' || path === '/404/') {
      show404Content();
      publishActiveEndpoint(null);
      return;
    }

    var endpointFrom404 = firstSegment(path);
    if (endpointFrom404) {
      var sourcePathFrom404 = stripFirstSegment(path);
      fetch(sourcePathFrom404, { method: 'GET', credentials: 'same-origin' })
        .then(function (resp) {
          if (!resp || !resp.ok) {
            showTranslated404(endpointFrom404);
            return;
          }

          var hop = new URL(sourcePathFrom404 + url.search + url.hash, ORIGIN);
          hop.searchParams.set(ENDPOINT_HINT_KEY, endpointFrom404);
          window.location.replace(buildCleanUrl(hop.pathname, hop.searchParams, hop.hash));
        })
        .catch(function () {
          showTranslated404(endpointFrom404);
        });
      return;
    }

    show404Content();
    publishActiveEndpoint(null);
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startRouting, { once: true });
  } else {
    startRouting();
  }
})();
