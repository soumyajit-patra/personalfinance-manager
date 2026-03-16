const Parser = {
  guessCategory(description) {
    const desc = description.toLowerCase();
    for (const [catName, keywords] of Object.entries(CATEGORY_MAP)) {
      if (keywords.some(kw => desc.includes(kw))) {
        return catName;
      }
    }
    return 'Other';
  },

  parseSMS(text) {
    const res = { date: new Date().toISOString().split('T')[0], amount: 0, type: 'Expense', note: 'SMS Extract', source: 'sms' };
    
    // Pattern arrays
    const amountPatterns = [
      /INR\s?([\d,]+\.?\d*)/i,
      /Rs\.?\s?([\d,]+\.?\d*)/i,
      /₹\s?([\d,]+\.?\d*)/,
      /(?:debited|credited)[^\d]+([\d,]+\.?\d*)/i
    ];
    
    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        res.amount = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }

    if (text.toLowerCase().includes('credited') || text.toLowerCase().includes('received')) {
      if (!text.toLowerCase().includes('debited')) {
        res.type = 'Income';
      }
    }

    // Attempt to extract merchant
    const merchantMatch = text.match(/at\s+([A-Za-z0-9\s]+)|to\s+([A-Za-z0-9\s]+)|UPI\/[a-zA-Z0-9]+\/([A-Za-z0-9\s]+)/i);
    if (merchantMatch) {
      const m = merchantMatch[1] || merchantMatch[2] || merchantMatch[3];
      if (m) res.note = m.trim().substring(0, 30);
    }

    // Try finding date DD-MMM
    const dateMatch = text.match(/(\d{1,2})[-/]([A-Za-z]{3}|\d{1,2})[-/]?(\d{2,4})?/);
    if (dateMatch) {
      const d = parseInt(dateMatch[1]);
      let m = dateMatch[2];
      const y = dateMatch[3] ? (dateMatch[3].length === 2 ? 2000 + parseInt(dateMatch[3]) : parseInt(dateMatch[3])) : new Date().getFullYear();
      
      const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      if (!isNaN(m)) {
        m = parseInt(m) - 1;
      } else {
        m = months.indexOf(m.toLowerCase());
      }
      
      if (m >= 0 && m <= 11) {
        let dateObj = new Date(y, m, d);
        // Correct timezone offset
        dateObj.setMinutes(dateObj.getMinutes() - dateObj.getTimezoneOffset());
        res.date = dateObj.toISOString().split('T')[0];
      }
    }

    if (text.toLowerCase().includes('yesterday')) {
      let d = new Date(); d.setDate(d.getDate() - 1);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      res.date = d.toISOString().split('T')[0];
    }

    res.category = this.guessCategory(res.note);
    return res;
  },

  parseCSVBase(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, {type: 'array'});
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, {raw: false});
      callback(json);
    };
    reader.readAsArrayBuffer(file);
  },

  // Auto detect columns like "debit", "credit", "amount", "date", "narration", "description"
  guessCSVMapping(headers) {
    const map = { date: '', description: '', amount: '', type: '', debit: '', credit: '' };
    
    headers.forEach(h => {
      const hl = h.toLowerCase();
      if (hl.includes('date')) map.date = h;
      else if (hl.includes('desc') || hl.includes('narr') || hl.includes('particular')) map.description = h;
      else if (hl === 'amount' || hl.includes('amt')) map.amount = h;
      else if (hl.includes('debit') || hl === 'dr') map.debit = h;
      else if (hl.includes('credit') || hl === 'cr') map.credit = h;
      else if (hl === 'type') map.type = h;
    });
    
    return map;
  }
};
