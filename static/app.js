let portfolio = [];
let watchlist = [];
let currentTicker = null;
let chart = null;
portfolio = JSON.parse(localStorage.getItem('portfolio') || '[]');
watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
updateList('portfolio');
updateList('watchlist');

window.addToList = addToList;
window.showDetails = showDetails;
window.onload = function () {
    document.getElementById('search').addEventListener('input', updateResults);
    document.getElementById('search').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') updateResults();
    });
    document.getElementById('duration').addEventListener('change', function () {
        if (currentTicker) showChart(currentTicker, this.value);
        updateList('portfolio');
        updateList('watchlist');
    });
};

async function updateResults() {
    const query = document.getElementById('search').value.trim().toUpperCase();
    const results = document.getElementById('results');
    if (!query) {
        results.innerHTML = '';
        return;
    }
    const resp = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await resp.json();
    results.innerHTML = '';
    if (data.length === 1 && data[0].ticker === query) {
        showDetails(data[0].ticker);
        results.innerHTML = '';
    } else if (data.length > 0) {
        data.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.ticker} - ${item.name}`;
            li.onclick = () => showDetails(item.ticker);
            results.appendChild(li);
        });
    } else {
        // Proposer de créer le ticker si inconnu
        results.innerHTML = `<li style="color:#ffb300;cursor:pointer" onclick="createAndShow('${query}')">Aucune donnée pour "${query}". Cliquez ici pour récupérer les infos.</li>`;
    }
}

// Nouvelle fonction pour créer le JSON et afficher les détails
async function createAndShow(ticker) {
    const results = document.getElementById('results');
    results.innerHTML = `<li style="color:#aaa;">Récupération des données pour ${ticker}...</li>`;
    try {
        const resp = await fetch(`/api/ensure/${ticker}`);
        const data = await resp.json();
        if (data.error) {
            results.innerHTML = `<li style="color:red;">${data.error}</li>`;
        } else {
            showDetails(ticker);
            results.innerHTML = '';
        }
    } catch (e) {
        results.innerHTML = `<li style="color:red;">Erreur réseau ou serveur</li>`;
    }
}

async function showDetails(ticker) {
    const resp = await fetch(`/api/summary/${ticker}`);
    const data = await resp.json();
    const details = document.getElementById('details');
    if (data.error) {
        details.innerHTML = `<p style="color:red">${data.error}</p>`;
        document.getElementById('chart-block').style.display = 'none';
        return;
    }
    currentTicker = ticker;
    details.innerHTML = `
        <h2 style="color:#ffb300">${data.company_name || data.ticker}</h2>
        <div style="margin-bottom:1em;">
            <span style="font-size:1.5em;font-weight:bold;">${data.close_price || 'N/A'}</span>
            <span style="margin-left:1em;color:#aaa;">(${data.ticker})</span>
        </div>
        <div>
            <strong>Marché :</strong> ${data.key_stock_data.Exchange || 'N/A'}<br>
            <strong>Secteur :</strong> ${data.key_stock_data.Sector || 'N/A'}<br>
            <strong>Industrie :</strong> ${data.key_stock_data.Industry || 'N/A'}<br>
            <strong>Volume :</strong> ${data.key_stock_data.ShareVolume || 'N/A'}<br>
            <strong>Market Cap :</strong> ${data.key_stock_data.MarketCap || 'N/A'}<br>
            <strong>52w Haut/Bas :</strong> ${data.key_stock_data.FiftTwoWeekHighLow || 'N/A'}<br>
        </div>
        <div style="margin-top:1em;">
            <button class="btn" onclick="addToList('portfolio', '${ticker}')">Ajouter au portefeuille</button>
            <button class="btn" onclick="addToList('watchlist', '${ticker}')">Ajouter à la surveillance</button>
        </div>
    `;
    document.getElementById('chart-block').style.display = 'block';
    showChart(ticker, document.getElementById('duration').value);
}

function addToList(list, ticker) {
    if (list === 'portfolio') {
        if (!portfolio.some(item => item.ticker === ticker)) {
            const qty = prompt("Quantité achetée pour " + ticker + " ?");
            portfolio.push({ ticker, qty: parseInt(qty) || 0 });
            updateList('portfolio');
        }
    }
    if (list === 'watchlist') {
        if (!watchlist.some(item => item.ticker === ticker)) {
            const maxPrice = prompt("Prix d'achat max pour " + ticker + " ?");
            watchlist.push({ ticker, maxPrice: parseFloat(maxPrice) || 0 });
            updateList('watchlist');
        }
    }
    localStorage.setItem('portfolio', JSON.stringify(portfolio));
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
}

function updateList(list) {
    const ul = document.getElementById(list);
    let arr = list === 'portfolio' ? portfolio : watchlist;
    ul.innerHTML = '';
    arr.forEach((item, idx) => {
        const li = document.createElement('li'); // <-- AJOUT OBLIGATOIRE
        const pctId = `${list}-pct-${item.ticker}`;
        let rightCol = `<span id="${pctId}" style="float:right"></span>`;
        if (list === 'portfolio') {
            li.innerHTML = `<span style="cursor:pointer;color:#ffb300" onclick="showDetails('${item.ticker}')">${item.ticker}</span> - Qté: ${item.qty} <button class="btn" style="background:#b71c1c;color:#fff;padding:0 0.5em;" onclick="sellFromPortfolio('${item.ticker}')">Vendre</button>${rightCol}`;
            updatePctChange(item.ticker, pctId);
        } else {
            li.innerHTML = `<span style="cursor:pointer;color:#ffb300" onclick="showDetails('${item.ticker}')">${item.ticker}</span> - Max: $${item.maxPrice.toFixed(2)} <span id="watch-${item.ticker}"></span> <button class="btn" style="background:#b71c1c;color:#fff;padding:0 0.5em;" onclick="removeFromWatchlist(${idx})">✕</button>${rightCol}`;
            updateWatchPrice(item.ticker, item.maxPrice);
            updatePctChange(item.ticker, pctId);
        }
        ul.appendChild(li);
    });
    localStorage.setItem('portfolio', JSON.stringify(portfolio));
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    if (list === 'portfolio') updatePortfolioValue();
}

// Ajoute cette fonction pour la suppression
window.removeFromWatchlist = function (idx) {
    watchlist.splice(idx, 1);
    updateList('watchlist');
}

// Met à jour la couleur du prix actuel dans la watchlist
async function updateWatchPrice(ticker, maxPrice) {
    const resp = await fetch(`/api/summary/${ticker}`);
    const data = await resp.json();
    let price = 0;
    if (data && data.close_price) {
        price = parseFloat(data.close_price.replace(/[^0-9.]/g, ""));
    }
    const span = document.getElementById(`watch-${ticker}`);
    if (span) {
        if (price === 0) {
            span.innerHTML = ' (prix inconnu)';
            span.style.color = '#aaa';
        } else if (price <= maxPrice) {
            span.innerHTML = ` ($${price.toFixed(2)})`;
            span.style.color = 'limegreen';
        } else {
            span.innerHTML = ` ($${price.toFixed(2)})`;
            span.style.color = 'red';
        }
    }
}

// Génère des données fictives pour la courbe (à remplacer par des vraies données historiques)
function generateFakeHistory(duration) {
    let points = 30;
    if (duration === '1d') points = 8;
    if (duration === '5d') points = 5;
    if (duration === '1m') points = 22;
    if (duration === '6m') points = 26;
    if (duration === '1y') points = 52;
    if (duration === '5y') points = 60;
    let data = [];
    let price = 100 + Math.random() * 50;
    for (let i = 0; i < points; i++) {
        price += (Math.random() - 0.5) * 2;
        data.push(Math.round(price * 100) / 100);
    }
    return data;
}

async function showChart(ticker, duration) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    let prices = [];
    let timestamps = [];
    let labels = [];
    let start_date = null;
    let end_date = null;
    try {
        const resp = await fetch(`/api/history/${ticker}?duration=${duration}`);
        const hist = await resp.json();
        if (hist.error) throw new Error(hist.error);
        prices = hist.prices;
        timestamps = hist.timestamps;
        labels = hist.labels;
        start_date = hist.start_date;
        end_date = hist.end_date;
    } catch (e) {
        prices = generateFakeHistory(duration);
        timestamps = prices.map((_, i) => new Date(Date.now() - (prices.length - i) * 86400000).toISOString());
        labels = prices.map((_, i) => i + 1);
    }
    if (chart) chart.destroy();

    // Prépare les données pour Chart.js time scale
    const chartData = timestamps.map((ts, i) => ({ x: ts, y: prices[i] }));

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: `Cours de clôture (${ticker})`,
                data: chartData,
                borderColor: '#ffb300',
                backgroundColor: 'rgba(255,179,0,0.1)',
                tension: 0.2,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointBackgroundColor: '#ffb300'
            }]
        },
        options: {
            plugins: {
                legend: { display: true, labels: { color: '#ffb300' } },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function (context) {
                            const idx = context[0].dataIndex;
                            return labels[idx] || context[0].label;
                        },
                        label: function (context) {
                            return "Cours : $" + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            hover: { mode: 'nearest', intersect: false },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        tooltipFormat: 'dd/MM/yyyy HH:mm',
                        displayFormats: {
                            minute: 'dd/MM/yyyy HH:mm',
                            hour: 'dd/MM/yyyy HH:mm',
                            day: 'dd/MM/yyyy',
                            week: "'W'ww/yyyy",
                            month: 'MM-yyyy',
                            year: 'yyyy'
                        }
                    },
                    title: { display: true, text: 'Date', color: '#ffb300' },
                    ticks: { color: '#ffb300', maxTicksLimit: 10, autoSkip: true },
                    grid: { color: '#333' }
                },
                y: {
                    display: true,
                    title: { display: true, text: 'Prix ($)', color: '#ffb300' },
                    ticks: { color: '#ffb300' },
                    grid: { color: '#333' }
                }
            }
        }
    });

    // Affiche la plage réelle sous le graphique
    const infoDiv = document.getElementById('chart-info');
    if (start_date && end_date) {
        let msg = `Plage réelle affichée : <b>${start_date}</b> → <b>${end_date}</b> (${prices.length} points)`;
        const durationLabels = {
            "1d": "Intraday",
            "5d": "Weekly",
            "1m": "Monthly",
            "6m": "Last 6 months",
            "1y": "Yearly",
            "5y": "Last 5 years",
            "max": "Max"
        };
        if (labels.length > 0) {
            let expectedStart = null;
            const now = new Date();
            if (duration === "1d") expectedStart = new Date(now.getTime() - 1 * 24 * 3600 * 1000);
            if (duration === "5d") expectedStart = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
            if (duration === "1m") expectedStart = new Date(now.getTime() - 31 * 24 * 3600 * 1000);
            if (duration === "6m") expectedStart = new Date(now.getTime() - 186 * 24 * 3600 * 1000);
            if (duration === "1y") expectedStart = new Date(now.getTime() - 366 * 24 * 3600 * 1000);
            if (duration === "5y") expectedStart = new Date(now.getTime() - 5 * 366 * 24 * 3600 * 1000);
            if (expectedStart && new Date(timestamps[0]) > expectedStart) {
                msg += `<br><span style="color:orange">⚠️ Données incomplètes pour la plage "${durationLabels[duration]}" (API Yahoo Finance limitée)</span>`;
            }
        }
        infoDiv.innerHTML = msg;
    } else {
        infoDiv.innerHTML = '';
    }
}

window.sellFromPortfolio = function (ticker) {
    const idx = portfolio.findIndex(item => item.ticker === ticker);
    if (idx !== -1) {
        const qty = prompt("Quantité à vendre pour " + ticker + " ?", 1);
        const sellQty = parseInt(qty) || 0;
        if (sellQty > 0) {
            portfolio[idx].qty -= sellQty;
            if (portfolio[idx].qty <= 0) {
                portfolio.splice(idx, 1);
            }
            updateList('portfolio');
        }
    }
}

// Nouvelle fonction pour mettre à jour la valeur du portefeuille
async function updatePortfolioValue() {
    let total = 0;
    for (const item of portfolio) {
        const resp = await fetch(`/api/summary/${item.ticker}`);
        const data = await resp.json();
        if (data && data.close_price) {
            const price = parseFloat(data.close_price.replace(/[^0-9.]/g, ""));
            total += price * (item.qty || 0);
        }
    }
    document.getElementById('portfolio-value').innerHTML =
        `Valeur totale du portefeuille : $${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function updatePctChange(ticker, spanId) {
    const select = document.getElementById('duration');
    let period = "1d";
    if (select) {
        const val = select.value;
        if (val === "1d") period = "1d";
        else if (val === "5d") period = "1w";
        else if (val === "1m") period = "1m";
        else if (val === "6m") period = "6m";
        else if (val === "1y") period = "1y";
        else if (val === "5y") period = "5y";
        else period = "1y";
    }
    const resp = await fetch(`/api/price_change/${ticker}?period=${period}`);
    const data = await resp.json();
    const span = document.getElementById(spanId);
    if (span) {
        if (data.change === null) {
            span.innerHTML = '';
        } else {
            const pct = data.change;
            let color = pct > 0 ? 'limegreen' : (pct < 0 ? 'red' : '#aaa');
            span.innerHTML = `(${pct > 0 ? '+' : ''}${pct.toFixed(2)}%)`;
            span.style.color = color;
        }
    }
}