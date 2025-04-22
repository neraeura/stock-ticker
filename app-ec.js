const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Fetch live stock price from Financial Modeling Prep API
async function fetchLivePrice(ticker) {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=demo`;

    https.get(apiUrl, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed[0]?.price || null);
        } catch (err) {
          reject(err);
        }
      });
    }).on("error", err => reject(err));
  });
}

http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (pathname === '/' && req.method === 'GET') {
    const filePath = path.join(__dirname, 'form.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading form');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
      }
    });

  } else if (pathname === '/search' && req.method === 'GET') {
    const query = parsedUrl.query;
    const { search, type } = query;

    let result = null;

    if (type === 'ticker') {
      const tickerSymbol = search.trim();
      console.log(`Fetching live price for: ${tickerSymbol}`);

      try {
        const livePrice = await fetchLivePrice(tickerSymbol);
        console.log(`Live price for ${tickerSymbol}: $${livePrice}`);
        if (livePrice !== null) {
          result = {
            company_name: tickerSymbol,
            ticker: tickerSymbol,
            price: livePrice
          };
        }
      } catch (apiErr) {
        console.error("API fetch failed:", apiErr);
      }
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Search Results</title>
        <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;700&display=swap" rel="stylesheet">
        <style>
          body {
            background-color: #000;
            color: #fff;
            font-family: 'Lora', serif;
            margin: 0;
            padding: 40px;
          }
          h1 {
            font-size: 2.5rem;
            margin-bottom: 20px;
          }
          ul {
            list-style: none;
            padding: 0;
          }
          li {
            background-color: #111;
            padding: 15px 20px;
            margin-bottom: 12px;
            border-radius: 8px;
            box-shadow: 0 0 5px rgba(255, 255, 255, 0.05);
          }
          .back-link {
            display: inline-block;
            margin-top: 30px;
            background: #fff;
            color: #000;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
          }
          .back-link:hover {
            background-color: #ddd;
          }
        </style>
      </head>
      <body>
        <h1>Search Results</h1>
    `);

    if (!result) {
      res.write(`<p>No results found.</p>`);
    } else {
      res.write(`<ul>`);
      res.write(`<li><strong>${result.company_name}</strong> (${result.ticker}) — $${result.price.toFixed(2)}</li>`);
      res.write(`</ul>`);
    }

    res.write(`<a href="/" class="back-link">Back to Search</a></body></html>`);
    res.end();

  } else {
    res.writeHead(404);
    res.end("404 Not Found");
  }

}).listen(process.env.PORT || 8080, () => {
  console.log(`Server running at http://localhost:${process.env.PORT || 8080}`);
});
