const state = { data: [], lastIssue: null };

const $ = (id) => document.getElementById(id);

function classify(n) {
  return Number(n) >= 5 ? "BIG" : "SMALL";
}

function colorClass(color) {
  if (!color) return "";
  if (color.includes("red")) return "red";
  if (color.includes("green")) return "green";
  return "violet";
}

function render(data) {
  state.data = Array.isArray(data) ? data : [];
  if (!state.data.length) return;

  const latest = state.data[0];
  const size = classify(latest.number);

  $("period").textContent = latest.issueNumber || "--";
  $("resultNumber").textContent = latest.number ?? "-";
  $("resultNumber").className = colorClass(latest.color);
  $("resultMeta").textContent =
    `${latest.color || "unknown"}  •  ${size}  •  live result`;

  const sample = state.data.slice(0, 20);
  const big = sample.filter(x => classify(x.number) === "BIG").length;
  const small = sample.length - big;
  const total = Math.max(sample.length, 1);

  $("bigCount").textContent = big;
  $("smallCount").textContent = small;
  $("bigMeter").style.width = `${big / total * 100}%`;
  $("smallMeter").style.width = `${small / total * 100}%`;
  $("updated").textContent = new Date().toLocaleTimeString();

  $("historyList").innerHTML = sample.map(item => {
    const s = classify(item.number);
    return `
      <div class="history-row">
        <div class="issue">${item.issueNumber}</div>
        <div class="num ${colorClass(item.color)}">${item.number}</div>
        <div class="tag ${s === "BIG" ? "big" : "small"}">${s}</div>
        <div>${item.color || "-"}</div>
      </div>
    `;
  }).join("");

  if (state.lastIssue && state.lastIssue !== latest.issueNumber) {
    document.title = `NEW ${latest.number} • EVIL EYE`;
  }
  state.lastIssue = latest.issueNumber;
}

async function loadHistory() {
  $("sysStatus").textContent = "SYNC";
  const started = performance.now();

  try {
    const response = await fetch(`/api/history?t=${Date.now()}`, {
      cache: "no-store"
    });
    const json = await response.json();

    if (!response.ok || json.ok === false) {
      throw new Error(json.error || "API error");
    }

    const data = json?.data?.list || [];
    render(data);

    const ms = Math.round(performance.now() - started);
    $("ping").textContent = `${ms}MS`;
    $("sysStatus").textContent = "READY";
  } catch (error) {
    $("sysStatus").textContent = "OFFLINE";
    $("resultMeta").textContent = "Live history unavailable";
    $("historyList").innerHTML =
      `<div class="loading">SERVER CONNECTION FAILED</div>`;
    console.error(error);
  }
}

$("refreshBtn").addEventListener("click", loadHistory);

$("gameBtn").addEventListener("click", () => {
  window.open(
    "https://dkwin9.com/#/register?invitationCode=691942278103",
    "_blank",
    "noopener,noreferrer"
  );
});

$("telegramBtn").addEventListener("click", () => {
  window.open("https://t.me/arman_rhaman", "_blank", "noopener,noreferrer");
});

document.querySelectorAll(".bottom-nav button[data-scroll]").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.scroll === "historyCard"
      ? document.querySelector(".history-card")
      : document.querySelector(".analysis-card");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

loadHistory();
setInterval(loadHistory, 15000);