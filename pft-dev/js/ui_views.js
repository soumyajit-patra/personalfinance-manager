Object.assign(UI, {
  renderTransactionsView() {
    const list = document.getElementById('tx-full-list');
    
    // Filters
    const monthVal = document.getElementById('filter-month').value;
    const catVal = document.getElementById('filter-category').value;
    const typeVal = document.getElementById('filter-type').value;
    const searchVal = document.getElementById('filter-query').value.toLowerCase();
    
    let filtered = AppStore.state.transactions;
    
    if (monthVal) {
      filtered = filtered.filter(t => t.date.startsWith(monthVal));
    }
    if (catVal && catVal !== 'ALL') {
      filtered = filtered.filter(t => t.category === catVal);
    }
    if (typeVal && typeVal !== 'ALL') {
      filtered = filtered.filter(t => t.type === typeVal);
    }
    if (searchVal) {
      filtered = filtered.filter(t => 
        (t.note && t.note.toLowerCase().includes(searchVal)) || 
        t.category.toLowerCase().includes(searchVal) || 
        t.amount.toString().includes(searchVal)
      );
    }
    
    // Setup cat filter dropdown on first load if missing
    const catSelect = document.getElementById('filter-category');
    if (catSelect.options.length === 1) {
       const opts = AppStore.state.settings.categories.map(c => `<option value="${c.name}">${c.emoji} ${c.name}</option>`);
       catSelect.innerHTML = `<option value="ALL">All Categories</option>` + opts.join('');
    }

    if (filtered.length === 0) {
      list.innerHTML = '<li class="empty-state">No transactions match your filters.</li>';
      return;
    }
    
    list.innerHTML = filtered.map(t => {
      const isInc = t.type === 'Income';
      const dStr = t.date.split('-').reverse().slice(0,2).join(' '); // DD MM
      const emj = AppStore.getCategoryEmoji(t.category);
      const amtColor = isInc ? 'sage' : 'text-main';
      const prefix = isInc ? '+' : '-';
      const srcMap = { 'splitwise': 'SW', 'csv': 'CSV', 'sms': 'SMS' };
      const srcPill = t.source && t.source !== 'manual' ? `<span class="tx-source">${srcMap[t.source] || t.source}</span>` : '';
      const isSwMatch = t.source === 'splitwise';
      
      return `
        <li class="tx-row ${isSwMatch?'splitwise-tx':''}" style="cursor:default">
          <input type="checkbox" class="tx-checkbox" data-id="${t.id}" style="margin-right:12px; width:18px; height:18px;">
          <div class="tx-date" onclick="UI.openTxSheet(AppStore.state.transactions.find(tx=>tx.id==='${t.id}'))" style="cursor:pointer">${dStr}</div>
          <div class="tx-cat" onclick="UI.openTxSheet(AppStore.state.transactions.find(tx=>tx.id==='${t.id}'))" style="cursor:pointer">${emj}</div>
          <div class="tx-note" onclick="UI.openTxSheet(AppStore.state.transactions.find(tx=>tx.id==='${t.id}'))" style="cursor:pointer">${t.note || t.category} ${srcPill}</div>
          <div class="tx-amt ${amtColor}" onclick="UI.openTxSheet(AppStore.state.transactions.find(tx=>tx.id==='${t.id}'))" style="cursor:pointer">${prefix}${AppStore.state.settings.currency}${parseFloat(t.amount).toLocaleString('en-IN')}</div>
        </li>
      `;
    }).join('');
    
    // Bind checkboxes to bulk actions
    document.querySelectorAll('.tx-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
         const checkedCount = document.querySelectorAll('.tx-checkbox:checked').length;
         const bar = document.getElementById('tx-bulk-actions');
         if (checkedCount > 0) {
           bar.classList.remove('hidden');
           document.getElementById('tx-selected-count').innerText = `${checkedCount} selected`;
         } else {
           bar.classList.add('hidden');
         }
      });
    });
  },

  renderBudgetsView() {
    const list = document.getElementById('budget-list-container');
    const bCats = Object.keys(AppStore.state.budgets);
    const incGhosts = document.getElementById('sw-overlay-toggle').checked;
    
    const hScore = Budget.calculateHealth();
    document.getElementById('budget-health-score').innerText = hScore !== null ? hScore : '--';
    document.getElementById('budget-health-label').innerText = Budget.getHealthCommentary(hScore);
    
    // health score styling
    const hsEl = document.getElementById('budget-health-score');
    hsEl.className = 'health-score mono ' + (hScore>=70 ? 'sage' : hScore>=50 ? 'amber' : hScore!==null ? 'coral' : '');

    if (bCats.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <p>No budgets set.</p>
          <button class="secondary-btn" onclick="UI.openBudgetSheet()">Set up a budget</button>
        </div>`;
      return;
    }
    
    list.innerHTML = bCats.map(cat => {
      const stats = Budget.getBudgetStats(cat, incGhosts);
      const isWarning = stats.percent >= 75;
      const isDanger = stats.percent >= 100;
      const fColor = isDanger ? 'var(--danger)' : isWarning ? 'var(--accent)' : 'var(--success)';
      const wd = Math.min(stats.percent, 100);
      
      return `
        <div class="budget-card" onclick="UI.openBudgetSheet('${cat}')" style="cursor:pointer">
          <div class="bdg-header">
            <strong>${AppStore.getCategoryEmoji(cat)} ${cat}</strong>
            <span class="muted">${stats.limit.toLocaleString('en-IN')}/${stats.period === 'Monthly'?'mo':'wk'}</span>
          </div>
          <div class="bdg-track">
            <div class="bdg-fill" style="width: ${wd}%; background: ${fColor}"></div>
          </div>
          <div class="bdg-stats">
            <span>Spent ${AppStore.state.settings.currency}${stats.spent.toLocaleString('en-IN')}</span>
            <span>${stats.remaining >= 0 ? 'Left' : 'Over'} ${AppStore.state.settings.currency}${Math.abs(stats.remaining).toLocaleString('en-IN')}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  renderHabitsView() {
    const grid = document.getElementById('habits-grid-container');
    
    grid.innerHTML = AppStore.state.habits.map(h => {
      const streak = Habits.getStreak(h.id);
      const hm = Habits.getHeatmap(h.id);
      const mot = Habits.getMotivationLine(streak);
      const isManual = h.type.includes('manual');
      const todayDs = new Date().toISOString().split('T')[0];
      const doneToday = h.log.includes(todayDs);
      
      return `
        <div class="habit-card">
          <div class="habit-header">
            <strong>${h.name}</strong>
            <span class="habit-streak">🔥 ${streak}</span>
          </div>
          <div class="heatmap">
            ${hm.map(d => `<div class="heat-cell ${d.active?'active':''} ${d.isToday?'today':''}" title="${d.date}"></div>`).join('')}
          </div>
          ${isManual ? `
            <button class="secondary-btn full-width mb-2" onclick="Habits.toggleManualHabit('${h.id}', '${todayDs}'); UI.renderHabitsView();">
              ${doneToday ? '✓ Recorded' : 'Log for today'}
            </button>
          ` : '<div style="height:44px; margin-bottom:16px;"></div>'}
          <div class="habit-motivation">${mot}</div>
        </div>
      `;
    }).join('');
  },

  renderSplitwiseQueue() {
    const section = document.getElementById('sw-reconciliation-section');
    const list = document.getElementById('sw-ghost-list');
    
    const ghosts = AppStore.state.splitwise.expenses.filter(e => !e.settled && !e.matchedTransactionId && !AppStore.state.splitwise.dismissedGhostIds.includes(e.id));
    
    if (ghosts.length === 0) {
      section.classList.add('hidden');
      return;
    }
    
    section.classList.remove('hidden');
    
    list.innerHTML = ghosts.map(g => {
       const cur = AppStore.state.settings.currency;
       const dStr = g.date.split('-').reverse().slice(0,2).join(' ');
       return `
         <div class="ghost-card">
           <div class="ghost-text">Splitwise says you spent <strong class="mono">${cur}${g.yourShare}</strong> on ${g.description} on ${dStr}.</div>
           <div class="ghost-actions">
             <button class="primary-btn" style="padding:8px 12px; font-size:13px" onclick="Splitwise.createTxFromGhost('${g.id}'); UI.render(); UI.toast('Transaction created')">✓ Add</button>
             <button class="secondary-btn" style="padding:8px 12px; font-size:13px" onclick="UI.openGhostMatchSheet('${g.id}')">↔ Link</button>
             <button class="danger-btn" style="padding:8px 12px; font-size:13px" onclick="Splitwise.dismissGhost('${g.id}'); UI.render(); UI.toast('Ignored')">✗ Ignore</button>
           </div>
         </div>
       `;
    }).join('');
  },
  
  openGhostMatchSheet(ghostId) {
    this.selectedTxToMatchGhostId = ghostId;
    const ghost = AppStore.state.splitwise.expenses.find(e => e.id === ghostId);
    if (!ghost) return;
    
    const sheet = document.getElementById('sheet-match-tx');
    const overlay = document.getElementById('modal-overlay');
    
    document.getElementById('match-sw-info').innerHTML = `
      <strong>SW Expense:</strong> ${ghost.description}<br>
      Date: ${ghost.date} | You Owe: ₹${ghost.yourShare}
    `;
    
    // Find candidate txs (expenses, unmatched, within 5 days)
    const ghostDate = new Date(ghost.date);
    const candidates = AppStore.state.transactions.filter(tx => {
       if (tx.source === 'splitwise' || tx.type === 'Income') return false;
       const txDate = new Date(tx.date);
       const diff = Math.abs((txDate - ghostDate) / 86400000);
       return diff <= 5;
    });
    
    const list = document.getElementById('match-candidate-list');
    if (candidates.length === 0) {
      list.innerHTML = `<li class="empty-state">No nearby expenses found. You may need to "Add" it instead.</li>`;
    } else {
      list.innerHTML = candidates.map(t => {
        return `
          <li class="tx-row" onclick="Splitwise.linkGhost('${ghostId}', '${t.id}'); UI.closeSheets(); UI.render(); UI.toast('Linked to transaction');">
            <div class="tx-date">${t.date.substring(5)}</div>
            <div class="tx-note">${t.note || t.category}</div>
            <div class="tx-amt">₹${parseFloat(t.amount).toLocaleString('en-IN')}</div>
          </li>
        `;
      }).join('');
    }
    
    overlay.classList.remove('hidden');
    sheet.classList.remove('hidden');
    setTimeout(() => {
      overlay.classList.add('show');
      sheet.classList.add('show');
    }, 10);
  }
});
