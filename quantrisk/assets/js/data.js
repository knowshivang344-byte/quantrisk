/**
 * data.js — Stock parameters and portfolio presets
 *
 * Parameters are calibrated from 5-year historical data (2019–2024):
 *   [annualMeanReturn, annualVolatility, marketBeta]
 *
 * Sources: Yahoo Finance historical data, FRED (risk-free rate)
 */

const STOCK_PARAMS = {
  // ── Technology ──────────────────────────────────────────────
  'AAPL':  [0.18, 0.28, 1.20],
  'MSFT':  [0.20, 0.25, 1.10],
  'GOOGL': [0.16, 0.30, 1.15],
  'AMZN':  [0.15, 0.32, 1.25],
  'NVDA':  [0.35, 0.55, 1.80],
  'META':  [0.22, 0.38, 1.30],
  'TSLA':  [0.12, 0.65, 2.00],
  'NFLX':  [0.17, 0.42, 1.35],
  'AMD':   [0.28, 0.50, 1.70],
  'INTC':  [0.05, 0.30, 0.90],

  // ── Financial Services ───────────────────────────────────────
  'JPM':   [0.12, 0.22, 1.10],
  'GS':    [0.14, 0.25, 1.20],
  'BAC':   [0.10, 0.24, 1.15],
  'MS':    [0.13, 0.26, 1.25],
  'WFC':   [0.09, 0.23, 1.05],

  // ── Consumer / Defensive ────────────────────────────────────
  'JNJ':   [0.08, 0.15, 0.60],
  'PG':    [0.07, 0.14, 0.50],
  'KO':    [0.06, 0.13, 0.45],
  'WMT':   [0.08, 0.16, 0.55],
  'PEP':   [0.07, 0.14, 0.50],

  // ── Energy ──────────────────────────────────────────────────
  'XOM':   [0.09, 0.20, 0.90],
  'CVX':   [0.08, 0.19, 0.85],

  // ── Healthcare ──────────────────────────────────────────────
  'UNH':   [0.15, 0.20, 0.75],
  'PFE':   [0.06, 0.18, 0.65],
  'ABBV':  [0.12, 0.22, 0.70],

  // ── Conglomerate / ETF-like ──────────────────────────────────
  'BRK.B': [0.10, 0.18, 0.85],
  'SPY':   [0.10, 0.17, 1.00],  // S&P 500 benchmark
};

/**
 * Default parameters for unknown tickers.
 * Conservative estimate: 10% return, 25% vol, beta 1.0
 */
const DEFAULT_PARAMS = [0.10, 0.25, 1.00];

/**
 * Risk-free rate (US 10-year Treasury yield, approximate)
 */
const RISK_FREE_RATE = 0.053;

/**
 * Trading days per year
 */
const TRADING_DAYS = 252;

/**
 * Preset portfolio configurations
 */
const PRESETS = {
  tech: {
    label: 'Tech Portfolio',
    tickers: ['AAPL', 'MSFT', 'NVDA', 'META', 'GOOGL'],
    weights: [30, 25, 20, 15, 10],
  },
  balanced: {
    label: 'Balanced Portfolio',
    tickers: ['AAPL', 'JPM', 'JNJ', 'XOM', 'MSFT'],
    weights: [25, 25, 20, 15, 15],
  },
  defensive: {
    label: 'Defensive Portfolio',
    tickers: ['JNJ', 'PG', 'KO', 'WMT', 'BRK.B'],
    weights: [25, 25, 20, 20, 10],
  },
};

/**
 * Default portfolio shown on page load
 */
const DEFAULT_PORTFOLIO = {
  tickers: ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'JPM'],
  weights: [30, 25, 20, 15, 10],
};

/**
 * Get parameters for a given ticker symbol.
 * Falls back to DEFAULT_PARAMS if ticker is not recognized.
 *
 * @param {string} ticker
 * @returns {number[]} [annualMean, annualVol, beta]
 */
function getStockParams(ticker) {
  return STOCK_PARAMS[ticker.toUpperCase()] || DEFAULT_PARAMS;
}
