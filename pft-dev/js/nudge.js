const Nudge = {
  checkGuilt() {
    const strip = document.getElementById('nudge-strip-container');
    if (!strip) return;
    
    // Check days since last entry
    const lastStr = AppStore.state.nudge.lastEntryDate;
    if (!lastStr) {
      this.renderStrip('neutral', 'Waiting for your first transaction.');
      return;
    }
    
    const dLast = new Date(lastStr); dLast.setHours(0,0,0,0);
    const dToday = new Date(); dToday.setHours(0,0,0,0);
    const diffDays = Math.floor((dToday - dLast) / 86400000);
    
    if (diffDays === 0) {
      this.renderStrip('sage', '✓ Logged today');
    } else if (diffDays === 1) {
      this.renderStrip('neutral', 'Last entry: yesterday');
      this.checkAndShowBanner(diffDays);
    } else if (diffDays === 2) {
      this.renderStrip('amber', 'Last entry: 2 days ago. What happened?');
      this.checkAndShowBanner(diffDays);
    } else if (diffDays === 3) {
      this.renderStrip('coral', '3 days without a log. Are we doing this or not?');
      this.checkAndShowBanner(diffDays);
    } else if (diffDays === 4) {
      this.renderStrip('coral', "4 days. Your budget doesn't care that you forgot.", true);
      this.checkAndShowBanner(diffDays);
    } else {
      this.renderStrip('coral', '5+ days. This app is pointless without data. You know that.', true);
      this.checkAndShowBanner(diffDays);
    }
  },

  renderStrip(type, text, isStrong = false) {
    const strip = document.getElementById('nudge-strip-container');
    const existingBanner = strip.querySelector('.streak-banner') ? strip.querySelector('.streak-banner').outerHTML : '';
    
    strip.innerHTML = `
      <div class="nudge-strip nudge-${type}" style="${isStrong ? 'font-weight:700;' : ''}">
        ${text}
      </div>
      ${existingBanner}
    `;
  },
  
  checkAndShowBanner(diffDays) {
    if (diffDays > 1 && !AppStore.state.nudge.streakBrokenBannerShown) {
      const strip = document.getElementById('nudge-strip-container');
      const banner = document.createElement('div');
      banner.className = 'streak-banner';
      banner.innerHTML = `
        <div>Your logging streak broke. ${diffDays} days — gone. Today is day 1 again.</div>
        <button class="primary-btn" onclick="UI.openTxSheet()">+ Add now</button>
      `;
      strip.appendChild(banner);
      AppStore.state.nudge.streakBrokenBannerShown = true;
      AppStore.save();
    }
  },

  async requestNotificationPermission() {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    
    // We request via UI button usually before calling this
    const p = await Notification.requestPermission();
    return p === "granted";
  },

  schedule() {
    if (!AppStore.state.nudge.notificationsEnabled) return;
    if (Notification.permission !== "granted") return;
    
    const timeStr = AppStore.state.settings.nudgeTime || '21:00';
    const [h, m] = timeStr.split(':').map(Number);
    
    const now = new Date();
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    
    if (now > target) {
      // time has passed today, check if sent
      const lastSent = AppStore.state.nudge.lastNotificationSent;
      const todayStr = now.toISOString().split('T')[0];
      
      if (lastSent !== todayStr) {
        // Did we log today?
        const loggedToday = AppStore.state.transactions.some(t => t.date === todayStr);
        if (!loggedToday) {
           this.fire();
           AppStore.state.nudge.lastNotificationSent = todayStr;
           AppStore.save();
        }
      }
    }
    
    // Check again later. Not perfect for background, but works for an active web session
    setTimeout(() => this.schedule(), 5 * 60 * 1000); // Check every 5 mins
  },

  fire() {
    const pool = [
      "Did you spend money today? Log it before you forget.",
      "Quick — what did you buy today? 30 seconds.",
      "Your future self will want this data. Log today's expenses.",
      "The streak doesn't maintain itself."
    ];
    let msg = pool[Math.floor(Math.random() * pool.length)];
    
    // Check days dark
    const lastStr = AppStore.state.nudge.lastEntryDate;
    if (lastStr) {
      const dLast = new Date(lastStr); dLast.setHours(0,0,0,0);
      const dToday = new Date(); dToday.setHours(0,0,0,0);
      const diffDays = Math.floor((dToday - dLast) / 86400000);
      if (diffDays >= 2) {
         msg = `You've been dark for ${diffDays} days. Your finances haven't been.`;
      }
    }
    
    if (Notification.permission === "granted") {
      new Notification("Tracker Nudge", {
        body: msg,
        icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📊</text></svg>"
      });
    }
    
    UI.toast("Nudge: " + msg);
  }
};
