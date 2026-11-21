/* Stallion Services — tidy quote forms
   Combines the follow-up question answers into one clean "details" field
   and sets a clear email subject, so quote emails are easy to read. */
(function () {
  var PILLS = '.cq-pills, .cqf-pills';

  // The question buttons have no "name" (so they aren't sent as messy separate fields),
  // so make each group behave like normal one-choice buttons.
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (!el || el.type !== 'radio' || !el.dataset.group || !el.checked) return;
    var form = el.form || document;
    form.querySelectorAll('input[type="radio"][data-group="' + el.dataset.group + '"]').forEach(function (r) {
      if (r !== el) r.checked = false;
    });
  }, true);

  function questionFor(pills) {
    var p = pills.previousElementSibling;
    while (p && !/cqf?-label/.test(p.className || '')) p = p.previousElementSibling;
    return p ? p.textContent.trim().replace(/\?$/, '') : 'Answer';
  }

  function buildDetails(form) {
    var lines = [];
    var service = (form.querySelector('[name="service"]') || {}).value || '';
    var blocks = form.querySelectorAll('[data-service]');
    blocks.forEach(function (block) {
      if (block.getAttribute('data-service') !== service) return;
      block.querySelectorAll(PILLS).forEach(function (pills) {
        var picked = pills.querySelector('input[type="radio"]:checked');
        if (!picked) return;
        var answer = picked.value;
        var otherId = pills.getAttribute('data-other-target');
        if (answer === 'Other' && otherId) {
          var other = document.getElementById(otherId) || form.querySelector('#q_' + otherId);
          if (other && other.value.trim()) answer = 'Other — ' + other.value.trim();
        }
        lines.push(questionFor(pills) + ': ' + answer);
      });
    });
    return lines.length ? lines.join('\n') : 'No extra details given';
  }

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form.hasAttribute || !form.hasAttribute('data-netlify')) return;
    var get = function (n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
    var details = form.querySelector('input[name="details"]');
    if (details) details.value = buildDetails(form);
    var subject = form.querySelector('input[name="subject"]');
    if (subject) {
      var who = get('name') || 'New customer';
      var where = get('suburb') ? ' (' + get('suburb') + ')' : '';
      subject.value = 'New quote: ' + (get('service') || 'Enquiry') + ' — ' + who + where;
    }
  }, true);
})();
