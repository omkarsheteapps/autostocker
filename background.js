chrome.runtime.onInstalled.addListener(() => {
    console.log('Stock Watchlist Automator installed!');
  });
  
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'fetchHotStocks') {
      const category = request.category || 'TOP_LOSERS';
      const url = `https://groww.in/v1/api/stocks_data/explore/v2/indices/GIDXNIFTY100/market_trends?discovery_filter_types=${category}&size=5`;
  
      fetch(url)
        .then(res => res.json())
        .then(data => {
          const items = data?.categoryResponseMap?.[category]?.items || [];
          sendResponse({ success: true, items });
        })
        .catch(err => {
          console.error('Fetch error:', err);
          sendResponse({ success: false, error: err.message });
        });
  
      return true;
    }
  });
  
  