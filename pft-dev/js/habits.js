const Habits = {
  checkAutoHabits() {
    const todayStr = new Date().toISOString().split('T')[0];
    let yesterdayD = new Date(); yesterdayD.setDate(yesterdayD.getDate() - 1);
    const yesterdayStr = yesterdayD.toISOString().split('T')[0];

    AppStore.state.habits.forEach(habit => {
      if (habit.type === 'auto_daily' && habit.id === 'h1') {
        const loggedToday = AppStore.state.transactions.some(t => t.date === todayStr);
        if (loggedToday && !habit.log.includes(todayStr)) {
          habit.log.push(todayStr);
        }
      }
      
      if (habit.type === 'auto_daily' && habit.id === 'h2') {
        // Stay under budget habit
        const bCats = Object.keys(AppStore.state.budgets);
        let allUnder = true;
        bCats.forEach(cat => {
          const stats = Budget.getBudgetStats(cat);
          if (stats && stats.percent > 100) allUnder = false;
        });
        if (allUnder && bCats.length > 0 && !habit.log.includes(todayStr)) {
          habit.log.push(todayStr);
        }
      }
    });
    
    AppStore.save();
  },

  getStreak(habitId) {
    const habit = AppStore.state.habits.find(h => h.id === habitId);
    if (!habit || habit.log.length === 0) return 0;
    
    let streak = 0;
    const isWeekly = habit.type.includes('weekly');
    
    // Simplistic streak calc: start from today or yesterday, work backwards
    let currRun = new Date();
    // Neutralize time
    currRun.setHours(0,0,0,0);
    
    // Map log strings to timestamps
    const logTimes = habit.log.map(ds => {
      let d = new Date(ds); d.setHours(0,0,0,0); return d.getTime();
    }).sort((a,b)=>b-a);
    
    // Check if logged today
    let expectMs = currRun.getTime();
    if (logTimes.includes(expectMs)) {
      streak = 1;
      expectMs -= 86400000;
      for (let i = 1; i < 1000; i++) {
        if (logTimes.includes(expectMs)) {
          streak++;
          expectMs -= 86400000;
        } else break;
      }
    } else {
      // not logged today, check yesterday
      expectMs -= 86400000;
      if (logTimes.includes(expectMs)) {
        streak = 1;
        expectMs -= 86400000;
        for (let i = 1; i < 1000; i++) {
          if (logTimes.includes(expectMs)) {
            streak++;
            expectMs -= 86400000;
          } else break;
        }
      }
    }
    
    return streak;
  },

  getHeatmap(habitId) {
    const habit = AppStore.state.habits.find(h => h.id === habitId);
    if (!habit) return [];
    
    const map = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      let d = new Date(today); d.setDate(today.getDate() - i);
      let ds = d.toISOString().split('T')[0];
      map.push({ date: ds, active: habit.log.includes(ds), isToday: i === 0 });
    }
    return map;
  },

  getMotivationLine(streak) {
    if (streak === 0) return "Start today. That's all.";
    if (streak <= 3) return "A start is a start.";
    if (streak <= 7) return "Something's forming here.";
    if (streak <= 14) return "Now it's a pattern.";
    if (streak <= 30) return "This is becoming who you are.";
    return "You're not trying anymore. You just do this.";
  },
  
  toggleManualHabit(habitId, dateStr) {
    const habit = AppStore.state.habits.find(h => h.id === habitId);
    if (!habit) return;
    
    const idx = habit.log.indexOf(dateStr);
    if (idx >= 0) habit.log.splice(idx, 1);
    else habit.log.push(dateStr);
    
    AppStore.save();
  }
};
