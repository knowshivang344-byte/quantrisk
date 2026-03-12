# QuantRisk — Portfolio Risk Analyzer

> A Monte Carlo-based portfolio risk engine for quantitative financial analysis. Computes Value at Risk (VaR), Conditional VaR / Expected Shortfall, Sharpe Ratio, Max Drawdown, and Portfolio Beta using 10,000 correlated GBM simulations.

![Status](https://img.shields.io/badge/Status-Active-00d4aa?style=flat-square)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?style=flat-square&logo=javascript)
![Chart.js](https://img.shields.io/badge/Chart.js-4.4-ff6384?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## Overview

QuantRisk is a browser-based quantitative risk management tool that simulates portfolio behavior under thousands of market scenarios. It is designed to replicate the core risk metrics used by institutional trading desks and risk management teams.

**No backend required** — runs entirely in the browser with vanilla JavaScript.

---

## Features

| Feature | Description |
|---------|-------------|
| Monte Carlo Engine | 10,000 correlated GBM paths per analysis |
| Value at Risk | Parametric and historical VaR at 95% or 99% confidence |
| Expected Shortfall | CVaR — mean tail loss beyond the VaR threshold |
| Sharpe Ratio | Risk-adjusted return vs. US 10-year Treasury (5.3%) |
| Max Drawdown | Peak-to-trough loss across all simulated paths |
| Portfolio Beta | Weighted average market sensitivity |
| Correlation Heatmap | Inter-asset correlation matrix via Cholesky decomposition |
| Risk Score | Composite 0–100 risk rating (gauge chart) |
| Holdings Breakdown | Per-asset: weight, expected return, volatility, risk contribution, signal |
| Preset Portfolios | Tech, Balanced, Defensive configurations |

---

## Methodology

### Geometric Brownian Motion (GBM)

Asset prices are modeled using GBM, the standard model for equity dynamics:

```
dS = μ·S·dt + σ·S·dW
```

Discretized over the holding period Δt = T/252:

```
r_i = μ_i·Δt + σ_i·√Δt·Z_i
```

### Correlated Returns via Cholesky Decomposition

Assets are correlated using the Cholesky factorization of the covariance matrix:

```
Σ = L · Lᵀ
Z_correlated = L · Z_independent,   Z_independent ~ N(0, I)
```

This ensures simulated returns respect real-world inter-asset correlations.

### Risk Metrics

| Metric | Formula |
|--------|---------|
| VaR(α) | `percentile(returns, 1−α)` |
| CVaR   | `E[R \| R < VaR(α)]` |
| Sharpe | `(μ_p − r_f) / σ_p` |
| Max DD | `max((peak − trough) / peak)` across paths |
| Beta   | `Σ wᵢ · βᵢ` |

### BUY / HOLD / REDUCE Signals

Signals are derived from the return-to-risk ratio:

```
ratio = μ / σ
BUY    if ratio > 0.50
HOLD   if ratio > 0.30
REDUCE otherwise
```

---

## Project Structure

```
quantrisk/
├── index.html              # Main HTML — layout and canvas elements
├── assets/
│   ├── css/
│   │   └── styles.css      # Full stylesheet with CSS variables
│   └── js/
│       ├── data.js         # Stock parameters, presets, constants
│       ├── math.js         # Box-Muller, Cholesky, mean, std, percentile
│       ├── simulation.js   # Monte Carlo engine, GBM path simulation
│       ├── charts.js       # Chart.js rendering (5 chart types)
│       ├── ui.js           # DOM updates, KPI cards, holdings table
│       └── app.js          # Entry point — wires all modules together
└── README.md
```

---

## Getting Started

### Run Locally

```bash
git clone https://github.com/yourusername/quantrisk.git
cd quantrisk
open index.html        # macOS
# or
start index.html       # Windows
# or just drag index.html into your browser
```

No npm, no build step, no dependencies to install.

### Usage

1. Enter up to 5 asset tickers and their portfolio weights
2. Select confidence level (95% or 99%) and holding horizon (1 / 10 / 30 days)
3. Click **Run Risk Analysis** — or use a preset (Tech / Balanced / Defensive)
4. Review the 6 KPI cards, 4 charts, holdings table, and correlation heatmap

---

## Supported Assets

| Sector | Tickers |
|--------|---------|
| Technology | AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, NFLX, AMD, INTC |
| Financial Services | JPM, GS, BAC, MS, WFC |
| Consumer / Defensive | JNJ, PG, KO, WMT, PEP |
| Energy | XOM, CVX |
| Healthcare | UNH, PFE, ABBV |
| Other | BRK.B, SPY |

> Parameters (μ, σ, β) are calibrated from 5-year historical data (2019–2024). Custom tickers fall back to conservative default parameters.

---

## Technology Stack

- **Vanilla JavaScript (ES6+)** — no frameworks, fully modular
- **Chart.js 4.4** — histogram, doughnut, and multi-line charts
- **CSS Custom Properties** — design token system for consistent theming
- **IBM Plex Mono / Sans** — monospace for data, sans-serif for UI

**Core algorithms implemented from scratch:**
- Box-Muller transform (normal random variates)
- Cholesky decomposition (correlated simulation)
- Monte Carlo path simulation (GBM)
- Percentile-based VaR / CVaR calculation
- Composite risk scoring

---

## Financial Concepts Demonstrated

- **Modern Portfolio Theory** — correlation-based diversification
- **Value at Risk** — regulatory standard (Basel III / Basel IV)
- **Expected Shortfall** — preferred metric under FRTB over VaR
- **Geometric Brownian Motion** — standard equity price model
- **Sharpe Ratio** — risk-adjusted performance (CAPM-aligned)
- **Market Beta** — systematic risk measurement

---

## Limitations

- Asset parameters are based on historical data and do not predict future performance
- The model assumes log-normally distributed returns; fat tails are not explicitly modeled
- Correlations are heuristic (beta-based), not estimated from historical returns
- **This tool is for educational and portfolio analysis purposes only. Not financial advice.**

---

## License

MIT — free to use, fork, and build upon.

---

*Built to demonstrate applied quantitative finance, statistical simulation, and data visualization.*
