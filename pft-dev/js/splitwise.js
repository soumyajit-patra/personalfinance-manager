const Splitwise = {
  importCSV(file, onComplete) {
    const swName = AppStore.state.settings.splitwiseName;
    if (!swName) {
      UI.toast("Please set your Splitwise Name in Settings first.");
      return;
    }
    
    Parser.parseCSVBase(file, (data) => {
      let importedCount = 0;
      let newGuests = 0;
      
      data.forEach(row => {
        // Essential SW cols: Date, Description, Category, Cost, and member names
        const desc = row['Description'] || '';
        const rawCost = row['Cost'];
        const cost = parseFloat(rawCost) || 0;
        
        // Skip payments for the expense parsing (we can handle them as income/expense if needed)
        const isPayment = desc.toLowerCase().includes('payment');
        
        let yourNetShare = 0;
        // SW exports have a column matching the user's name
        // It's usually the net amount (+ means you owe/spent, string format might vary)
        if (row[swName] !== undefined) {
           yourNetShare = parseFloat(row[swName]);
        }
        
        // In SW CSV: if cost > 0, and you are the one who paid, usually there's a column for "Net Balance" but standard SW CSV puts members as columns
        // Let's assume the user's column is their net change.
        // If yourNetShare < 0, it means you spent money. We want absolute value of what you owe for the expense.
        let actualShare = isPayment ? yourNetShare : Math.abs(yourNetShare);
        
        if (!isPayment && cost > 0 && actualShare > 0) {
          // Check if already imported
          const dateStr = new Date(row['Date']).toISOString().split('T')[0];
          const exists = AppStore.state.splitwise.expenses.find(e => e.date === dateStr && e.description === desc && e.totalAmount === cost);
          
          if (!exists) {
            AppStore.state.splitwise.expenses.push({
              id: AppStore.generateId(),
              date: dateStr,
              description: desc,
              category: Parser.guessCategory(desc),
              totalAmount: cost,
              yourShare: actualShare,
              paidByYou: false, // Simplification: we just care about your share
              settled: false,
              matchedTransactionId: null
            });
            newGuests++;
          }
        } else if (isPayment) {
          // It's a settlement. Auto-add to transactions
          const dateStr = new Date(row['Date']).toISOString().split('T')[0];
          // Determine if income or expense based on net share
          const amt = Math.abs(yourNetShare);
          if (amt > 0) {
             const type = yourNetShare > 0 ? 'Income' : 'Expense'; // positive means received payment
             const existsTx = AppStore.state.transactions.find(t => t.date === dateStr && t.amount === amt && t.category === 'Splitwise Settlement');
             if (!existsTx) {
               AppStore.addTransaction({
                 date: dateStr,
                 amount: amt,
                 type: type,
                 category: 'Splitwise Settlement',
                 note: desc,
                 source: 'splitwise',
                 isSettlement: true
               });
             }
          }
        }
      });
      
      AppStore.state.splitwise.lastImport = new Date().toISOString().split('T')[0];
      AppStore.save();
      this.runReconciliation();
      
      onComplete(newGuests);
    });
  },

  runReconciliation() {
    // Try to auto-match Splitwise expenses with unmatched transactions
    const expenses = AppStore.state.splitwise.expenses.filter(e => !e.settled && !e.matchedTransactionId && !AppStore.state.splitwise.dismissedGhostIds.includes(e.id));
    
    // Look at all expenses
    expenses.forEach(ghost => {
       // Search transactions: same date (±2 days), amount within 10%, similar keywords
       const ghostDate = new Date(ghost.date);
       const ghostAmt = parseFloat(ghost.yourShare);
       const targetMin = ghostAmt * 0.9;
       const targetMax = ghostAmt * 1.1;
       
       const match = AppStore.state.transactions.find(tx => {
          if (tx.source === 'splitwise' || tx.type === 'Income') return false;
          // Check if this tx is already matched to another ghost
          const alreadyMatched = AppStore.state.splitwise.expenses.some(e => e.matchedTransactionId === tx.id);
          if (alreadyMatched) return false;
          
          const txDate = new Date(tx.date);
          const diffDays = Math.abs((txDate - ghostDate) / (1000 * 60 * 60 * 24));
          if (diffDays <= 2) {
             const txAmt = parseFloat(tx.amount);
             if (txAmt >= targetMin && txAmt <= targetMax) {
                return true;
             }
          }
          return false;
       });
       
       if (match) {
         ghost.matchedTransactionId = match.id;
         match.source = 'splitwise';
       }
    });
    
    AppStore.save();
  },

  dismissGhost(ghostId) {
    if (!AppStore.state.splitwise.dismissedGhostIds.includes(ghostId)) {
      AppStore.state.splitwise.dismissedGhostIds.push(ghostId);
      AppStore.save();
    }
  },

  linkGhost(ghostId, txId) {
    const ghost = AppStore.state.splitwise.expenses.find(e => e.id === ghostId);
    const tx = AppStore.state.transactions.find(t => t.id === txId);
    if (ghost && tx) {
      ghost.matchedTransactionId = tx.id;
      tx.source = 'splitwise';
      AppStore.save();
    }
  },
  
  createTxFromGhost(ghostId) {
    const ghost = AppStore.state.splitwise.expenses.find(e => e.id === ghostId);
    if (!ghost) return;
    const newTxId = AppStore.generateId();
    
    ghost.matchedTransactionId = newTxId;
    
    AppStore.state.transactions.push({
       id: newTxId,
       date: ghost.date,
       amount: ghost.yourShare,
       type: 'Expense',
       category: ghost.category || 'Other',
       note: `[SW] ${String(ghost.description || '').substring(0,25)}`,
       source: 'splitwise'
    });
    
    AppStore.state.nudge.lastEntryDate = new Date().toISOString().split('T')[0];
    AppStore.state.nudge.streakBrokenBannerShown = false;
    
    AppStore.save();
  }
};
