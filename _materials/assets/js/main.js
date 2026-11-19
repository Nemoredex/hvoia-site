/* =========================================================
   Гостевой дом «Хвоя» — интерактив прототипа (без зависимостей)
   В Astro: каждый блок можно перенести в <script> своего компонента.
   ========================================================= */
(function () {
  'use strict';

  /* 1. Мобильное меню — компонент Header */
  document.querySelectorAll('[data-menu-toggle]').forEach(function (btn) {
    var menu = document.getElementById(btn.getAttribute('aria-controls'));
    if (!menu) return;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      btn.setAttribute('aria-label', open ? 'Открыть меню' : 'Закрыть меню');
      menu.hidden = open;
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', 'Открыть меню');
        menu.hidden = true;
      }
    });
  });

  /* 2. Фильтр фото — страница «Фото» (PhotoGallery)
        Кнопки [data-filter-value]; элементы [data-audience="house territory"] */
  document.querySelectorAll('[data-filter]').forEach(function (group) {
    var list = document.querySelector(group.getAttribute('data-filter'));
    if (!list) return;
    var buttons = group.querySelectorAll('[data-filter-value]');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var value = btn.getAttribute('data-filter-value');
        buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        list.querySelectorAll('[data-audience]').forEach(function (item) {
          var aud = item.getAttribute('data-audience').split(' ');
          item.hidden = value !== 'all' && aud.indexOf(value) === -1;
        });
      });
    });
  });

  /* 3. Формы — LeadForm
        ВНИМАНИЕ: в прототипе отправки нет. В Astro замените на POST в API-эндпоинт
        (src/pages/api/lead.ts) с отправкой на почту и в Telegram. */
  document.querySelectorAll('[data-lead-form]').forEach(function (form) {
    var success = document.getElementById(form.getAttribute('data-success'));
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      form.hidden = true;
      if (success) { success.hidden = false; success.focus(); }
    });
  });
  document.querySelectorAll('[data-form-again]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var form = document.getElementById(btn.getAttribute('data-form-again'));
      if (!form) return;
      form.reset();
      form.hidden = false;
      btn.closest('[tabindex]').hidden = true;
    });
  });

  /* 4. Демо-формы без скрытия (проверка дат) — BookForm
        В Astro: передать даты в модуль онлайн-бронирования (TravelLine / Bnovo и т. п.) */
  document.querySelectorAll('[data-demo-note]').forEach(function (form) {
    var checkin = form.querySelector('[name="checkin"]');
    var checkout = form.querySelector('[name="checkout"]');
    if (checkin && checkout) {
      var syncMin = function () { checkout.min = checkin.value; if (checkout.value && checkout.value <= checkin.value) checkout.value = ''; };
      checkin.addEventListener('change', syncMin);
      checkout.min = checkin.value;
    }
    var note = document.createElement('p');
    note.className = 'demo-note'; note.setAttribute('role', 'status');
    form.insertAdjacentElement('afterend', note);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      note.textContent = form.getAttribute('data-demo-note');
    });
  });
})();
