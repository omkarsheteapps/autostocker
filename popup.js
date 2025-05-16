// ======= Utility: Disable/Enable Buttons During Operations =======
function setButtonsDisabled(disabled) {
  const targetIds = ['fetchTopLosers', 'fetchTopGainers'];
  targetIds.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = disabled;
      btn.style.opacity = disabled ? '0.6' : '1';
      btn.style.pointerEvents = disabled ? 'none' : 'auto';
    }
  });
}

// ======= DOM References =======
const tabs = {
  watchlist: document.getElementById('watchlistTab'),
  risk: document.getElementById('riskTab'),
  hot: document.getElementById('hotTab'),
};

const sections = {
  watchlist: document.getElementById('watchlistSection'),
  risk: document.getElementById('riskSection'),
  hot: document.getElementById('hotSection'),
};

// ======= Tab Switching =======
function switchTab(activeTab) {
  Object.keys(sections).forEach(key => {
    sections[key].style.display = key === activeTab ? 'block' : 'none';
    tabs[key].classList.toggle('active', key === activeTab);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  switchTab('watchlist');
});

tabs.watchlist.addEventListener('click', () => switchTab('watchlist'));
tabs.risk.addEventListener('click', () => switchTab('risk'));
tabs.hot.addEventListener('click', () => switchTab('hot'));

// ======= Fetch and Inject Stocks =======
function fetchAndInjectHotStocks(category = 'TOP_LOSERS') {
  setButtonsDisabled(true);

  chrome.runtime.sendMessage({ type: 'fetchHotStocks', category }, (response) => {
    if (!response || !response.success || !Array.isArray(response.items)) {
      alert('Failed to fetch stocks.');
      setButtonsDisabled(false);
      return;
    }

    const stockSymbols = response.items
      .map(item => item.company?.nseScriptCode?.trim())
      .filter(Boolean)
      .map(symbol => `NSE:${symbol}`);

    if (stockSymbols.length === 0) {
      alert('No valid stock symbols found.');
      setButtonsDisabled(false);
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        alert('No active tab found.');
        setButtonsDisabled(false);
        return;
      }

      const tabId = tabs[0].id;

      chrome.scripting.executeScript({
        target: { tabId },
        func: injectSymbols,
        args: [stockSymbols],
      }, () => {
        setTimeout(() => setButtonsDisabled(false), stockSymbols.length * 1100);
      });
    });
  });
}

// ======= Inject Logic Inside Target Page =======
function injectSymbols(symbols) {
  const hostname = window.location.hostname;
  let formatted = hostname.includes('angelone')
    ? symbols.map(s => s.replace(/^NSE:/, ''))
    : hostname.includes('kite')
      ? symbols
      : [];

  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearInterval(interval);
          resolve(el);
        } else if (Date.now() - start > timeout) {
          clearInterval(interval);
          reject(new Error(`Timeout waiting for: ${selector}`));
        }
      }, 100);
    });
  }

  async function addStock(symbol) {
    try {
      const placeholder = hostname.includes('angelone')
        ? 'Search'
        : 'Search eg: infy bse, nifty fut, index fund, etc';

      const input = document.querySelector(`input[placeholder="${placeholder}"]`);
      if (!input) throw new Error('Search input not found.');

      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 300));

      input.value = symbol;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 1500));

      if (hostname.includes('kite')) {
        const result = document.querySelector('li.results-item.selected');
        if (!result) throw new Error('Zerodha: No search result found.');
        result.click();
        console.log(`✅ Zerodha added: ${symbol}`);
      } else if (hostname.includes('angelone')) {
        const normalized = symbol.replace(/^NSE:/, '').toLowerCase();
        await new Promise(r => setTimeout(r, 100));
        const allRows = [...document.querySelectorAll('[data-track]')];

        const matchedRow = allRows.find(row =>
          row.textContent?.toLowerCase().includes(normalized)
        );

        if (!matchedRow) throw new Error('AngelOne: Matching row not found.');

        const starBtn = matchedRow.querySelector('button span[class*="icon-add-to-watchlist"]')?.closest('button');
        if (!starBtn) throw new Error('AngelOne: Star icon/button not found.');

        starBtn.click();
        console.log(`✅ AngelOne added: ${symbol}`);
        await new Promise(r => setTimeout(r, 100));
      }
    } catch (err) {
      console.error(`❌ Failed to add ${symbol}:`, err.message);
    }
  }

  (async () => {
    for (const symbol of formatted) await addStock(symbol);
  })();
}

// ======= Manual Paste Entry for Watchlist =======
document.getElementById('addStocksButton').addEventListener('click', () => {
  const stockSymbols = document.getElementById('stockSymbols').value
    .split(',')
    .map(symbol => symbol.trim())
    .filter(symbol => symbol.startsWith('NSE:'));

  if (stockSymbols.length === 0) {
    alert('Please enter at least one valid stock symbol with "NSE:".');
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      alert('No active tab found.');
      return;
    }

    const tabId = tabs[0].id;
    chrome.scripting.executeScript({
      target: { tabId },
      func: injectSymbols,
      args: [stockSymbols],
    });
  });
});

document.getElementById('calculateRisk').addEventListener('click', () => {
  const capital = parseFloat(document.getElementById('capital').value);
  const riskPercent = parseFloat(document.getElementById('riskPercent').value);
  const stopLoss = parseFloat(document.getElementById('stopLoss').value);

  const resultField = document.getElementById('riskResult');

  if (isNaN(capital) || isNaN(riskPercent) || isNaN(stopLoss) || capital <= 0 || riskPercent <= 0 || stopLoss <= 0) {
    resultField.textContent = 'Please enter valid positive numbers.';
    resultField.style.color = '#dc2626'; // Tailwind red-600
    return;
  }

  const riskAmount = (riskPercent / 100) * capital;
  const quantity = Math.floor(riskAmount / stopLoss);

  resultField.textContent = `Position Size: ${quantity} shares`;
  resultField.style.color = '#16a34a'; // Tailwind green-600
});

// ======= Trigger Buttons for Top Gainers & Losers =======
document.getElementById('fetchTopLosers').addEventListener('click', () => fetchAndInjectHotStocks('TOP_LOSERS'));
document.getElementById('fetchTopGainers').addEventListener('click', () => fetchAndInjectHotStocks('TOP_GAINERS'));
