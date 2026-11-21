/* =====================================================================
   STALLION SERVICES — SITE TRACKING
   Paste your IDs below. Leave any blank ("") to switch that tool off.
   ===================================================================== */
var STALLION_TRACKING = {
  GA4_ID:      "G-MRLJ5CYWN2",   // Google Analytics 4  e.g. "G-ABC123XYZ"
  GOOGLE_ADS_ID: "", // Google Ads (optional) e.g. "AW-123456789"
  GOOGLE_ADS_LEAD_LABEL: "", // Google Ads conversion label for leads (optional)
  META_PIXEL_ID: "2076432399539577", // Meta (Facebook/Instagram) Pixel e.g. "123456789012345"
  CLARITY_ID:  "zh0c78jc4s"    // Microsoft Clarity  e.g. "abcd1234ef"
};

/* ---------------- nothing below needs editing ---------------- */
(function () {
  var C = STALLION_TRACKING;
  var LS = (function () { try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); return localStorage; } catch (e) { return null; } })();

  /* ---------- 1. Load the tools ---------- */
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { dataLayer.push(arguments); };
  if (C.GA4_ID || C.GOOGLE_ADS_ID) {
    var g = document.createElement('script'); g.async = true;
    g.src = 'https://www.googletagmanager.com/gtag/js?id=' + (C.GA4_ID || C.GOOGLE_ADS_ID);
    document.head.appendChild(g);
    gtag('js', new Date());
    if (C.GA4_ID) gtag('config', C.GA4_ID, { send_page_view: false });
    if (C.GOOGLE_ADS_ID) gtag('config', C.GOOGLE_ADS_ID);
  }
  if (C.META_PIXEL_ID && !window.fbq) {
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', C.META_PIXEL_ID);
  }
  if (C.CLARITY_ID) {
    (function (c, l, a, r, i, t, y) { c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments) }; t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i; y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y); })(window, document, "clarity", "script", C.CLARITY_ID);
  }

  /* ---------- 2. Remember where each visitor came from ---------- */
  var p = new URLSearchParams(location.search);
  var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var touch = {};
  keys.forEach(function (k) { if (p.get(k)) touch[k] = p.get(k); });
  if (p.get('fbclid')) touch.click = 'facebook/instagram ad';
  if (p.get('gclid')) touch.click = 'google ad';
  var ref = document.referrer && document.referrer.indexOf(location.hostname) === -1 ? document.referrer : '';
  if (ref) touch.referrer = ref.replace(/^https?:\/\//, '').split('/')[0];
  var hasNew = Object.keys(touch).length > 0;
  touch.landing = location.pathname + location.hash;
  touch.date = new Date().toISOString().slice(0, 10);
  if (LS) {
    if (!LS.getItem('ss_first')) LS.setItem('ss_first', JSON.stringify(touch));
    if (hasNew || !LS.getItem('ss_last')) LS.setItem('ss_last', JSON.stringify(touch));
  }
  function describe(t) {
    if (!t) return '';
    var parts = [];
    if (t.click) parts.push(t.click);
    if (t.utm_source) parts.push('source=' + t.utm_source);
    if (t.utm_medium) parts.push('medium=' + t.utm_medium);
    if (t.utm_campaign) parts.push('campaign=' + t.utm_campaign);
    if (t.utm_content) parts.push('ad=' + t.utm_content);
    if (t.utm_term) parts.push('keyword=' + t.utm_term);
    if (t.referrer) parts.push('from ' + t.referrer);
    if (!parts.length) parts.push('direct / typed in');
    parts.push('landed on ' + (t.landing || '/') + ' ' + (t.date || ''));
    return parts.join(' | ');
  }
  function sourceText() {
    var f = LS && JSON.parse(LS.getItem('ss_first') || 'null');
    var l = LS && JSON.parse(LS.getItem('ss_last') || 'null');
    var a = describe(l || touch), b = describe(f);
    return (b && b !== a) ? 'LATEST: ' + a + '  ||  FIRST VISIT: ' + b : a;
  }
  function fillSourceFields() {
    document.querySelectorAll('form[data-netlify] input[name="source"]').forEach(function (el) { el.value = sourceText(); });
  }

  /* ---------- 3. Send an event to every tool ---------- */
  function track(name, params, metaEvent, metaParams) {
    params = params || {};
    try { if (C.GA4_ID || C.GOOGLE_ADS_ID) gtag('event', name, params); } catch (e) {}
    try { if (window.fbq && metaEvent) fbq(metaEvent.custom ? 'trackCustom' : 'track', metaEvent.name, metaParams || params); } catch (e) {}
    try { if (window.clarity) clarity('event', name); } catch (e) {}
  }
  window.stallionTrack = track;

  /* Page views (works with the site's #page navigation) */
  var lastPage = '';
  function pageView() {
    var page = (location.hash.replace('#', '') || 'home');
    if (location.pathname.indexOf('quote') !== -1) page = 'quote-landing';
    if (location.pathname.indexOf('thank-you') !== -1) page = 'thank-you';
    if (page === lastPage) return; lastPage = page;
    var title = 'Stallion — ' + page.replace(/-/g, ' ');
    try { if (C.GA4_ID) gtag('event', 'page_view', { page_title: title, page_location: location.href, page_path: location.pathname + (location.hash || '') }); } catch (e) {}
    try { if (window.fbq) { if (!pageView.done) { fbq('track', 'PageView'); pageView.done = 1; } fbq('track', 'ViewContent', { content_name: page }); } } catch (e) {}
    try { if (window.clarity) clarity('set', 'page', page); } catch (e) {}
  }

  /* Clicks: phone, email, booking, Instagram, page buttons */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a,button,[onclick]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '', oc = a.getAttribute('onclick') || '';
    var label = (a.innerText || a.getAttribute('aria-label') || '').trim().slice(0, 60);
    var where = (location.hash.replace('#', '') || 'home');
    if (href.indexOf('tel:') === 0) track('phone_call_click', { button: label, page: where }, { name: 'Contact' });
    else if (href.indexOf('mailto:') === 0) track('email_click', { button: label, page: where }, { name: 'Contact' });
    else if (oc.indexOf('openBooking') !== -1) {
      var m = oc.match(/services\/([A-Z0-9]+)/);
      track('booking_opened', { button: label, page: where, service_id: m ? m[1] : 'general' }, { name: 'Schedule' }, { content_name: label, page: where });
    }
    else if (/instagram\.com|facebook\.com|google\.com\/maps/.test(href)) track('social_click', { link: href, page: where });
    else if (/q-next-btn|qGoStep/.test(a.className + oc)) track('quote_step', { step: oc, page: where });
  }, true);

  /* Form submissions = leads.
     On submit we remember the details; the Lead is counted on the thank-you page,
     so only quotes that actually went through are counted. */
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form.hasAttribute || !form.hasAttribute('data-netlify')) return;
    fillSourceFields();
    var fd = new FormData(form);
    var info = { form_name: form.getAttribute('name'), service: fd.get('service') || '', suburb: fd.get('suburb') || '' };
    try { sessionStorage.setItem('ss_lead', JSON.stringify(info)); } catch (x) {}
    track('form_submit_attempt', info);
  }, true);
  function leadOnThankYou() {
    if (location.pathname.indexOf('thank-you') === -1) return;
    var info = {}; try { info = JSON.parse(sessionStorage.getItem('ss_lead') || '{}'); sessionStorage.removeItem('ss_lead'); } catch (x) {}
    if (!info.form_name) return; // refresh or direct visit: don't double count
    track('generate_lead', info, { name: 'Lead' }, { content_name: info.service || info.form_name });
    if (C.GOOGLE_ADS_ID && C.GOOGLE_ADS_LEAD_LABEL) { try { gtag('event', 'conversion', { send_to: C.GOOGLE_ADS_ID + '/' + C.GOOGLE_ADS_LEAD_LABEL }); } catch (x) {} }
  }

  /* Videos: first play of each */
  document.addEventListener('play', function (e) {
    var v = e.target; if (!v || v.tagName !== 'VIDEO' || v._tracked) return; v._tracked = 1;
    var i = Array.prototype.indexOf.call(document.querySelectorAll('video'), v) + 1;
    track('video_play', { video: 'video ' + i, page: (location.hash.replace('#', '') || 'home') });
  }, true);

  /* Scroll depth per page */
  var marks = {};
  window.addEventListener('scroll', function () {
    var h = document.documentElement, pct = Math.round((h.scrollTop + innerHeight) / h.scrollHeight * 100);
    [50, 90].forEach(function (m) { var k = lastPage + m; if (pct >= m && !marks[k]) { marks[k] = 1; track('scroll_depth', { percent: m, page: lastPage }); } });
  }, { passive: true });

  function start() {
    fillSourceFields(); pageView(); leadOnThankYou();
    if (typeof window.showPage === 'function' && !window.showPage._tracked) {
      var orig = window.showPage;
      window.showPage = function () { var r = orig.apply(this, arguments); setTimeout(pageView, 0); return r; };
      window.showPage._tracked = 1;
    }
  }
  window.addEventListener('hashchange', pageView);
  window.addEventListener('popstate', function () { setTimeout(pageView, 0); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
