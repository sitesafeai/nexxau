// Using built-in fetch (Node.js 20+)

const url = "http://localhost:3000/api/worksites";

const headers = {
  "Cookie": "next-auth.session-token=<PASTE_YOUR_SESSION_TOKEN_HERE>",
  "x-csrf-token": "<PASTE_YOUR_CSRF_TOKEN_HERE>",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Referer": "http://localhost:3000/dashboard"
};

try {
  const response = await fetch(url, { method: "GET", headers });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.log(JSON.stringify({ error: errorText, status: response.status }));
    process.exit(1);
  }
  
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.log(JSON.stringify({ error: error.message, status: error.status || 0 }));
  process.exit(1);
}

