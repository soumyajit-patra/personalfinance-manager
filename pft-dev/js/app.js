const App = {
  init() {
    AppStore.load();
    UI.init();
    
    // Ensure all event listeners binding to UI state changes rerender
    window.addEventListener('pft_state_updated', () => {
      UI.render();
    });
    
    // First load Onboarding
    if (AppStore.isFirstLoad) {
      this.startOnboarding();
    } else {
      UI.render();
      Nudge.schedule();
    }
  },

  startOnboarding() {
    const obOverlay = document.getElementById('onboarding-overlay');
    obOverlay.classList.remove('hidden');
    
    const s1 = document.getElementById('ob-step-1');
    const s2 = document.getElementById('ob-step-2');
    const s3 = document.getElementById('ob-step-3');
    
    // Setup cat select for step 2
    const obCat = document.getElementById('ob-budget-cat');
    obCat.innerHTML = AppStore.state.settings.categories.map(c => `<option value="${c.name}">${c.emoji} ${c.name}</option>`).join('');
    
    document.getElementById('btn-ob-1').addEventListener('click', () => {
       const n = document.getElementById('ob-name').value.trim();
       if (n) AppStore.state.settings.name = n;
       AppStore.save();
       s1.classList.add('hidden');
       s2.classList.remove('hidden');
    });
    
    const proceedToStep3 = () => {
       s2.classList.add('hidden');
       s3.classList.remove('hidden');
    };
    
    document.getElementById('btn-ob-2').addEventListener('click', () => {
       const lim = parseFloat(document.getElementById('ob-budget-limit').value);
       if (lim > 0) {
         const cat = obCat.value;
         AppStore.state.budgets[cat] = { limit: lim, period: 'Monthly' };
         AppStore.save();
       }
       proceedToStep3();
    });
    document.getElementById('btn-ob-skip-2').addEventListener('click', proceedToStep3);
    
    document.getElementById('btn-ob-add-manually').addEventListener('click', () => {
       obOverlay.classList.add('hidden');
       AppStore.isFirstLoad = false;
       AppStore.save();
       UI.render();
       UI.openTxSheet();
       Nudge.requestNotificationPermission().then(granted => {
          if(granted) { AppStore.state.nudge.notificationsEnabled = true; AppStore.save(); Nudge.schedule(); }
       });
    });
    
    document.getElementById('btn-ob-import').addEventListener('click', () => {
       obOverlay.classList.add('hidden');
       AppStore.isFirstLoad = false;
       AppStore.save();
       UI.switchView('import');
       Nudge.requestNotificationPermission().then(granted => {
          if(granted) { AppStore.state.nudge.notificationsEnabled = true; AppStore.save(); Nudge.schedule(); }
       });
    });
  }
};

// Start the app on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
