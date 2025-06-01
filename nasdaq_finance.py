#!/usr/bin/env python
# -*- coding: utf-8 -*-

from lxml import html
import requests
from time import sleep
import json
import argparse
from random import randint

def parse_finance_page(ticker):
    """
    Grab financial data from NASDAQ API

    Args:
        ticker (str): Stock symbol

    Returns:
        dict: Scraped data
    """
    url = f"https://api.nasdaq.com/api/quote/{ticker}/summary?assetclass=stocks"
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://www.nasdaq.com",
        "Referer": f"https://www.nasdaq.com/market-activity/stocks/{ticker.lower()}",
    }

    try:
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            raise ValueError("Invalid Response Received From Webserver")

        data = response.json()
        summary_data = data.get("data", {})
        if not summary_data:
            raise ValueError("No data found for ticker")

        # Extraction des informations principales
        company_name = summary_data.get("summaryData", {}).get("Name", {}).get("value", "")
        open_price = summary_data.get("summaryData", {}).get("OpenPrice", {}).get("value", None)
        close_price = summary_data.get("summaryData", {}).get("PreviousClose", {}).get("value", None)
        key_stock_data = {}

        # Extraction des données clés (key_stock_data)
        for key, value in summary_data.get("summaryData", {}).items():
            key_stock_data[key] = value.get("value", "")

        nasdaq_data = {
            "company_name": company_name,
            "ticker": ticker.upper(),
            "url": url,
            "open_price": open_price,
            "close_price": close_price,
            "key_stock_data": key_stock_data
        }
        return nasdaq_data

    except Exception as e:
        print(f"Failed to process the request, Exception: {e}")
        return {}

if __name__=="__main__":

	argparser = argparse.ArgumentParser()
	argparser.add_argument('ticker',help = 'Company stock symbol')
	args = argparser.parse_args()
	ticker = args.ticker
	print("Fetching data for %s"%(ticker))
	scraped_data = parse_finance_page(ticker)
	print("Writing scraped data to output file")

	with open('%s-summary.json'%(ticker),'w') as fp:
		json.dump(scraped_data,fp,indent = 4,ensure_ascii=False)
