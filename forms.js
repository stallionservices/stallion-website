/* Stallion Services — quote forms
   - Combines follow-up answers into one clean "details" field + sets a clear email subject
   - Makes every follow-up question required (with friendly messages)
   - Optional photo upload (up to 3), shrunk on the phone before sending */
(function () {
  var PILLS = '.cq-pills, .cqf-pills';
  // Netlify removes the data-netlify attribute when it publishes the site,
  // so spot our forms by their hidden "form-name" field instead.
  function isQuoteForm(f) { return !!(f && f.tagName === 'FORM' && f.querySelector('input[name="form-name"]')); }
  function quoteForms() { return Array.prototype.filter.call(document.querySelectorAll('form'), isQuoteForm); }
  var MAX_PHOTOS = 3, MAX_SIDE = 1600, QUALITY = 0.8, MAX_TOTAL = 7.5 * 1024 * 1024;

  /* ---------- styles ---------- */
  var css = document.createElement('style');
  css.textContent =
    '.ss-err{color:#d93025;font-size:.75rem;font-weight:600;margin:.35rem 0 .2rem;display:none}' +
    '.ss-invalid>.ss-err{display:block}' +
    '.ss-invalid label{border-color:#f2b8b5!important}' +
    '.ss-photos{margin:.2rem 0 .9rem}' +
    '.ss-photos-label{font-size:.74rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#555;display:block;margin-bottom:.4rem}' +
    '.ss-photos-label span{font-weight:400;text-transform:none;letter-spacing:0;color:#999}' +
    '.ss-photo-btn{display:flex;align-items:center;justify-content:center;gap:.5rem;width:100%;padding:.8rem;border:1.5px dashed #c9c9c9;border-radius:8px;background:#fafafa;color:#555;font:600 .85rem "DM Sans",sans-serif;cursor:pointer;transition:all .2s}' +
    '.ss-photo-btn:hover{border-color:#00b4d8;color:#00b4d8;background:#f4fcfe}' +
    '.ss-thumbs{display:flex;gap:.5rem;margin-top:.55rem;flex-wrap:wrap}' +
    '.ss-thumb{position:relative;width:64px;height:64px;border-radius:8px;overflow:hidden;background:#eee}' +
    '.ss-thumb img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.ss-thumb button{position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;border:none;background:rgba(0,0,0,.6);color:#fff;font-size:12px;line-height:20px;padding:0;cursor:pointer}' +
    '.ss-photo-note{font-size:.72rem;color:#999;margin-top:.35rem}' +
    '.ss-photo-note.bad{color:#d93025}';
  document.head.appendChild(css);

  /* ---------- one-choice buttons (they carry data-group instead of name) ---------- */
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (!el || el.type !== 'radio' || !el.dataset.group || !el.checked) return;
    var form = el.form || document;
    form.querySelectorAll('input[type="radio"][data-group="' + el.dataset.group + '"]').forEach(function (r) {
      if (r !== el) r.checked = false;
    });
    var pills = el.closest(PILLS); if (pills) pills.parentNode.classList && unmark(pills);
  }, true);

  function questionFor(pills) {
    var p = pills.previousElementSibling;
    while (p && !/cqf?-label/.test(p.className || '')) p = p.previousElementSibling;
    return p ? p.textContent.trim().replace(/\?$/, '') : 'Answer';
  }
  function otherInput(pills, form) {
    var id = pills.getAttribute('data-other-target');
    return id ? (document.getElementById(id) || form.querySelector('#q_' + id)) : null;
  }
  function activeGroups(form) {
    var service = (form.querySelector('[name="service"]') || {}).value || '';
    var out = [];
    form.querySelectorAll('[data-service]').forEach(function (block) {
      if (block.getAttribute('data-service') === service) block.querySelectorAll(PILLS).forEach(function (p) { out.push(p); });
    });
    return out;
  }

  /* error message helpers: wrap each pill group so we can show a message under it */
  function errBox(pills) {
    var box = pills.nextElementSibling;
    if (!box || !box.classList.contains('ss-err')) {
      box = document.createElement('div'); box.className = 'ss-err';
      pills.parentNode.insertBefore(box, pills.nextSibling);
    }
    return box;
  }
  function mark(pills, msg) { var b = errBox(pills); b.textContent = msg; b.style.display = 'block'; pills.classList.add('ss-invalid-pills'); pills.querySelectorAll('label').forEach(function (l) { l.style.borderColor = '#f2b8b5'; }); }
  function unmark(pills) { var b = pills.nextElementSibling; if (b && b.classList.contains('ss-err')) b.style.display = 'none'; pills.querySelectorAll('label').forEach(function (l) { l.style.borderColor = ''; }); }

  function validate(form) {
    var first = null;
    activeGroups(form).forEach(function (pills) {
      var picked = pills.querySelector('input[type="radio"]:checked');
      var other = otherInput(pills, form);
      if (!picked) { mark(pills, 'Please choose an option'); first = first || pills; }
      else if (picked.value === 'Other' && other && !other.value.trim()) { mark(pills, 'Please tell us a bit more'); first = first || other; }
      else unmark(pills);
    });
    var phone = form.querySelector('[name="phone"]');
    if (phone && phone.value.replace(/\D/g, '').length < 8) {
      phone.setCustomValidity('Please enter a valid mobile number'); phone.reportValidity(); phone.setCustomValidity('');
      first = first || phone;
    }
    if (form._photoError) { first = first || form.querySelector('.ss-photos'); }
    if (first) {
      var y = first.getBoundingClientRect().top + window.pageYOffset - 140;
      window.scrollTo({ top: y, behavior: 'smooth' });
      return false;
    }
    return true;
  }

  function buildDetails(form) {
    var lines = [];
    activeGroups(form).forEach(function (pills) {
      var picked = pills.querySelector('input[type="radio"]:checked');
      if (!picked) return;
      var answer = picked.value, other = otherInput(pills, form);
      if (answer === 'Other' && other && other.value.trim()) answer = 'Other — ' + other.value.trim();
      lines.push(questionFor(pills) + ': ' + answer);
    });
    var n = form._photos ? form._photos.length : 0;
    lines.push('Photos: ' + (n ? n + ' attached' : 'none'));
    return lines.join('\n');
  }

  /* ---------- photos ---------- */
  function shrink(file) {
    return new Promise(function (resolve) {
      if (!/^image\//.test(file.type) && !/\.(heic|heif|jpe?g|png|webp)$/i.test(file.name)) return resolve(null);
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) {
          if (!b) return resolve(file);
          resolve(new File([b], (file.name.replace(/\.[^.]+$/, '') || 'photo') + '.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', QUALITY);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file.size < 4e6 ? file : null); };
      img.src = url;
    });
  }

  function setupPhotos(form) {
    var box = form.querySelector('.ss-photos'); if (!box) return;
    var picker = box.querySelector('.ss-picker'), thumbs = box.querySelector('.ss-thumbs'), note = box.querySelector('.ss-photo-note');
    var slots = box.querySelectorAll('input[type="file"][name^="photo_"]');
    form._photos = [];
    function sync() {
      var total = 0;
      slots.forEach(function (slot, i) {
        if (form._photos[i]) total += form._photos[i].size;
        try { var dt = new DataTransfer(); if (form._photos[i]) dt.items.add(form._photos[i]); slot.files = dt.files; } catch (err) {}
      });
      thumbs.innerHTML = '';
      form._photos.forEach(function (f, i) {
        var t = document.createElement('div'); t.className = 'ss-thumb';
        var im = document.createElement('img'); im.src = URL.createObjectURL(f); im.alt = 'Photo ' + (i + 1);
        var x = document.createElement('button'); x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Remove photo');
        x.onclick = function () { form._photos.splice(i, 1); sync(); };
        t.appendChild(im); t.appendChild(x); thumbs.appendChild(t);
      });
      form._photoError = total > MAX_TOTAL;
      note.className = 'ss-photo-note' + (form._photoError ? ' bad' : '');
      note.textContent = form._photoError ? 'Photos are too large — please remove one.'
        : form._photos.length ? form._photos.length + ' of ' + MAX_PHOTOS + ' photos added'
        : 'Helps us give you a more accurate price.';
      box.querySelector('.ss-photo-btn span').textContent = form._photos.length >= MAX_PHOTOS ? 'Maximum photos added' : (form._photos.length ? 'Add more photos' : 'Add photos');
    }
    box.querySelector('.ss-photo-btn').addEventListener('click', function () {
      if (form._photos.length < MAX_PHOTOS) picker.click();
    });
    picker.addEventListener('change', function () {
      var files = Array.prototype.slice.call(picker.files, 0, MAX_PHOTOS - form._photos.length);
      picker.value = '';
      note.textContent = 'Preparing photos…';
      Promise.all(files.map(shrink)).then(function (out) {
        out.forEach(function (f) { if (f) form._photos.push(f); });
        sync();
      });
    });
    sync();
  }

  /* ---------- submit ---------- */
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!isQuoteForm(form)) return;
    if (!validate(form)) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    var get = function (n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
    var details = form.querySelector('input[name="details"]');
    if (details) details.value = buildDetails(form);
    var subject = form.querySelector('input[name="subject"]');
    if (subject) {
      var where = get('suburb') ? ' (' + get('suburb') + ')' : '';
      subject.value = 'New quote: ' + (get('service') || 'Enquiry') + ' — ' + (get('name') || 'New customer') + where;
    }
    var btn = form.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = form._photos && form._photos.length ? 'SENDING PHOTOS…' : 'SENDING…'; }
  }, true);

  // if someone taps Back after sending, make the button usable again
  window.addEventListener('pageshow', function () {
    quoteForms().map(function (f) { return f.querySelector('[type="submit"]'); }).filter(Boolean).forEach(function (b) {
      if (b.disabled) { b.disabled = false; b.textContent = b.dataset.label || 'GET MY QUOTE →'; }
    });
  });
  function init() {
    quoteForms().forEach(function (f) {
      var b = f.querySelector('[type="submit"]'); if (b) b.dataset.label = b.textContent;
      setupPhotos(f);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
