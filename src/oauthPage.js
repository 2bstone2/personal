function oauthPage({ message, isError }) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Earshot</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #17142F; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .card { text-align: center; color: #EFEDFA; padding: 32px; max-width: 360px; }
  .brand { display: flex; align-items: center; justify-content: center; margin-bottom: 18px; font-weight: 800; font-size: 20px; letter-spacing: -0.02em; text-transform: uppercase; }
  .brand .dot { width: 6px; height: 6px; border-radius: 50%; background: #E97BB2; margin-left: 4px; }
  .msg { font-size: 15px; line-height: 1.5; color: ${isError ? "#FF2130" : "#C9C4E8"}; }
</style>
</head>
<body>
  <div class="card">
    <div class="brand">Earshot<span class="dot"></span></div>
    <div class="msg">${message}</div>
  </div>
</body>
</html>`;
}

module.exports = { oauthPage };
