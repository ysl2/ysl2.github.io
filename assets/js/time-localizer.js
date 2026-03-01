(function () {
  var utils = window.EndpointUtils;
  if (!utils) return;
  var ACTIVE_ENDPOINT_EVENT = 'language:endpoint-change';

  function resolveUserTimeZone() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return tz || null;
    } catch (e) {
      return null;
    }
  }

  function resolveTranslateTarget() {
    if (!utils.resolveTranslateTargetFromCookie) return null;
    return utils.resolveTranslateTargetFromCookie(document.cookie);
  }

  function isTranslationApplied() {
    var root = document.documentElement;
    if (!root || !root.classList) return false;
    return root.classList.contains('translated-ltr') || root.classList.contains('translated-rtl');
  }

  function resolveActiveEndpoint() {
    if (document.documentElement) {
      var fromAttr = document.documentElement.getAttribute('data-active-endpoint');
      if (fromAttr) return fromAttr;
    }

    if (utils.resolveActiveEndpoint) {
      return utils.resolveActiveEndpoint(window.location.href, document.cookie);
    }

    if (utils.resolveEndpointHintFromUrl) {
      return utils.resolveEndpointHintFromUrl(window.location.href);
    }

    return null;
  }

  function localizePublishedTime() {
    if (!localizePublishedTime.state) {
      localizePublishedTime.state = { locale: null };
    }
    var state = localizePublishedTime.state;
    var translatedTarget = resolveTranslateTarget();
    var activeEndpoint = resolveActiveEndpoint();
    var translationReady = isTranslationApplied();
    var browserLocale = utils.resolveUserLocale(null, navigator.languages, navigator.language);
    var locale = utils.resolveDisplayLocale
      ? utils.resolveDisplayLocale(state.locale, activeEndpoint, translatedTarget, browserLocale, translationReady)
      : utils.resolveUserLocale(activeEndpoint, navigator.languages, navigator.language);
    state.locale = locale;
    var timeZone = resolveUserTimeZone();
    var renderKey = (locale || 'browser-default') + '|' + (timeZone || 'device-default') + '|' +
      (activeEndpoint || '') + '|' + (translatedTarget || '');
    var nodes = document.querySelectorAll('time[datetime]');

    nodes.forEach(function (node) {
      if (node.dataset.timeLocalizedKey === renderKey) return;

      var raw = node.getAttribute('datetime');
      if (!raw) return;

      var date = new Date(raw);
      if (Number.isNaN(date.getTime())) return;

      var options = timeZone ? { timeZone: timeZone } : undefined;
      node.textContent = date.toLocaleString(locale || undefined, options);
      node.title = timeZone ? ((locale || 'browser-default') + ' | ' + timeZone) : (locale || 'browser-default');
      node.dataset.timeLocalizedKey = renderKey;
    });
  }

  function startLocalization() {
    var queued = false;
    function scheduleLocalization() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () {
        queued = false;
        localizePublishedTime();
      });
    }

    localizePublishedTime();

    window.addEventListener(ACTIVE_ENDPOINT_EVENT, function () {
      scheduleLocalization();
    });

    window.addEventListener('popstate', function () {
      scheduleLocalization();
    });

    if (!window.MutationObserver || !document.body) return;
    var observer = new MutationObserver(function () {
      scheduleLocalization();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startLocalization, { once: true });
  } else {
    startLocalization();
  }
})();
