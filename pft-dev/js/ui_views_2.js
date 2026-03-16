Object.assign(UI, {
  renderReportsView() {
    // Current bound year/month
    const label = document.getElementById('rep-current-month').innerText;
    let [mName, yStr] = label.split(' ');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let mIdx = months.indexOf(mName);
    let yIdx = parseInt(yStr);
    
    if (mIdx === -1) {
      const today = new Date();
      mIdx = today.getMonth();
      yIdx = today.getFullYear();
    }
    
    const currentM = mIdx;
    
    // Bind triggers if not already
    document.getElementById('rep-prev-month').onclick = () => {
       let nm = mIdx - 1; let ny = yIdx;
       if(nm < 0) { nm = 11; ny--; }
       document.getElementById('rep-current-month').innerText = `${months[nm]} ${ny}`;
       this.renderReportsView();
    };
    document.getElementById('rep-next-month').onclick = () => {
       let nm = mIdx + 1; let ny = yIdx;
       if(nm > 11) { nm = 0; ny++; }
       document.getElementById('rep-current-month').innerText = `${months[nm]} ${ny}`;
       this.renderReportsView();
    };
    
    // We render for mIdx, yIdx
    const stats = Reports.getMonthStats(yIdx, mIdx);
    const cur = AppStore.state.settings.currency;
    
    document.getElementById('rep-income').innerText = `${cur}${stats.inc.toLocaleString('en-IN')}`;
    document.getElementById('rep-expenses').innerText = `${cur}${stats.exp.toLocaleString('en-IN')}`;
    document.getElementById('rep-net').innerText = `${cur}${stats.net.toLocaleString('en-IN')}`;
    document.getElementById('rep-rate').innerText = `${stats.rate.toFixed(1)}%`;
    
    // Bar Chart
    const weeks = Reports.getWeeklyData(yIdx, mIdx);
    document.getElementById('rep-bar-chart').innerHTML = this.drawGroupedBarChart(weeks, cur);
    
    // MoM
    let pm = mIdx - 1; let py = yIdx; if(pm < 0){ pm=11; py--; }
    const pStats = Reports.getMonthStats(py, pm);
    const momExp = stats.exp - pStats.exp;
    const momText = momExp >= 0 ? `↑ ${cur}${momExp.toLocaleString('en-IN')} more` : `↓ ${cur}${Math.abs(momExp).toLocaleString('en-IN')} less`;
    document.getElementById('rep-mom-stats').innerHTML = `
      <div style="font-family:var(--font-mono); font-size:24px; color:${momExp>0?'var(--danger)':'var(--success)'}">${momText}</div>
    `;
    document.getElementById('rep-mom-insight').innerText = "vs previous month in total expenses.";
    
    // Table
    const tbody = document.querySelector('#rep-cat-table tbody');
    tbody.innerHTML = stats.categories.map(c => {
       const budget = AppStore.state.budgets[c.name] ? AppStore.state.budgets[c.name].limit : null;
       const bStr = budget ? `${cur}${budget}` : '--';
       return `
         <tr>
           <td>${AppStore.getCategoryEmoji(c.name)} ${c.name}</td>
           <td>${c.count}</td>
           <td>${cur}${c.total.toLocaleString('en-IN')}</td>
           <td>${Math.round(c.percent)}%</td>
           <td>${bStr}</td>
         </tr>
       `;
    }).join('');
    
    // AI Insights
    const ins = Reports.generateInsights(yIdx, mIdx);
    const ilist = document.getElementById('rep-insights-list');
    if (ins.length > 0) {
      ilist.innerHTML = ins.map(i => `<li style="margin-bottom:12px; padding-left:16px; border-left:2px solid var(--accent)">${i}</li>`).join('');
    } else {
      ilist.innerHTML = '<li class="muted">Not enough data to generate insights for this month.</li>';
    }
    
    // Export Export Hook
    document.getElementById('btn-export-report').onclick = () => {
      const text = Reports.generateExportText(yIdx, mIdx);
      const blob = new Blob([text], {type: "text/plain"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PFT-Report-${months[mIdx]}-${yIdx}.txt`;
      document.body.appendChild(a); a.click(); a.remove();
    };
  },
  
  drawGroupedBarChart(weeks, cur) {
    if(weeks.every(w=>w.exp===0 && w.inc===0)) return '<span class="muted">No data</span>';
    
    let max = 0;
    weeks.forEach(w => max = Math.max(max, w.inc, w.exp));
    max = max * 1.1 || 100;
    
    let svg = `<svg viewBox="0 0 400 150" style="width:100%; height:100%;" preserveAspectRatio="none">`;
    const gap = 10;
    const wWidth = (400 - (gap*3)) / 4; 
    const bW = (wWidth / 2) - 4;
    
    weeks.forEach((w, i) => {
       const xBase = i * (wWidth + gap);
       const hInc = (w.inc / max) * 150;
       const hExp = (w.exp / max) * 150;
       
       // Income
       svg += `<rect x="${xBase}" y="${150 - hInc}" width="${bW}" height="${hInc}" fill="var(--success)" rx="2"/>`;
       // Expense
       svg += `<rect x="${xBase + bW + 4}" y="${150 - hExp}" width="${bW}" height="${hExp}" fill="var(--danger)" rx="2"/>`;
       
       // label base
       svg += `<text x="${xBase + (wWidth/2)}" y="145" text-anchor="middle" font-size="10" fill="var(--text-muted)">W${i+1}</text>`;
    });
    
    svg += `</svg>`;
    return svg;
  }
});
