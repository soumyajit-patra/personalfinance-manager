const UI = {
  currentView: 'dashboard',
  selectedTxToMatchGhostId: null,

  init() {
    this.bindNav();
    this.bindSheets();
    this.bindForms();
    this.bindSettings();
    this.bindImport();
  },

  bindNav() {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-target');
        if (target) this.switchView(target);
      });
    });
    
    document.getElementById('mobile-settings-btn').addEventListener('click', () => this.switchView('settings'));
  },
  
  switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const vEl = document.getElementById(`view-${viewId}`);
    if (vEl) vEl.classList.add('active');
    
    document.querySelectorAll(`.nav-item[data-target="${viewId}"]`).forEach(n => n.classList.add('active'));
    
    this.currentView = viewId;
    this.render();
  },

  toast(msg) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerText = msg;
    c.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 300);
    }, 3000);
  },

  bindSheets() {
    const overlay = document.getElementById('modal-overlay');
    
    const closeAll = () => {
      document.querySelectorAll('.bottom-sheet.show').forEach(s => {
        s.classList.remove('show');
        setTimeout(() => s.classList.add('hidden'), 200);
      });
      overlay.classList.remove('show');
      setTimeout(() => overlay.classList.add('hidden'), 200);
      this.selectedTxToMatchGhostId = null;
    };
    
    overlay.addEventListener('click', closeAll);
    document.querySelectorAll('.close-sheet').forEach(btn => btn.addEventListener('click', closeAll));
    
    document.getElementById('fab-add-tx').addEventListener('click', () => this.openTxSheet());
    document.getElementById('btn-add-budget').addEventListener('click', () => this.openBudgetSheet());
  },

  openTxSheet(tx = null) {
    const sheet = document.getElementById('sheet-add-tx');
    const overlay = document.getElementById('modal-overlay');
    
    // populate cats
    const catSelect = document.getElementById('tx-category');
    catSelect.innerHTML = AppStore.state.settings.categories.map(c => `<option value="${c.name}">${c.emoji} ${c.name}</option>`).join('');
    
    if (tx) {
      document.getElementById('tx-sheet-title').innerText = "Edit Transaction";
      document.getElementById('tx-id').value = tx.id;
      document.getElementById(`tx-type-${tx.type === 'Income' ? 'inc' : 'exp'}`).checked = true;
      document.getElementById('tx-amount').value = tx.amount;
      document.getElementById('tx-date').value = tx.date;
      document.getElementById('tx-category').value = tx.category;
      document.getElementById('tx-note').value = tx.note || '';
      document.getElementById('tx-source').value = tx.source || 'manual';
    } else {
      document.getElementById('tx-sheet-title').innerText = "Add Transaction";
      document.getElementById('form-tx').reset();
      document.getElementById('tx-id').value = "";
      document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('tx-source').value = "manual";
    }
    
    overlay.classList.remove('hidden');
    sheet.classList.remove('hidden');
    // slight delay for transition
    setTimeout(() => {
      overlay.classList.add('show');
      sheet.classList.add('show');
    }, 10);
  },

  openBudgetSheet(catName = null) {
    const sheet = document.getElementById('sheet-budget');
    const overlay = document.getElementById('modal-overlay');
    
    const catSelect = document.getElementById('bdg-category');
    catSelect.innerHTML = AppStore.state.settings.categories.map(c => `<option value="${c.name}">${c.emoji} ${c.name}</option>`).join('');
    
    if (catName && AppStore.state.budgets[catName]) {
      const b = AppStore.state.budgets[catName];
      document.getElementById('bdg-category').value = catName;
      document.getElementById('bdg-limit').value = b.limit;
      document.getElementById('bdg-period').value = b.period;
      document.getElementById('budget-sheet-title').innerText = "Edit Budget";
    } else {
      document.getElementById('form-budget').reset();
      document.getElementById('budget-sheet-title').innerText = "Set Budget";
    }
    
    overlay.classList.remove('hidden');
    sheet.classList.remove('hidden');
    setTimeout(() => {
      overlay.classList.add('show');
      sheet.classList.add('show');
    }, 10);
  },

  closeSheets() {
    document.getElementById('modal-overlay').click();
  },

  bindForms() {
    document.getElementById('form-tx').addEventListener('submit', (e) => {
      e.preventDefault();
      const typeStr = document.querySelector('input[name="tx-type"]:checked').value;
      
      const tx = {
        id: document.getElementById('tx-id').value || AppStore.generateId(),
        type: typeStr,
        amount: parseFloat(document.getElementById('tx-amount').value),
        date: document.getElementById('tx-date').value,
        category: document.getElementById('tx-category').value,
        note: document.getElementById('tx-note').value,
        source: document.getElementById('tx-source').value
      };
      
      // If editing existing, we need to replace or we just rely on addTransaction which shouldn't duplicate if ID matches
      // Wait, Store.addTransaction appends. Let's fix that.
      const eIdx = AppStore.state.transactions.findIndex(t => t.id === tx.id);
      if (eIdx >= 0) {
        AppStore.state.transactions[eIdx] = tx;
        AppStore.save();
      } else {
        AppStore.addTransaction(tx);
      }
      
      Habits.checkAutoHabits();
      this.closeSheets();
      this.toast("Transaction saved");
      this.render();
    });

    document.getElementById('form-budget').addEventListener('submit', (e) => {
      e.preventDefault();
      const cat = document.getElementById('bdg-category').value;
      const limit = parseFloat(document.getElementById('bdg-limit').value);
      const period = document.getElementById('bdg-period').value;
      
      AppStore.state.budgets[cat] = { limit, period };
      AppStore.save();
      
      this.closeSheets();
      this.toast("Budget saved");
      this.render();
    });

    // TX list filter binding
    const txf = ['filter-month', 'filter-category', 'filter-type', 'filter-query'];
    txf.forEach(id => {
      document.getElementById(id).addEventListener('change', () => this.renderTransactionsView());
      document.getElementById(id).addEventListener('keyup', () => this.renderTransactionsView());
    });

    // Bulk delete Cancel
    document.getElementById('btn-tx-bulk-cancel').addEventListener('click', () => {
      const bar = document.getElementById('tx-bulk-actions');
      bar.classList.add('hidden');
      document.querySelectorAll('.tx-checkbox').forEach(cb => cb.checked = false);
    });

    // Bulk delete confirm
    document.getElementById('btn-tx-bulk-delete').addEventListener('click', () => {
      const checked = Array.from(document.querySelectorAll('.tx-checkbox:checked')).map(cb => cb.dataset.id);
      if (checked.length === 0) return;
      if (confirm(`Delete ${checked.length} transactions?`)) {
        checked.forEach(id => AppStore.deleteTransaction(id));
        document.getElementById('tx-bulk-actions').classList.add('hidden');
        this.toast(`${checked.length} transactions deleted`);
        this.renderTransactionsView();
      }
    });
    
    // SW Toggle
    document.getElementById('sw-overlay-toggle').addEventListener('change', () => {
      this.renderBudgetsView();
    });
  },

  bindSettings() {
    const s = AppStore.state.settings;
    document.getElementById('set-name').value = s.name;
    document.getElementById('set-currency').value = s.currency;
    document.getElementById('set-month-start').value = s.monthStart;
    
    document.getElementById('set-name').addEventListener('blur', e => { s.name = e.target.value; AppStore.save(); this.render(); });
    document.getElementById('set-currency').addEventListener('blur', e => { s.currency = e.target.value; AppStore.save(); this.render(); });
    document.getElementById('set-month-start').addEventListener('blur', e => { s.monthStart = parseInt(e.target.value)||1; AppStore.save(); this.render(); });
    
    // Notifs
    document.getElementById('set-notif-enable').checked = AppStore.state.nudge.notificationsEnabled;
    document.getElementById('set-notif-time').value = s.nudgeTime;
    
    document.getElementById('set-notif-enable').addEventListener('change', async e => {
      if (e.target.checked) {
        const ok = await Nudge.requestNotificationPermission();
        if (ok) {
          AppStore.state.nudge.notificationsEnabled = true;
          this.toast("Notifications enabled");
        } else {
          e.target.checked = false;
          AppStore.state.nudge.notificationsEnabled = false;
          this.toast("Permission denied");
        }
      } else {
        AppStore.state.nudge.notificationsEnabled = false;
      }
      AppStore.save();
    });
    
    document.getElementById('set-notif-time').addEventListener('blur', e => {
      s.nudgeTime = e.target.value; AppStore.save(); this.toast("Nudge time saved");
    });
    
    document.getElementById('btn-test-notif').addEventListener('click', () => {
      Nudge.fire();
    });
    
    // Categories
    this.renderSettingsCategories();
    document.getElementById('btn-add-cat').addEventListener('click', () => {
      const n = document.getElementById('set-new-cat-name').value.trim();
      const e = document.getElementById('set-new-cat-emoji').value.trim() || '📦';
      if (!n) return;
      if (!AppStore.state.settings.categories.find(c => c.name === n)) {
        AppStore.state.settings.categories.push({ id: AppStore.generateId(), name: n, emoji: e });
        AppStore.save();
        document.getElementById('set-new-cat-name').value = '';
        this.renderSettingsCategories();
        this.toast("Category added");
      }
    });

    // Data mgmt
    document.getElementById('btn-export-data').addEventListener('click', () => AppStore.export());
    
    document.getElementById('backup-file-input').addEventListener('change', (e) => {
       const file = e.target.files[0];
       if (!file) return;
       const reader = new FileReader();
       reader.onload = (e) => {
          if(confirm("This will replace all your current data. Proceed?")) {
             if(AppStore.importBackup(e.target.result)) {
               this.toast("Backup restored");
               setTimeout(() => location.reload(), 1000);
             } else {
               this.toast("Invalid backup file");
             }
          }
       };
       reader.readAsText(file);
    });

    document.getElementById('btn-clear-data').addEventListener('click', () => {
      if(prompt("Type DELETE to confirm wiping all data") === 'DELETE') {
        AppStore.wipe();
      }
    });
  },

  renderSettingsCategories() {
    const list = document.getElementById('set-cat-list');
    list.innerHTML = AppStore.state.settings.categories.map(c => `
      <li class="cat-row" style="display:flex; justify-content:space-between; margin-bottom:8px; padding:12px; background:var(--bg-elevated); border-radius:4px;">
        <span>${c.emoji} ${c.name}</span>
        ${['Food','Shopping','Entertainment','Transport','Health','Utilities','Housing','Education','Income','Splitwise Settlement'].includes(c.name) ? '' : 
          `<button class="danger-btn" style="padding:4px 8px; font-size:12px;" onclick="UI.deleteCategory('${c.id}')">Delete</button>`
        }
      </li>
    `).join('');
  },
  
  deleteCategory(id) {
    AppStore.state.settings.categories = AppStore.state.settings.categories.filter(c => c.id !== id);
    AppStore.save();
    this.renderSettingsCategories();
  },

  bindImport() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const tab = e.target.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById(`tab-${tab}`).classList.add('active');
      });
    });

    // SMS Import
    document.getElementById('btn-parse-sms').addEventListener('click', () => {
      const text = document.getElementById('sms-textarea').value;
      if(!text) return;
      const res = Parser.parseSMS(text);
      if(res) {
        document.getElementById('sms-result-card').classList.remove('hidden');
        document.getElementById('sms-res-date').value = res.date;
        document.getElementById('sms-res-amount').value = res.amount;
        document.getElementById('sms-res-type').value = res.type;
        const catSelect = document.getElementById('sms-res-cat');
        catSelect.innerHTML = AppStore.state.settings.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        catSelect.value = res.category;
        document.getElementById('sms-res-note').value = res.note;
      }
    });
    
    document.getElementById('btn-sms-add').addEventListener('click', () => {
       const tx = {
         id: AppStore.generateId(),
         date: document.getElementById('sms-res-date').value,
         amount: parseFloat(document.getElementById('sms-res-amount').value),
         type: document.getElementById('sms-res-type').value,
         category: document.getElementById('sms-res-cat').value,
         note: document.getElementById('sms-res-note').value,
         source: 'sms'
       };
       AppStore.addTransaction(tx);
       document.getElementById('sms-textarea').value = '';
       document.getElementById('sms-result-card').classList.add('hidden');
       this.toast("SMS transaction added");
    });
    
    // Splitwise SW user name saving
    const sName = document.getElementById('sw-user-name');
    sName.value = AppStore.state.settings.splitwiseName || '';
    sName.addEventListener('blur', e => {
      AppStore.state.settings.splitwiseName = e.target.value.trim();
      AppStore.save();
    });
    
    document.getElementById('sw-file-input').addEventListener('change', e => {
      const file = e.target.files[0];
      if(!file) return;
      Splitwise.importCSV(file, (count) => {
         this.toast(`Imported ${count} new Splitwise expenses. View Recon Queue.`);
         this.renderSplitwiseQueue();
      });
    });
    
    document.getElementById('sw-help-toggle').addEventListener('click', () => {
       document.getElementById('sw-help-body').classList.toggle('hidden');
    });
  },

  // Main Render Loop
  render() {
    Nudge.checkGuilt();
    
    if (this.currentView === 'dashboard') Object.assign(this, this.renderDashboardView());
    if (this.currentView === 'transactions') this.renderTransactionsView();
    if (this.currentView === 'budgets') this.renderBudgetsView();
    if (this.currentView === 'habits') this.renderHabitsView();
    if (this.currentView === 'reports') Object.assign(this, this.renderReportsView());
    if (this.currentView === 'import') this.renderSplitwiseQueue();
  },

  renderDashboardView() {
    const cur = AppStore.state.settings.currency;
    const today = new Date();
    const stats = Reports.getMonthStats(today.getFullYear(), today.getMonth());
    
    const timeOfDay = today.getHours() < 12 ? 'morning' : today.getHours() < 18 ? 'afternoon' : 'evening';
    document.getElementById('dash-greeting').innerText = `Good ${timeOfDay}, ${AppStore.state.settings.name || 'friend'}.`;
    
    document.getElementById('dash-net-balance').innerText = `${cur}${stats.net.toLocaleString('en-IN')}`;
    document.getElementById('dash-tot-inc').innerText = `${cur}${stats.inc.toLocaleString('en-IN')}`;
    document.getElementById('dash-tot-exp').innerText = `${cur}${stats.exp.toLocaleString('en-IN')}`;
    
    document.getElementById('qs-income').innerText = `${cur}${stats.inc.toLocaleString('en-IN')}`;
    document.getElementById('qs-expenses').innerText = `${cur}${stats.exp.toLocaleString('en-IN')}`;
    document.getElementById('qs-saved').innerText = `${cur}${stats.net.toLocaleString('en-IN')}`;
    
    // Render Ring
    const ringC = document.getElementById('dash-ring-chart');
    if (stats.categories.length > 0) {
      ringC.innerHTML = this.drawRingChart(stats.categories, cur, stats.exp);
    } else {
      ringC.innerHTML = '<span class="muted">No data</span>';
    }
    
    // Draw Sparkline
    const sparkC = document.getElementById('dash-sparkline');
    const last7Tx = [];
    for(let i=6;i>=0;i--){
       let d=new Date(today); d.setDate(today.getDate() - i);
       let ds = d.toISOString().split('T')[0];
       let amt = AppStore.state.transactions.filter(t=>t.date===ds && t.type==='Expense').reduce((s,t)=>s+parseFloat(t.amount),0);
       last7Tx.push(amt);
    }
    sparkC.innerHTML = this.drawSparkline(last7Tx);
    
    // Recent Txs
    const recent = AppStore.state.transactions.slice(0, 5);
    const rtList = document.getElementById('dash-recent-tx');
    if (recent.length > 0) {
      rtList.innerHTML = recent.map(t => this.createTxRowHTML(t)).join('');
    } else {
      rtList.innerHTML = '<li class="empty-state">No transactions yet.</li>';
    }
    
    // Smart Insights
    const ins = Reports.generateInsights(today.getFullYear(), today.getMonth());
    if (ins.length > 0) {
      // rotate based on day of month + hour (pseudo random but stable per hour)
      const rIdx = (today.getDate() + today.getHours()) % ins.length;
      document.getElementById('dash-insight').innerHTML = `<p>${ins[rIdx]}</p>`;
    }

    // Recon Alert
    const unmatchedCount = AppStore.state.splitwise.expenses.filter(e => !e.settled && !e.matchedTransactionId && !AppStore.state.splitwise.dismissedGhostIds.includes(e.id)).length;
    const reconAlert = document.getElementById('reconciliation-alert');
    if (unmatchedCount > 0) {
      reconAlert.classList.remove('hidden');
      document.getElementById('recon-count').innerText = unmatchedCount;
      document.getElementById('btn-review-recon').onclick = () => {
         this.switchView('import');
         document.querySelector('.tab-btn[data-tab="import-splitwise"]').click();
      };
      document.getElementById('btn-dismiss-recon').onclick = () => {
         reconAlert.classList.add('hidden');
         // We do not save standard dismiss, it will return next session
      };
    } else {
      reconAlert.classList.add('hidden');
    }
  },

  drawRingChart(categories, cur, totalExp) {
    let svg = '<svg viewBox="-100 -100 200 200" style="width:100%; height:100%;">';
    let angle = -90; // Top
    
    const colors = ['#f5a623', '#d98b1b', '#b36d10', '#85510b', '#4d2f06', '#2a2a2a'];
    
    // Top 5 and others
    let renderCats = categories.slice(0, 5);
    const others = categories.slice(5).reduce((s,c)=>s+c.total, 0);
    if(others > 0) renderCats.push({name:'Other', total:others});
    
    renderCats.forEach((c, idx) => {
      let portion = (c.total / totalExp) * 360;
      if (portion === 360) portion = 359.9; // SVG arc bug fix
      
      const rad1 = angle * (Math.PI / 180);
      const rad2 = (angle + portion) * (Math.PI / 180);
      
      const x1 = Math.cos(rad1) * 80; const y1 = Math.sin(rad1) * 80;
      const x2 = Math.cos(rad2) * 80; const y2 = Math.sin(rad2) * 80;
      
      const largeArc = portion > 180 ? 1 : 0;
      const path = `M ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2}`;
      
      svg += `<path d="${path}" fill="none" stroke="${colors[idx%colors.length]}" stroke-width="24" />`;
      angle += portion;
    });
    
    svg += `<text x="0" y="5" text-anchor="middle" font-family="var(--font-mono)" font-size="20" fill="var(--text-main)">${cur}${totalExp.toLocaleString('en-IN')}</text>`;
    svg += '</svg>';
    return svg;
  },
  
  drawSparkline(data) {
    if(data.every(d=>d===0)) return '<span class="muted">No spend yet</span>';
    const max = Math.max(...data) * 1.1 || 100;
    const w = 240, h = 80;
    const step = w / 6;
    
    let path = `M 0 ${h - (data[0]/max)*h}`;
    data.forEach((d, i) => {
      if(i>0) path += ` L ${i*step} ${h - (d/max)*h}`;
    });
    
    // Fill path
    const fillPath = `${path} L ${w} ${h} L 0 ${h} Z`;
    
    return `
      <svg viewBox="0 0 240 80" preserveAspectRatio="none" style="width:100%; height:100%; overflow:visible;">
        <path d="${fillPath}" fill="rgba(245, 166, 35, 0.1)" stroke="none" />
        <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;
  },
  
  createTxRowHTML(t) {
    const isInc = t.type === 'Income';
    const dStr = t.date.split('-').reverse().slice(0,2).join(' '); // DD MM
    const emj = AppStore.getCategoryEmoji(t.category);
    const amtColor = isInc ? 'sage' : 'text-main';
    const prefix = isInc ? '+' : '-';
    
    const srcMap = { 'splitwise': 'SW', 'csv': 'CSV', 'sms': 'SMS' };
    const srcPill = t.source && t.source !== 'manual' ? `<span class="tx-source">${srcMap[t.source] || t.source}</span>` : '';
    
    const isSwMatch = t.source === 'splitwise';
    
    return `
      <li class="tx-row ${isSwMatch?'splitwise-tx':''}" data-id="${t.id}" onclick="UI.openTxSheet(AppStore.state.transactions.find(tx=>tx.id==='${t.id}'))">
        <div class="tx-date">${dStr}</div>
        <div class="tx-cat">${emj}</div>
        <div class="tx-note">${t.note || t.category} ${srcPill}</div>
        <div class="tx-amt ${amtColor}">${prefix}${AppStore.state.settings.currency}${parseFloat(t.amount).toLocaleString('en-IN')}</div>
      </li>
    `;
  }
};
