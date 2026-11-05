/* Static prototype interaction; the production component will be validated separately. */
(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad = value => String(value).padStart(2, '0');
  const date = (year, month, day) => {
    const result = new Date(0);
    result.setUTCFullYear(year, month, day);
    result.setUTCHours(12, 0, 0, 0);
    return result;
  };
  const iso = d => `${String(d.getUTCFullYear()).padStart(4, '0')}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const localToday = () => {
    const now = new Date();
    return date(now.getFullYear(), now.getMonth(), now.getDate());
  };
  function parse(value) {
    const match = /^(\d{4})[-/](\d{2})[-/](\d{2})$/.exec(value.trim());
    if (!match) return null;
    const [, y, m, d] = match.map(Number);
    if (y < 1 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const result = date(y, m - 1, d);
    return result.getUTCFullYear() === y && result.getUTCMonth() === m - 1 && result.getUTCDate() === d ? result : null;
  }
  const svg = paths => `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  const calendarIcon = svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v5m10-5v5M3 11h18M7 15h2m3 0h2m-7 3h2"/>');
  const arrow = direction => svg(direction < 0 ? '<path d="m14 7-5 5 5 5"/>' : '<path d="m10 7 5 5-5 5"/>');
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const mobile = matchMedia('(max-width: 700px)');
  let dialog, input, opener, visible, focused, selected, mode = 'days';

  function field({id, label, value = '', optional = false}) {
    return `<div class="date-field${value ? ' has-value' : ''}"><input type="text" id="${escape(id)}" class="date-input" data-date-input data-date-label="${escape(label)}" placeholder="YYYY/MM/DD" value="${escape(value.replaceAll('-', '/'))}" autocomplete="off" spellcheck="false" aria-describedby="${escape(id)}-hint ${escape(id)}-error" ${optional ? '' : 'required'}>${optional ? `<button type="button" class="date-clear" data-date-clear="${escape(id)}" aria-label="清除${escape(label)}">${svg('<path d="m8 8 8 8m0-8-8 8"/>')}</button>` : ''}<button type="button" class="date-toggle" data-date-open="${escape(id)}" aria-label="選擇${escape(label)}" aria-haspopup="dialog" aria-expanded="false" aria-controls="date-picker-dialog"><span>${calendarIcon}</span></button></div><span id="${escape(id)}-hint" class="sr-only">以 YYYY/MM/DD 輸入日期，或按向下鍵開啟日曆。</span>`;
  }

  function value(id) {
    const element = document.getElementById(id);
    return parse(element.value) ? iso(parse(element.value)) : '';
  }

  function validate(id, required = false) {
    const element = document.getElementById(id);
    const invalid = (required && !element.value.trim()) || (element.value.trim() && !parse(element.value));
    const error = document.getElementById(`${id}-error`);
    element.setAttribute('aria-invalid', String(Boolean(invalid)));
    if (error) error.textContent = invalid ? (element.value.trim() ? '請輸入有效日期，例如 2027/03/11。' : '請選擇支出日期。') : '';
    return !invalid;
  }

  function ensureDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.id = 'date-picker-dialog';
    dialog.className = 'date-dialog';
    document.body.append(dialog);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    let outsidePointer = false;
    const outside = event => {
      const box = dialog.getBoundingClientRect();
      return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
    };
    dialog.addEventListener('pointerdown', event => { outsidePointer = outside(event); });
    dialog.addEventListener('click', event => {
      if (outsidePointer && outside(event)) { close(); return; }
      const target = event.target.closest('button');
      if (!target) return;
      if (target.hasAttribute('data-close')) close();
      else if (target.dataset.day) commit(parse(target.dataset.day));
      else if (target.hasAttribute('data-today')) commit(localToday());
      else if (target.hasAttribute('data-mode')) {
        mode = mode === 'days' ? 'months' : 'days';
        render(mode === 'months' ? `[data-month="${visible.getUTCMonth()}"]` : '[data-day][tabindex="0"]');
      } else if (target.dataset.step) {
        const step = Number(target.dataset.step);
        const next = date(visible.getUTCFullYear() + (mode === 'months' ? step : 0), visible.getUTCMonth() + (mode === 'days' ? step : 0), 1);
        if (next.getUTCFullYear() < 1 || next.getUTCFullYear() > 9999) return;
        visible = next;
        focused = date(visible.getUTCFullYear(), visible.getUTCMonth(), Math.min(focused.getUTCDate(), date(visible.getUTCFullYear(), visible.getUTCMonth() + 1, 0).getUTCDate()));
        render(`[data-step="${step}"]`);
      } else if (target.dataset.month !== undefined) {
        visible = date(visible.getUTCFullYear(), Number(target.dataset.month), 1);
        focused = date(visible.getUTCFullYear(), visible.getUTCMonth(), Math.min(focused.getUTCDate(), date(visible.getUTCFullYear(), visible.getUTCMonth() + 1, 0).getUTCDate()));
        mode = 'days';
        render('[data-day][tabindex="0"]');
      }
    });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Tab') {
        const controls = [...dialog.querySelectorAll('button:not(:disabled)')].filter(el => el.tabIndex >= 0 && el.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        return;
      }
      const target = event.target.closest('[data-day], [data-month]');
      if (!target) return;
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      if (mode === 'months') {
        let month = Number(target.dataset.month);
        const offsets = {ArrowLeft:-1, ArrowRight:1, ArrowUp:-3, ArrowDown:3};
        month = event.key === 'Home' ? 0 : event.key === 'End' ? 11 : month + (offsets[event.key] || 0);
        if (month >= 0 && month <= 11) {
          dialog.querySelectorAll('[data-month]').forEach(el => el.tabIndex = Number(el.dataset.month) === month ? 0 : -1);
          dialog.querySelector(`[data-month="${month}"]`).focus();
        }
        return;
      }
      const offsets = {ArrowLeft:-1, ArrowRight:1, ArrowUp:-7, ArrowDown:7};
      let next;
      if (event.key === 'PageUp' || event.key === 'PageDown') {
        const offset = (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1);
        const first = date(focused.getUTCFullYear(), focused.getUTCMonth() + offset, 1);
        next = date(first.getUTCFullYear(), first.getUTCMonth(), Math.min(focused.getUTCDate(), date(first.getUTCFullYear(), first.getUTCMonth() + 1, 0).getUTCDate()));
      } else {
        const offset = event.key === 'Home' ? -focused.getUTCDay() : event.key === 'End' ? 6 - focused.getUTCDay() : offsets[event.key];
        next = date(focused.getUTCFullYear(), focused.getUTCMonth(), focused.getUTCDate() + offset);
      }
      if (next.getUTCFullYear() < 1 || next.getUTCFullYear() > 9999) return;
      focused = next;
      visible = date(next.getUTCFullYear(), next.getUTCMonth(), 1);
      render('[data-day][tabindex="0"]');
    });
    addEventListener('resize', position);
    document.addEventListener('scroll', position, true);
  }

  function open(element, source) {
    ensureDialog();
    input = element;
    opener = source;
    selected = parse(input.value);
    focused = selected || localToday();
    visible = date(focused.getUTCFullYear(), focused.getUTCMonth(), 1);
    mode = 'days';
    input.closest('.date-field').classList.add('is-open');
    document.querySelector(`[data-date-open="${input.id}"]`).setAttribute('aria-expanded', 'true');
    document.body.classList.add('date-picker-open');
    dialog.setAttribute('aria-label', `選擇${input.dataset.dateLabel}`);
    render();
    dialog.showModal();
    position();
    dialog.querySelector('[data-day][tabindex="0"]').focus({preventScroll:true});
  }

  function close() {
    dialog.close();
    document.body.classList.remove('date-picker-open');
    input.closest('.date-field').classList.remove('is-open');
    document.querySelector(`[data-date-open="${input.id}"]`).setAttribute('aria-expanded', 'false');
    opener?.focus({preventScroll:true});
  }

  function commit(chosen) {
    input.value = iso(chosen).replaceAll('-', '/');
    input.closest('.date-field').classList.add('has-value');
    input.dispatchEvent(new Event('input', {bubbles:true}));
    input.dispatchEvent(new Event('change', {bubbles:true}));
    validate(input.id, input.required);
    close();
  }

  function render(focusSelector) {
    const year = visible.getUTCFullYear(), month = visible.getUTCMonth(), today = localToday();
    const todayIso = iso(today);
    const title = mode === 'days' ? `${year} 年 ${month + 1} 月` : `${year} 年`;
    const header = `<div class="calendar-header"><button type="button" class="calendar-title" data-mode aria-label="${mode === 'days' ? '選擇年份與月份' : '返回日期選擇'}"><span id="calendar-heading" aria-live="polite">${title}</span>${mode === 'days' ? svg('<path d="m8 10 4 4 4-4"/>') : ''}</button><div class="calendar-navigation"><button type="button" data-step="-1" aria-label="${mode === 'days' ? '上一個月' : '上一年'}">${arrow(-1)}</button><button type="button" data-step="1" aria-label="${mode === 'days' ? '下一個月' : '下一年'}">${arrow(1)}</button></div></div>`;
    let content;
    if (mode === 'months') {
      content = `<div class="calendar-months" role="group" aria-label="選擇月份">${Array.from({length:12}, (_, i) => `<button type="button" data-month="${i}" tabindex="${i === month ? 0 : -1}" aria-pressed="${i === month}" class="${i === month ? 'is-selected' : ''}">${i + 1} 月</button>`).join('')}</div><div class="calendar-footer"><button type="button" class="calendar-today" data-mode>${arrow(-1)}返回日期選擇</button></div>`;
    } else {
      const firstWeekday = visible.getUTCDay();
      const days = date(year, month + 1, 0).getUTCDate();
      const cells = Math.max(5, Math.ceil((firstWeekday + days) / 7)) * 7;
      const grid = Array.from({length:cells}, (_, i) => {
        const d = date(year, month, i - firstWeekday + 1), key = iso(d);
        const isSelected = selected && key === iso(selected), isToday = key === todayIso;
        const disabled = d.getUTCFullYear() < 1 || d.getUTCFullYear() > 9999;
        return `<td role="gridcell" aria-selected="${Boolean(isSelected)}"><button type="button" data-day="${key}" tabindex="${key === iso(focused) ? 0 : -1}" ${disabled ? 'disabled' : ''} ${isToday ? 'aria-current="date"' : ''} aria-label="${d.getUTCFullYear()} 年 ${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日，星期${weekdays[d.getUTCDay()]}${isToday ? '，今天' : ''}" class="calendar-day${d.getUTCMonth() !== month ? ' is-outside' : ''}${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}">${d.getUTCDate()}</button></td>`;
      });
      const rows = Array.from({length:cells / 7}, (_, i) => `<tr role="row">${grid.slice(i * 7, i * 7 + 7).join('')}</tr>`).join('');
      content = `<table role="grid" class="calendar-grid" aria-labelledby="calendar-heading"><thead><tr role="row">${weekdays.map(day => `<th scope="col" aria-label="星期${day}">${day}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><div class="calendar-footer"><button type="button" class="calendar-today" data-today>${calendarIcon}回到今天</button><span>${today.getUTCMonth() + 1} 月 ${today.getUTCDate()} 日 · 週${weekdays[today.getUTCDay()]}</span></div>`;
    }
    dialog.innerHTML = `<div class="date-sheet-handle" aria-hidden="true"></div><div class="date-sheet-heading"><h2>選擇${escape(input.dataset.dateLabel)}</h2><button type="button" data-close aria-label="關閉日期選擇器">${svg('<path d="m6 6 12 12m0-12L6 18"/>')}</button></div><div class="calendar-content">${header}${content}</div>`;
    position();
    if (focusSelector) dialog.querySelector(focusSelector)?.focus({preventScroll:true});
  }

  function position() {
    if (!dialog?.open) return;
    if (mobile.matches) { dialog.style.removeProperty('left'); dialog.style.removeProperty('top'); return; }
    const anchor = input.closest('.date-field').getBoundingClientRect();
    const width = dialog.offsetWidth, height = dialog.offsetHeight;
    const top = anchor.bottom + 8 + height <= innerHeight - 12 ? anchor.bottom + 8 : anchor.top - height - 8;
    dialog.style.left = `${Math.max(12, Math.min(anchor.left, innerWidth - width - 12))}px`;
    dialog.style.top = `${Math.max(12, Math.min(top, innerHeight - height - 12))}px`;
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-date-open]');
    if (trigger) { open(document.getElementById(trigger.dataset.dateOpen), trigger); return; }
    const clear = event.target.closest('[data-date-clear]');
    if (clear) {
      const element = document.getElementById(clear.dataset.dateClear);
      element.value = '';
      element.closest('.date-field').classList.remove('has-value');
      validate(element.id);
      element.dispatchEvent(new Event('change', {bubbles:true}));
      element.focus();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.target.matches('[data-date-input]') && event.key === 'ArrowDown') {
      event.preventDefault(); open(event.target, event.target);
    }
  });
  document.addEventListener('focusout', event => {
    if (!event.target.matches('[data-date-input]')) return;
    const element = event.target, parsed = parse(element.value);
    if (parsed) element.value = iso(parsed).replaceAll('-', '/');
    element.closest('.date-field').classList.toggle('has-value', Boolean(element.value));
    validate(element.id, element.required);
  });
  document.addEventListener('input', event => {
    if (!event.target.matches('[data-date-input]')) return;
    event.target.closest('.date-field').classList.toggle('has-value', Boolean(event.target.value));
    if (event.target.getAttribute('aria-invalid') === 'true') validate(event.target.id, event.target.required);
  });
  ensureDialog();
  window.TravelDatePicker = {field, value, validate};
})();
