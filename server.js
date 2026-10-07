const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;
const API_URL =
  process.env.WINGO_API_URL ||
  "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json";

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get("/api/history", async (req, res) => {
  try {
    const response = await fetch(API_URL, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: `Upstream returned ${response.status}`
      });
    }

    const data = await response.json();
    res.set("Cache-Control", "no-store");
    res.json(data);
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: "Unable to reach the WinGo history server."
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`WinGo dashboard running on port ${PORT}`);
});