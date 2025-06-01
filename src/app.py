import yfinance as yf
from flask import Flask, render_template, jsonify, request
import os
import subprocess
import json
from datetime import datetime, timedelta

app = Flask(
    __name__,
    template_folder=os.path.join(os.path.dirname(__file__), '..', 'templates'),
    static_folder=os.path.join(os.path.dirname(__file__), '..', 'static')
)

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'tickers')

def get_company_name_from_json(ticker):
    path = os.path.join(DATA_DIR, f"{ticker.upper()}-summary.json")
    if not os.path.exists(path):
        return ""
    with open(path) as f:
        data = json.load(f)
    return data.get("company_name", "")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/summary/<ticker>")
def get_summary(ticker):
    ticker = ticker.upper()
    json_path = os.path.join(DATA_DIR, f"{ticker}-summary.json")
    if not os.path.exists(json_path):
        try:
            subprocess.run(
                ["python3", os.path.join(os.path.dirname(__file__), "nasdaq_finance.py"), ticker],
                check=True,
                cwd=DATA_DIR
            )
        except Exception as e:
            return jsonify({"error": f"Erreur lors du scraping: {e}"}), 500
        if not os.path.exists(json_path):
            return jsonify({"error": "Impossible de récupérer les données"}), 404
    with open(json_path) as f:
        data = json.load(f)
    return jsonify(data)

@app.route("/api/ensure/<ticker>")
def ensure_summary(ticker):
    ticker = ticker.upper()
    json_path = os.path.join(DATA_DIR, f"{ticker}-summary.json")
    if not os.path.exists(json_path):
        try:
            subprocess.run(
                ["python3", os.path.join(os.path.dirname(__file__), "nasdaq_finance.py"), ticker],
                check=True,
                cwd=DATA_DIR
            )
        except Exception as e:
            return jsonify({"error": f"Erreur lors du scraping: {e}"}), 500
        if not os.path.exists(json_path):
            return jsonify({"error": "Impossible de récupérer les données"}), 404
    with open(json_path) as f:
        data = json.load(f)
    return jsonify(data)

@app.route("/api/search")
def search():
    query = request.args.get("q", "").upper()
    results = []
    for file in os.listdir(DATA_DIR):
        if file.endswith("-summary.json"):
            ticker = file.split("-")[0]
            name = get_company_name_from_json(ticker)
            if query in ticker or query in name.upper():
                results.append({"ticker": ticker, "name": name})
    return jsonify(results)

@app.route("/api/history/<ticker>")
def get_history(ticker):
    duration = request.args.get("duration", "1m")
    period_map = {
        "1d": ("1d", "5m"),
        "5d": ("5d", "15m"),
        "1m": ("1mo", "1d"),
        "6m": ("6mo", "1wk"),
        "1y": ("1y", "1wk"),
        "5y": ("5y", "1mo"),
        "max": ("max", "1mo"),
    }
    period, interval = period_map.get(duration, ("1mo", "1d"))
    try:
        data = yf.download(ticker, period=period, interval=interval, progress=False)
        if data.empty:
            return jsonify({"error": "Pas de données historiques"}), 404
        closes = data["Close"].dropna()
        idx = closes.index

        # Ne filtre que si ce n'est pas "max"
        if duration != "max":
            now = datetime.now()
            if duration == "1d":
                start = now - timedelta(days=1)
            elif duration == "5d":
                start = now - timedelta(days=7)
            elif duration == "1m":
                start = now - timedelta(days=31)
            elif duration == "6m":
                start = now - timedelta(days=186)
            elif duration == "1y":
                start = now - timedelta(days=366)
            elif duration == "5y":
                start = now - timedelta(days=5*366)
            else:
                start = None

            if start:
                closes = closes[idx >= start]
                idx = idx[idx >= start]

        prices = closes.tolist()

        # Génère des labels temporels adaptés
        if interval in ["5m", "15m"]:
            labels = [d.strftime("%d/%m/%Y %H:%M") for d in idx]
        elif interval == "1d":
            labels = [d.strftime("%d/%m/%Y") for d in idx]
        elif interval == "1wk":
            labels = [f"W{d.strftime('%W')}/{d.strftime('%Y')}" for d in idx]
        elif interval == "1mo":
            labels = [d.strftime("%m-%Y") for d in idx]
        else:
            labels = [str(d) for d in idx]

        timestamps = [d.isoformat() for d in idx]

        # Ajout : plage réelle des données
        start_date = idx[0].strftime("%d/%m/%Y") if len(idx) > 0 else None
        end_date = idx[-1].strftime("%d/%m/%Y") if len(idx) > 0 else None

        return jsonify({
            "prices": prices,
            "labels": labels,
            "timestamps": timestamps,
            "start_date": start_date,
            "end_date": end_date
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/price_change/<ticker>")
def price_change(ticker):
    period_map = {
        "1d": ("2d", "1d"),
        "1w": ("7d", "1d"),
        "1m": ("1mo", "1d"),
        "6m": ("6mo", "1wk"),
        "1y": ("1y", "1wk"),
        "3y": ("3y", "1mo"),
        "5y": ("5y", "1mo"),
    }
    period = request.args.get("period", "1d")
    yf_period, interval = period_map.get(period, ("2d", "1d"))
    try:
        data = yf.download(ticker, period=yf_period, interval=interval, progress=False)
        closes = data["Close"].dropna()
        if len(closes) < 2:
            return jsonify({"change": None})
        old = closes.iloc[0]
        new = closes.iloc[-1]
        pct = ((new - old) / old) * 100 if old else None
        return jsonify({"change": pct})
    except Exception as e:
        return jsonify({"change": None})

if __name__ == "__main__":
    app.run(debug=True)