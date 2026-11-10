(() => {
  const $ = (id) => document.getElementById(id);
  const show = (id, visible = true) => { const el = $(id); if (el) el.hidden = !visible; };
  const feedback = (id, message) => { const el = $(id); if (el) { el.textContent = message; el.hidden = false; } };
  const money = (value, code) => `${code} ${Number(value).toLocaleString('zh-TW')}`;
  const nameKey = (value) => value.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
  const viewState = new URLSearchParams(location.search).get('state');
  if (['loading', 'error', 'unconfirmed'].includes(viewState)) {
    const banner = document.createElement('div');
    banner.className = `feedback${viewState === 'error' ? ' error-state' : ''}`;
    banner.setAttribute('role', viewState === 'error' ? 'alert' : 'status');
    banner.style.marginBottom = '22px';
    const copy = {
      loading: '正在載入最新帳務資料，請稍候。',
      error: '目前無法取得最新資料。請檢查連線後重試。',
      unconfirmed: '這次保存的結果還無法確認。請先查證結果，暫時不要重新送出。',
    };
    const message = document.createElement('span'); message.textContent = copy[viewState]; banner.append(message);
    if (viewState !== 'loading') {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'btn secondary small';
      button.style.marginLeft = '12px'; button.textContent = viewState === 'error' ? '重新載入' : '查證結果';
      button.addEventListener('click', () => { if (viewState === 'error') location.href = location.pathname; else message.textContent = '目前仍無法確認保存結果，請稍後再查證。'; });
      banner.append(button);
    }
    document.querySelector('main .page-head')?.after(banner);
    if (viewState === 'loading' || viewState === 'unconfirmed') document.querySelectorAll('form button[type=submit]').forEach((button) => { button.disabled = true; });
  }
  const shareDigits = (raw, count) => {
    if (!count || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(raw)) return '—';
    const places = (raw.split('.')[1] || '').length;
    const numerator = BigInt(raw.replace('.', ''));
    const denominator = BigInt(count) * 10n ** BigInt(places);
    const whole = numerator / denominator;
    let remainder = numerator % denominator;
    if (!remainder) return whole.toLocaleString('zh-TW');
    let digits = '';
    for (let i = 0; i < 6 && remainder; i++) { remainder *= 10n; digits += String(remainder / denominator); remainder %= denominator; }
    return `${whole.toLocaleString('zh-TW')}.${digits}${remainder ? '…' : ''}`;
  };

  const memberForm = $('member-form');
  if (memberForm) {
    const names = ['alice', 'amy', 'bob', 'carol'];
    memberForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = $('member-name');
      const name = input.value.trim();
      const error = $('member-error');
      if (!name) { error.textContent = '請輸入同行者名稱。'; input.focus(); return; }
      if (names.includes(nameKey(name))) { error.textContent = '這個名字已在這趟旅行使用，請換一個名稱。'; input.focus(); return; }
      error.textContent = '';
      names.push(nameKey(name));
      const row = document.createElement('div');
      row.className = 'list-row';
      row.innerHTML = `<span class="person"><span class="avatar"></span><span class="person-meta"><strong></strong><small>啟用中 · 尚無帳務紀錄</small></span></span><button class="btn ghost small" type="button">刪除</button>`;
      row.querySelector('.avatar').textContent = name.slice(0, 1);
      row.querySelector('strong').textContent = name;
      row.querySelector('button').addEventListener('click', () => { row.remove(); names.splice(names.indexOf(nameKey(name)), 1); feedback('member-feedback', `${name} 已刪除。`); });
      $('new-member-row').append(row);
      input.value = '';
      feedback('member-feedback', `${name} 已加入這趟旅行。`);
    });
    let selected = 'Amy';
    document.querySelectorAll('[data-member]').forEach((button) => button.addEventListener('click', () => {
      selected = button.dataset.member;
      $('member-modal-title').textContent = `管理 ${selected}`;
      $('rename-input').value = selected;
      $('rename-error').textContent = '';
      show('member-modal'); $('rename-input').focus();
    }));
    $('close-member-modal').addEventListener('click', () => show('member-modal', false));
    $('member-modal').addEventListener('click', (event) => { if (event.target.id === 'member-modal') show('member-modal', false); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !$('member-modal').hidden) show('member-modal', false); });
    $('save-rename').addEventListener('click', () => {
      const name = $('rename-input').value.trim();
      if (!name) { $('rename-error').textContent = '請輸入名稱。'; return; }
      if (nameKey(name) !== nameKey(selected) && names.includes(nameKey(name))) { $('rename-error').textContent = '這個名字已在這趟旅行使用，請換一個名稱。'; return; }
      const row = document.querySelector(`[data-member="${selected}"]`).closest('.list-row');
      row.querySelector('.person-meta strong').textContent = name;
      row.querySelector('[data-member]').dataset.member = name;
      names.splice(names.indexOf(nameKey(selected)), 1, nameKey(name));
      selected = name;
      show('member-modal', false); feedback('member-feedback', `已更新為 ${name}，過去的帳務紀錄仍屬於同一位同行者。`);
    });
    $('deactivate').addEventListener('click', () => { show('member-modal', false); feedback('member-feedback', `${selected} 已停用。過去的支出與還款仍會保留；新支出不能再選用。`); });
    $('reactivate').addEventListener('click', () => { $('inactive-row').querySelector('.pill').textContent = '啟用中'; $('inactive-row').querySelector('.pill').className = 'pill green'; $('inactive-row').querySelector('small').textContent = '可再次用於新支出與還款'; $('reactivate').hidden = true; feedback('member-feedback', 'Carol 已重新啟用。'); });
  }

  const expenseForm = $('expense-form');
  if (expenseForm) {
    const update = () => {
      const code = $('expense-currency').value;
      const people = [...document.querySelectorAll('input[name=share]:checked')].map((input) => input.value);
      const payer = document.querySelector('input[name=payer]:checked')?.value || '';
      $('payer-preview').textContent = payer;
      $('people-preview').textContent = people.length ? people.join('、') : '尚未選擇';
      const digits = shareDigits($('expense-amount').value.trim(), people.length);
      $('share-preview').textContent = digits === '—' ? '—' : `${code} ${digits}`;
      $('share-formula').textContent = people.length ? `${$('expense-amount').value || 0} ÷ ${people.length} · ${digits.includes('…') ? '尚未取整' : '每人相同'}` : '至少選一位分攤者';
    };
    expenseForm.addEventListener('input', update); expenseForm.addEventListener('change', update);
    expenseForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const code = $('expense-currency').value;
      const amount = $('expense-amount').value.trim();
      const shares = document.querySelectorAll('input[name=share]:checked').length;
      const error = $('expense-error');
      if (!$('expense-item').value.trim()) { error.textContent = '請輸入項目。'; $('expense-item').focus(); return; }
      if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(amount) || Number(amount) <= 0 || (code === 'JPY' && !/^\d+$/.test(amount))) { error.textContent = `請輸入有效的 ${code} 正數金額${code === 'JPY' ? '，日圓實付金額須為整數' : ''}。`; $('expense-amount').focus(); return; }
      if (!shares) { error.textContent = '至少選一位分攤者。'; return; }
      error.textContent = ''; feedback('expense-feedback', '點心已儲存。公平份額與分帳結算已更新。');
    });
  }

  const simplify = $('simplify-switch');
  if (simplify) {
    const repaymentHeading = [...document.querySelectorAll('h2')].find((heading) => heading.textContent === '實際還款');
    const repaymentRow = repaymentHeading?.closest('.card')?.querySelector('.list-row');
    if (repaymentRow) repaymentRow.innerHTML = '<span class="muted">目前還沒有已記錄的實際還款。</span>';
    const settled = JSON.parse(localStorage.getItem('prototype-settled') || '{}');
    document.querySelectorAll('.arrangement').forEach((row) => {
      const person = row.querySelector('a')?.href.includes('person=Bob') ? 'Bob' : 'Amy';
      if (settled[person]) row.hidden = true;
    });
    if (settled.Amy || settled.Bob) {
      const note = document.createElement('p');
      note.className = 'feedback'; note.setAttribute('role', 'status');
      note.textContent = `已結清：${['Amy', 'Bob'].filter((person) => settled[person]).join('、')}。原始 JPY 100 支出與每人 JPY 100/3 的公平份額保持不變。`;
      document.querySelector('.arrangement').parentElement.prepend(note);
      if (settled.Amy && settled.Bob) {
        const empty = document.createElement('p'); empty.className = 'muted'; empty.textContent = '這筆點心分攤已全部結清。';
        document.querySelector('.arrangement').parentElement.append(empty);
      }
    }
    const render = () => {
      const on = localStorage.getItem('prototype-simplify') === 'true';
      simplify.setAttribute('aria-checked', String(on));
      simplify.setAttribute('aria-label', `Simplify Debts，${on ? '開啟' : '關閉'}`);
      $('switch-feedback').textContent = on ? '已開啟，正在顯示簡化後的付款建議。' : '目前顯示直接付款關係。';
      show('demo-direct', !on); show('demo-simplified', on);
      $('demo-count').textContent = on ? '一筆建議付款 · 少一筆' : '兩筆直接付款';
      $('demo-explanation').textContent = on ? 'Alice 原本經 Bob 間接支付 Carol。本次改為 Alice 直接支付 Carol JPY 60，少一筆轉帳。三人的淨應收應付不變，原始支出與還款紀錄也沒有修改。' : '開啟 Simplify Debts 後，可查看較少轉帳的建議。';
      $('explanation').textContent = on ? '這兩筆點心付款沒有需要改道的安排；精確淨額與原始紀錄不變。' : '目前沒有需要改道的付款；原始支出與已記錄還款都沒有改變。';
    };
    simplify.addEventListener('click', () => { localStorage.setItem('prototype-simplify', String(simplify.getAttribute('aria-checked') !== 'true')); render(); });
    render();
  }

  const settleForm = $('settle-form');
  if (settleForm) {
    const person = new URLSearchParams(location.search).get('person') === 'Bob' ? 'Bob' : 'Amy';
    $('settle-obligation').textContent = `${person} → Alice · JPY 33.333…`;
    settleForm.addEventListener('submit', (event) => {
      event.preventDefault(); const raw = $('actual-paid').value.trim();
      if (!/^[1-9]\d*$/.test(raw)) { $('settle-error').textContent = '請輸入實際支付的正整數日圓金額。'; $('actual-paid').focus(); return; }
      $('settle-error').textContent = '';
      $('settle-result-text').textContent = `${person} 實際支付 Alice JPY ${Number(raw).toLocaleString('zh-TW')}。`;
      $('settle-result-paid').textContent = money(raw, 'JPY');
      const settled = JSON.parse(localStorage.getItem('prototype-settled') || '{}');
      settled[person] = raw;
      localStorage.setItem('prototype-settled', JSON.stringify(settled));
      show('settle-form-wrap', false); show('settle-result');
      $('settle-result').scrollIntoView({block:'start'});
    });
  }

  const repaymentForm = $('repayment-form');
  if (repaymentForm) {
    let pending = null;
    repaymentForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const payer = $('repayment-payer').value, payee = $('repayment-payee').value, code = $('repayment-currency').value, raw = $('repayment-amount').value.trim();
      if (payer === payee) { $('repayment-error').textContent = '付款人與收款人不能是同一人。'; return; }
      if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(raw) || Number(raw) <= 0 || (code === 'JPY' && !/^\d+$/.test(raw))) { $('repayment-error').textContent = `請輸入有效的 ${code} 正數金額。`; return; }
      $('repayment-error').textContent = '';
      if (payer === 'Amy' && payee === 'Alice' && code === 'JPY' && Number(raw) > 600) {
        pending = {payer,payee,code,raw}; const excess = Number(raw) - 600;
        $('overpay-description').textContent = `Amy 目前應付 Alice JPY 600。若記錄 JPY ${Number(raw).toLocaleString('zh-TW')}，將超額 JPY ${excess.toLocaleString('zh-TW')}，之後會改為 Alice 應付 Amy JPY ${excess.toLocaleString('zh-TW')}。`;
        show('overpay-modal'); $('confirm-overpay').focus(); return;
      }
      const remaining = payer === 'Amy' && payee === 'Alice' && code === 'JPY' ? 600 - Number(raw) : null;
      feedback('repayment-feedback', `${payer} 付給 ${payee} ${money(raw, code)} 已保存。${remaining === null ? '此幣別的付款安排已重新計算。' : `剩餘應付 JPY ${remaining.toLocaleString('zh-TW')}；其他幣別不變。`}`);
    });
    $('cancel-overpay').addEventListener('click', () => { pending = null; show('overpay-modal', false); $('repayment-amount').focus(); });
    $('confirm-overpay').addEventListener('click', () => { if (!pending) return; const excess = Number(pending.raw) - 600; show('overpay-modal', false); feedback('repayment-feedback', `已保存 ${pending.payer} 付給 ${pending.payee} ${money(pending.raw, pending.code)}。超額 JPY ${excess.toLocaleString('zh-TW')} 使 Alice 改為應付 Amy；其他幣別不變。`); pending = null; });
    $('overpay-modal').addEventListener('click', (event) => { if (event.target.id === 'overpay-modal') $('cancel-overpay').click(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !$('overpay-modal').hidden) $('cancel-overpay').click(); });
  }
})();
