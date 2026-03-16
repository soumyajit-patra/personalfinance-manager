const CATEGORY_MAP = {
  Food: ['zomato', 'swiggy', 'blinkit', 'zepto', 'bigbasket', 'dunzo', 'restaurant', 'cafe', 'dhaba', 'mess', 'canteen', 'grocer', 'grocery', 'kirana'],
  Shopping: ['amazon', 'flipkart', 'myntra', 'meesho', 'ajio', 'nykaa', 'mall', 'market', 'store', 'h&m', 'zara', 'decathlon'],
  Entertainment: ['netflix', 'hotstar', 'prime', 'disney', 'spotify', 'youtube', 'bookmyshow', 'pvr', 'inox', 'concert'],
  Transport: ['uber', 'ola', 'rapido', 'metro', 'irctc', 'train', 'bus', 'auto', 'petrol', 'fuel', 'parking', 'fastag', 'toll'],
  Health: ['hospital', 'clinic', 'pharmacy', 'apollo', 'medplus', '1mg', 'practo', 'doctor', 'medicine', 'lab', 'test'],
  Utilities: ['electricity', 'bescom', 'water', 'gas', 'broadband', 'jio', 'airtel', 'vi', 'tata sky', 'recharge', 'dth', 'wifi'],
  Housing: ['rent', 'maintenance', 'society', 'deposit', 'landlord'],
  Education: ['course', 'udemy', 'coursera', 'book', 'stationery', 'tuition', 'fees'],
  Income: ['salary', 'stipend', 'freelance', 'credited by', 'reversal', 'refund', 'cashback', 'interest'],
  Splitwise: ['splitwise', 'settlement', 'payment from', 'paid by']
};

const DEFAULT_HABITS = [
  { id: 'h1', name: 'Log every transaction', type: 'auto_daily', targetDays: 0, log: [] },
  { id: 'h2', name: 'Stay under budget', type: 'auto_daily', targetDays: 0, log: [] },
  { id: 'h3', name: 'No impulse purchases', type: 'manual_daily', targetDays: 0, log: [] },
  { id: 'h4', name: 'Weekly finance review', type: 'manual_weekly', targetDays: 0, log: [] }
];

const DEFAULT_CATEGORIES = [
  { id: 'c1', name: 'Food', emoji: '🍔' },
  { id: 'c2', name: 'Shopping', emoji: '🛍️' },
  { id: 'c3', name: 'Entertainment', emoji: '🍿' },
  { id: 'c4', name: 'Transport', emoji: '🚕' },
  { id: 'c5', name: 'Health', emoji: '💊' },
  { id: 'c6', name: 'Utilities', emoji: '⚡' },
  { id: 'c7', name: 'Housing', emoji: '🏠' },
  { id: 'c8', name: 'Education', emoji: '📚' },
  { id: 'c9', name: 'Other', emoji: '📦' },
  { id: 'c10', name: 'Splitwise Settlement', emoji: '🤝' },
  { id: 'c11', name: 'Income', emoji: '💰' }
];

const AppStore = {
  state: {
    transactions: [],
    budgets: {},
    habits: [...DEFAULT_HABITS],
    splitwise: {
      lastImport: null,
      groups: [],
      expenses: [],
      dismissedGhostIds: []
    },
    nudge: {
      lastEntryDate: null,
      notificationsEnabled: false,
      lastNotificationSent: null,
      streakBrokenBannerShown: false
    },
    settings: {
      currency: '₹',
      name: '',
      monthStart: 1,
      splitwiseName: '',
      nudgeTime: '21:00',
      categories: [...DEFAULT_CATEGORIES]
    }
  },

  load() {
    const raw = localStorage.getItem('pft_data');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.state = { ...this.state, ...parsed };
        
        // Ensure defaults apply if missing from old data
        if (!this.state.settings.categories || this.state.settings.categories.length === 0) {
          this.state.settings.categories = [...DEFAULT_CATEGORIES];
        }
        if (!this.state.splitwise.dismissedGhostIds) {
          this.state.splitwise.dismissedGhostIds = [];
        }
      } catch (e) {
        console.error('Failed to parse pft_data from localStorage', e);
      }
    } else {
      this.isFirstLoad = true;
    }
    
    // Sort transactions by date desc
    this.state.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  save() {
    this.state.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    localStorage.setItem('pft_data', JSON.stringify(this.state));
    
    // Trigger render updates
    window.dispatchEvent(new Event('pft_state_updated'));
  },

  wipe() {
    localStorage.removeItem('pft_data');
    location.reload();
  },

  export() {
    const dataStr = JSON.stringify(this.state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pft-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
  
  importBackup(jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed && typeof parsed === 'object') {
        this.state = { ...this.state, ...parsed };
        this.save();
        return true;
      }
    } catch(e) {
      console.error(e);
      return false;
    }
  },

  generateId() {
    return Date.now() + Math.random().toString(36).substring(2);
  },
  
  // Transaction helpers
  addTransaction(tx) {
    if (!tx.id) tx.id = this.generateId();
    this.state.transactions.push(tx);
    
    // Update nudge last entry
    this.state.nudge.lastEntryDate = new Date().toISOString().split('T')[0];
    this.state.nudge.streakBrokenBannerShown = false; // Reset banner on log
    
    this.save();
  },
  
  deleteTransaction(id) {
    this.state.transactions = this.state.transactions.filter(t => t.id !== id);
    this.save();
  },
  
  getTransactionsByMonth(year, month) {
    return this.state.transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  },

  getCategoryEmoji(catName) {
    const c = this.state.settings.categories.find(c => c.name === catName);
    return c ? c.emoji : '📦';
  }
};
