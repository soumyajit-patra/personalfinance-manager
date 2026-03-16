const Reports = {
  getMonthStats(year, month) {
    const tx = AppStore.getTransactionsByMonth(year, month);
    let inc = 0, exp = 0;
    
    const categories = {};
    
    tx.forEach(t => {
      const amt = parseFloat(t.amount);
      if (t.type === 'Income') inc += amt;
      else {
        exp += amt;
        categories[t.category] = (categories[t.category] || { total: 0, count: 0 });
        categories[t.category].total += amt;
        categories[t.category].count++;
      }
    });
    
    // Array format for easy sorting
    const catArray = Object.keys(categories).map(k => ({
      name: k,
      total: categories[k].total,
      count: categories[k].count,
      percent: exp > 0 ? (categories[k].total / exp) * 100 : 0
    })).sort((a, b) => b.total - a.total);
    
    return { inc, exp, net: inc - exp, rate: inc > 0 ? ((inc - exp)/inc)*100 : 0, categories: catArray };
  },

  getWeeklyData(year, month) {
    const tx = AppStore.getTransactionsByMonth(year, month);
    // Split into 4 rough weeks
    const weeks = [ {inc:0, exp:0}, {inc:0, exp:0}, {inc:0, exp:0}, {inc:0, exp:0} ];
    
    tx.forEach(t => {
      const d = parseInt(t.date.split('-')[2]);
      let wIdx = Math.floor((d - 1) / 7);
      if (wIdx > 3) wIdx = 3; // Dump 29,30,31 into week 4
      
      const amt = parseFloat(t.amount);
      if (t.type === 'Income') weeks[wIdx].inc += amt;
      else weeks[wIdx].exp += amt;
    });
    return weeks;
  },
  
  generateInsights(year, month) {
    const current = this.getMonthStats(year, month);
    // previous month
    let prevM = month - 1; let prevY = year;
    if (prevM < 0) { prevM = 11; prevY--; }
    const prev = this.getMonthStats(prevY, prevM);
    
    const insights = [];
    
    if (current.categories.length > 0) {
      const topCat = current.categories[0];
      insights.push(`Your top category this month: ${topCat.name} (₹${topCat.total.toLocaleString('en-IN')} — ${Math.round(topCat.percent)}% of expenses).`);
    }
    
    const allExps = AppStore.getTransactionsByMonth(year, month).filter(t=>t.type==='Expense');
    if (allExps.length > 0) {
      const maxExp = allExps.reduce((max, cur) => parseFloat(cur.amount) > parseFloat(max.amount) ? cur : max);
      let dateCmp = maxExp.date.split('-').reverse();
      insights.push(`Highest single expense: ₹${parseFloat(maxExp.amount).toLocaleString('en-IN')} on ${maxExp.note || maxExp.category} on ${dateCmp[0]}/${dateCmp[1]}.`);
    }
    
    const uniqueDays = new Set(allExps.map(t=>t.date)).size;
    insights.push(`You logged transactions on ${uniqueDays} days this month.`);
    
    let unmatched = AppStore.state.splitwise.expenses.filter(e => !e.settled && !e.matchedTransactionId).length;
    let untrackedAmt = AppStore.state.splitwise.expenses.filter(e => !e.settled && !e.matchedTransactionId).reduce((s,e)=>s+parseFloat(e.yourShare), 0);
    if (unmatched > 0) {
      insights.push(`${unmatched} Splitwise expenses are still unmatched — ₹${untrackedAmt.toLocaleString('en-IN')} potentially untracked.`);
    }
    
    if (prev.exp > 0 && current.exp > 0) {
      if (current.rate > prev.rate) {
        insights.push(`Your savings rate improved by ${Math.round(current.rate - prev.rate)}% vs last month.`);
      }
    }
    
    return insights;
  },
  
  generateExportText(year, month) {
    const stats = this.getMonthStats(year, month);
    let out = `PERSONAL FINANCE TRACKER REPORT\n${year}-${(month+1).toString().padStart(2,'0')}\n`;
    out += `=================================\n\n`;
    out += `Total Income: ₹${stats.inc.toLocaleString('en-IN')}\n`;
    out += `Total Expenses: ₹${stats.exp.toLocaleString('en-IN')}\n`;
    out += `Net Savings: ₹${stats.net.toLocaleString('en-IN')}\n`;
    out += `Savings Rate: ${stats.rate.toFixed(1)}%\n\n`;
    out += `CATEGORY BREAKDOWN:\n`;
    stats.categories.forEach(c => {
      out += `- ${c.name}: ₹${c.total.toLocaleString('en-IN')} (${c.count} txns, ${Math.round(c.percent)}%)\n`;
    });
    
    return out;
  }
};
