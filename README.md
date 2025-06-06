# Nasdaq Finance Scraper
This script will scrape Nasdaq.com to extract stock market data based on a ticker symbol of a company. If you would like to know more about
this scraper you can check it out at this link https://www.scrapehero.com/scrape-nasdaq-stock-market-data/

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Fields 

This nasdaq scraper can extract the fields below

1. Best Bid/Ask
2. 1 Year Target
3. Share Volume
4. 50 Day Avg. Daily Volume
5. Previous Close
6. 52 Week High/Low
7. Market Cap
8. P/E Ratio
9. Forward P/E (1y)
10. Earnings Per Share (EPS)
11. Annualized Dividend
12. Ex-Dividend Date
13. Dividend Payment Date
14. Current Yield
15. Beta
16. Open Price
17. Open Date
18. Close Price
19. Close Date

### Prerequisites

For this web scraping tutorial using Python 3, we will need some packages for downloading and parsing the HTML. 
Below are the package requirements:

 - lxml
 - requests

### Installation

You can install the required packages using pip and the provided `requirements.txt` file:

```
pip install -r requirements.txt
```

If you use Poetry for dependency management, you can also use the provided `pyproject.toml` and `poetry.lock` files:

```
poetry install
```

If you need to install them manuellement :

- Python Requests, to make requests and download the HTML content of the pages (http://docs.python-requests.org/en/master/user/install/)
- Python LXML, for parsing the HTML Tree Structure using Xpaths (Learn how to install that here – http://lxml.de/installation.html)

## .gitignore

The repository includes a `.gitignore` file that:

- Ignores all JSON output files (`*-summary.json`) produced by the scraper.
- Ignores Python virtual environments (`.venv/`).
- Ignores Python lock/config files (`Pipfile`, `Pipfile.lock`, `poetry.lock`, `pyproject.toml`).
- Does **not** ignore `requirements.txt` (so it is tracked in the repo).

## Running the scraper

The script now uses the public NASDAQ API to fetch data. Be aware that NASDAQ may restrict or block access if you make too many requests in a short period.

You can execute the code with the script name followed by the ticker symbol of the company’s stock data you would like. For example, to find the summary data for Apple Inc.:

```
python3 nasdaq_finance.py AAPL
```

## Output

This will create a JSON file named `tickers/<TICKER>-summary.json` (for example, `tickers/AAPL-summary.json`) containing the extracted data for the requested stock.

These JSON files can be used for further analysis, visualization, or as input for other applications. The project does not provide a display or visualization tool for these files.

## Version Control

All generated JSON files are now stored in the `tickers/` directory, which is excluded from version control via `.gitignore`.

## Project Structure

```
nasdaq_finance/
│
├── src/
│   ├── app.py
│   └── nasdaq_finance.py
├── tickers/           # <-- All generated JSON files go here (not versioned)
├── static/
│   └── app.js
├── templates/
│   └── index.html
├── requirements.txt
├── README.md
└── .gitignore
```


