document.getElementById('addStocksButton').addEventListener('click', async () => {
  const stockSymbols = document.getElementById('stockSymbols').value
    .split(',')
    .map((stock) => stock.trim())
    .filter((stock) => stock.startsWith('NSE:'));

  if (stockSymbols.length === 0) {
    alert('Please enter at least one valid stock symbol with "NSE:".');
    return;
  }

  // Save filtered stock symbols to Chrome's storage
  chrome.storage.local.set({ stockSymbols }, () => {
    // If needed
  });

  // Inject content script into the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      alert('No active tab found.');
      return;
    }

    const tabId = tabs[0].id;

    chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    });
  });
});
