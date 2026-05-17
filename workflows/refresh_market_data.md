# Workflow: refresh market data (yfinance)

**Goal.** Pull current share price, market cap, and 52-week range for every public ticker referenced anywhere in `data/bottlenecks/*.json`.

**Tool.** `tools/refresh_market_data.py`

**Inputs.** None. Subset of tickers can be passed as positional args.

**Outputs.** `data/refreshed/market/<TICKER>.json`, one per ticker, with:
- `price`, `previousClose`, `dayChangePct`, `marketCap`, `currency`
- `fiftyTwoWeekHigh`, `fiftyTwoWeekLow`, `trailingPE`
- `name`, `exchange`
- `fetchedAt` (ISO UTC)

## Run it

```
python tools/refresh_market_data.py             # all tickers
python tools/refresh_market_data.py AXTI MU     # subset
```

## Coverage

Works for every ticker format yfinance understands:
- US (no suffix): AXTI, COHR, LITE, MU
- Japan: 5802.T (Sumitomo), 5016.T (JX Advanced Metals)
- Korea: 000660.KS (SK Hynix), 005930.KS (Samsung), 042700.KS (Hanmi), 357780.KS (Soulbrain)
- Netherlands: BESI.AS
- London: IQE.L

## Known issues

- Yahoo throttles aggressive callers from datacenter IPs. The script falls back to `fast_info` if `.info` is empty.
- Some Korean tickers occasionally return null `marketCap`; the price is still reliable.
- Yahoo Finance is unofficial — production-grade analytics should move to a paid feed (Polygon, IEX Cloud).
