/**
 * simulation.js — Monte Carlo portfolio simulation engine
 *
 * Core engine: generates correlated GBM paths and computes all
 * risk metrics used in the dashboard.
 */

const SIMULATION_COUNT = 10000;
const PATH_SAMPLE_COUNT = 100;

/**
 * Main simulation entry point.
 *
 * Runs a full Monte Carlo risk analysis for a given portfolio.
 *
 * @param {string[]} tickers    — asset ticker symbols
 * @param {number[]} weights    — portfolio weights (will be normalized)
 * @param {number}   confidence — VaR confidence level, e.g. 0.99
 * @param {number}   horizon    — holding period in trading days
 * @returns {SimulationResult}
 */
function runMonteCarlo(tickers, weights, confidence, horizon) {
  const n = tickers.length;

  // ── Normalize weights to sum to 1 ────────────────────────────
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  const w = weights.map(wt => wt / totalWeight);

  // ── Extract asset parameters ──────────────────────────────────
  const params   = tickers.map(t => getStockParams(t));
  const means    = params.map(p => p[0]);   // annual expected returns
  const vols     = params.map(p => p[1]);   // annual volatilities
  const betas    = params.map(p => p[2]);   // market betas

  // ── Build correlation & covariance matrices ───────────────────
  const corrMatrix = buildCorrMatrix(betas, n);
  const covMatrix  = buildCovMatrix(vols, corrMatrix, n);

  // ── Cholesky decomposition for correlated draws ───────────────
  const L = choleskyDecompose(covMatrix, n);

  // ── Scale parameters to holding period ───────────────────────
  const dt          = horizon / TRADING_DAYS;
  const dailyMeans  = means.map(m => m * dt);

  // ── Monte Carlo: simulate SIMULATION_COUNT portfolio returns ──
  const portfolioReturns = [];

  for (let s = 0; s < SIMULATION_COUNT; s++) {
    // Independent standard normals
    const z  = Array.from({ length: n }, () => randn());
    // Apply Cholesky to get correlated normals
    const cz = applyCholesky(L, z, n);
    // Asset returns: μΔt + L·z (GBM discretization)
    const assetReturns = cz.map((zi, i) => dailyMeans[i] + zi);
    // Portfolio return = Σ wᵢ · rᵢ
    const portReturn = assetReturns.reduce((sum, r, i) => sum + w[i] * r, 0);
    portfolioReturns.push(portReturn);
  }

  // ── Simulate PATH_SAMPLE_COUNT full paths (for chart) ─────────
  const steps    = Math.max(horizon, 10);
  const pathData = simulatePaths(w, means, vols, L, n, steps);

  // ── Compute risk metrics ──────────────────────────────────────
  const metrics = computeMetrics(portfolioReturns, pathData, w, means, vols, betas, confidence, horizon);

  return {
    portfolioReturns,
    pathData,
    corrMatrix,
    metrics,
    weights: w,
    tickers,
    means,
    vols,
    betas,
    n,
  };
}

/**
 * Simulate PATH_SAMPLE_COUNT multi-step portfolio paths using GBM.
 *
 * Each path[s][t] = cumulative portfolio value at step t,
 * starting from 1.0.
 *
 * @returns {number[][]} array of paths
 */
function simulatePaths(w, means, vols, L, n, steps) {
  const paths = [];
  const dailyMeans = means.map(m => m / TRADING_DAYS);
  const dailyVols  = vols.map(v => v / Math.sqrt(TRADING_DAYS));

  for (let s = 0; s < PATH_SAMPLE_COUNT; s++) {
    let value = 1.0;
    const path = [1.0];

    for (let t = 0; t < steps; t++) {
      const z  = Array.from({ length: n }, () => randn());
      const cz = applyCholesky(L, z, n);
      const assetRet = cz.map((zi, i) => dailyMeans[i] + zi * dailyVols[i]);
      const portRet  = assetRet.reduce((sum, r, i) => sum + w[i] * r, 0);
      value *= (1 + portRet);
      path.push(value);
    }

    paths.push(path);
  }

  return paths;
}

/**
 * Compute all risk metrics from simulated returns and paths.
 *
 * @param {number[]}   returns    — SIMULATION_COUNT portfolio returns
 * @param {number[][]} paths      — PATH_SAMPLE_COUNT multi-step paths
 * @param {number[]}   w          — normalized weights
 * @param {number[]}   means      — annual expected returns
 * @param {number[]}   vols       — annual volatilities
 * @param {number[]}   betas      — asset betas
 * @param {number}     confidence — VaR confidence level
 * @param {number}     horizon    — holding period in days
 * @returns {Metrics}
 */
function computeMetrics(returns, paths, w, means, vols, betas, confidence, horizon) {
  const sorted  = [...returns].sort((a, b) => a - b);
  const varIdx  = Math.floor((1 - confidence) * SIMULATION_COUNT);

  // Value at Risk (negative = loss)
  const varValue  = sorted[varIdx];

  // Expected Shortfall / CVaR = mean of tail losses beyond VaR
  const cvarValue = mean(sorted.slice(0, varIdx));

  // Portfolio-level statistics
  const portMean       = mean(returns);
  const portStd        = std(returns);
  const portVolAnnual  = portStd * Math.sqrt(TRADING_DAYS / horizon);
  const portRetAnnual  = portMean * (TRADING_DAYS / horizon);

  // Sharpe ratio: (μ_p − r_f) / σ_p
  const sharpe = (portRetAnnual - RISK_FREE_RATE) / portVolAnnual;

  // Max drawdown: max((peak − trough) / peak) across all paths
  let maxDrawdown = 0;
  paths.forEach(path => {
    let peak = path[0];
    path.forEach(v => {
      if (v > peak) peak = v;
      const dd = (peak - v) / peak;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });
  });

  // Portfolio beta: weighted average of asset betas
  const portBeta = betas.reduce((sum, b, i) => sum + w[i] * b, 0);

  // Composite risk score [0–100]
  const riskScore = Math.min(100, Math.round(
    (portVolAnnual   / 0.60) * 40 +
    (Math.abs(varValue) / 0.15) * 30 +
    (maxDrawdown     / 0.40) * 30
  ));

  return {
    varValue,
    cvarValue,
    portVolAnnual,
    portRetAnnual,
    sharpe,
    maxDrawdown,
    portBeta,
    riskScore,
  };
}

/**
 * Compute per-asset risk contribution to portfolio volatility.
 *
 * Risk contribution of asset i = wᵢ × σᵢ / σ_portfolio
 *
 * @param {number[]} w               — normalized weights
 * @param {number[]} vols            — annual volatilities
 * @param {number}   portVolAnnual   — portfolio annual volatility
 * @returns {number[]}
 */
function computeRiskContributions(w, vols, portVolAnnual) {
  return w.map((wi, i) => (wi * vols[i]) / portVolAnnual);
}

/**
 * Determine a simple BUY / HOLD / REDUCE signal for an asset
 * based on its return-to-risk (Calmar-style) ratio.
 *
 * @param {number} expectedReturn
 * @param {number} volatility
 * @returns {'BUY'|'HOLD'|'REDUCE'}
 */
function getSignal(expectedReturn, volatility) {
  const ratio = expectedReturn / volatility;
  if (ratio > 0.5) return 'BUY';
  if (ratio > 0.3) return 'HOLD';
  return 'REDUCE';
}
