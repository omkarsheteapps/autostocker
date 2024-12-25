chrome.storage.local.get('stockSymbols', async ({ stockSymbols }) => {
  if (!stockSymbols || stockSymbols.length === 0) {
    console.error('No stock symbols found.');
    return;
  }


  // Platform-specific transformation logic
  const hostname = window.location.hostname;
  let formattedStockSymbols;

  if (hostname.includes('angelone')) {

    // Remove 'NSE:' for Angel One
    formattedStockSymbols = stockSymbols.map((stock) => stock.replace(/^NSE:/, ''));
  } else if (hostname.includes('kite')) {
    console.log('Detected Kite website.');
    // Keep the 'NSE:' format for Kite
    formattedStockSymbols = stockSymbols;
  } else {
    console.error('Unsupported website:', hostname);
    return;
  }

  console.log('Formatted stock symbols:', formattedStockSymbols);

  // Function to add stocks sequentially
  async function addStock(stockSymbol) {
    try {

      // Locate the search input based on the platform
      const searchPlaceholder =
        hostname.includes('angelone')
          ? 'Stocks, Futures & Options'
          : 'Search eg: infy bse, nifty fut, index fund, etc';
      const searchInput = document.querySelector(`input[placeholder="${searchPlaceholder}"]`);
      if (!searchInput) throw new Error('Search input not found.');

      // Enter the stock symbol
      searchInput.value = stockSymbol;
      const inputEvent = new Event('input', { bubbles: true });
      searchInput.dispatchEvent(inputEvent);

      // Wait for the search results to load
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Select and click the first result
      const resultSelector = hostname.includes('angelone')
        ? '#wlSearch > div:first-child'
        : 'li.results-item.selected';
      const firstResult = document.querySelector(resultSelector);
      if (!firstResult) throw new Error('No search results found.');

      firstResult.click();
      console.log(`Clicked on first result for: ${stockSymbol}`);

      // Pause briefly before the next stock
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error adding stock "${stockSymbol}":`, error.message);
    }
  }

  // Add stocks sequentially
  for (const stockSymbol of formattedStockSymbols) {
    await addStock(stockSymbol);
  }

});
