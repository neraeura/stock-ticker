const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const client = new MongoClient("mongodb+srv://noraarahim:CS20@cs020-hw10.trtxqho.mongodb.net/Stock?retryWrites=true&w=majority");

http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Show the form
  if (pathname === '/' && req.method === 'GET') {
    const filePath = path.join(__dirname, 'form.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading form');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });

  // Handle the form submission
  } else if (pathname === '/search' && req.method === 'GET') {
    const query = parsedUrl.query;
    const { search, type } = query;

    try {
        await client.connect();
        const db = client.db('Stock');
        const collection = db.collection('PublicCompanies');

        let mongoQuery = {};
        if (type === 'ticker') {
            mongoQuery = { ticker: search.trim() };
        } else if (type === 'company') {
            mongoQuery = { company_name: { $regex: new RegExp(search.trim(), 'i') } };
        }

        const results = await collection.find(mongoQuery).toArray();


        // Write to search page
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

        if (results.length === 0) {
            res.write(`<p>No results found.</p>`);
          } else {
            res.write(`<ul>`);
            results.forEach(r => {
              res.write(`<li><strong>${r.company_name}</strong> (${r.ticker}) — $${r.price.toFixed(2)}</li>`);
            });
            res.write(`</ul>`);
          }

        res.write(`
            <a href="/" class="back-link">Back to Search</a>
          </body>
          </html>
          `);

        res.end()
  
    } catch (err) {
      res.writeHead(500);
      res.end("Server error: " + err.message);
    } finally {
      await client.close();
    }
  // 404 Error 
  } else {
    res.writeHead(404);
    res.end("404 Not Found");
  }
  
}).listen(process.env.PORT || 8080, () => {
    console.log(`Server running at http://localhost:${process.env.PORT || 8080}`);
});
