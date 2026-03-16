const Budget = {
  calculateHealth() {
    const bCats = Object.keys(AppStore.state.budgets);
    if (bCats.length === 0) return null;

    let totalWeight = 0;
    let totalScoreWeighted = 0;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const allTx = AppStore.getTransactionsByMonth(currentYear, currentMonth);

    // If splitwise toggle is ON or we want to include ghosts, we handle it here.
    // For now we get that from the UI toggle state.
    const includeGhosts = document.getElementById('sw-overlay-toggle') ? document.getElementById('sw-overlay-toggle').checked : false;

    for (const cat of bCats) {
      const budget = AppStore.state.budgets[cat];
      const limit = budget.limit;
      let spent = 0;

      // Actual transactions
      allTx.forEach(t => {
        if (t.type === 'Expense' && t.category === cat) {
          spent += parseFloat(t.amount);
        }
      });

      // Ghost transactions
      if (includeGhosts) {
        AppStore.state.splitwise.expenses.forEach(e => {
          if (!e.settled && !e.matchedTransactionId && e.category === cat && !AppStore.state.splitwise.dismissedGhostIds.includes(e.id)) {
            spent += parseFloat(e.yourShare);
          }
        });
      }

      let ratio = limit > 0 ? spent / limit : 1;
      if (ratio > 1) ratio = 1;
      
      const score = 1 - ratio; // 1 = perfect, 0 = overbudget
      
      totalWeight += limit;
      totalScoreWeighted += (score * limit);
    }

    if (totalWeight === 0) return 100;
    return Math.round((totalScoreWeighted / totalWeight) * 100);
  },

  getHealthCommentary(score) {
    if (score === null) return "Set up budgets to see health";
    if (score >= 90) return "Ironclad";
    if (score >= 70) return "Solid";
    if (score >= 50) return "Wobbly";
    if (score >= 30) return "Concerning";
    return "On fire";
  },

  getBudgetStats(category, includeGhosts = false) {
    const budget = AppStore.state.budgets[category];
    if (!budget) return null;

    const today = new Date();
    let spent = 0;

    let filterTx = [];
    if (budget.period === 'Weekly') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      filterTx = AppStore.state.transactions.filter(t => new Date(t.date) >= startOfWeek);
    } else {
      filterTx = AppStore.getTransactionsByMonth(today.getFullYear(), today.getMonth());
    }

    filterTx.forEach(t => {
      if (t.type === 'Expense' && t.category === category) {
        spent += parseFloat(t.amount);
      }
    });

    if (includeGhosts) {
      AppStore.state.splitwise.expenses.forEach(e => {
        if (!e.settled && !e.matchedTransactionId && e.category === category && !AppStore.state.splitwise.dismissedGhostIds.includes(e.id)) {
          let ed = new Date(e.date);
          if (budget.period === 'Monthly' && ed.getMonth() === today.getMonth() && ed.getFullYear() === today.getFullYear()) {
            spent += parseFloat(e.yourShare);
          } else if (budget.period === 'Weekly') {
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            if (ed >= startOfWeek) spent += parseFloat(e.yourShare);
          }
        }
      });
    }

    return { limit: budget.limit, spent, remaining: budget.limit - spent, percent: (spent / budget.limit) * 100 };
  }
};
