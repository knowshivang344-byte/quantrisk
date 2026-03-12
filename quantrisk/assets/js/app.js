/**
 * app.js — Main application entry point
 *
 * Wires together the simulation engine, chart renderer, and UI.
 * This is the only file that calls functions across all modules.
 *
 * Module load order (see index.html):
 *   data.js → math.js → simulation.js → charts.js → ui.js → app.js
 */

/**
 * Run a full portfolio risk analysis:
 *   1. Read inputs from UI
 *   2. Run Monte Carlo simulation
 *   3. Update KPI cards
 *   4. Render all charts
 *   5. Update holdings table
 */
async function runAnalysis() {
  // Read portfolio configuration from inputs
  const { tickers, weights } = readInputs();
  const { confidence, horizon } = readParams();

  // Validate: at least one asset must have a positive weight
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  if (totalWeight <= 0) {
    alert('Please assign positive weights to your assets.');
    return;
  }

  // Show loading overlay (yield to browser to paint before heavy computation)
  showLoading('Running 10,000 Monte Carlo simulations...');
  await new Promise(resolve => setTimeout(resolve, 40));

  try {
    // ── Core simulation ──────────────────────────────────────────
    const result = runMonteCarlo(tickers, weights, confidence, horizon);

    // ── Update UI ────────────────────────────────────────────────
    updateKPIs(result.metrics, confidence, horizon);
    updateHoldingsTable(result);
    renderAllCharts(result);

  } catch (err) {
    console.error('Simulation error:', err);
    alert('An error occurred during simulation. Check the console for details.');
  } finally {
    hideLoading();
  }
}

// ── Initialization ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Start the live clock
  startClock();

  // Build the default portfolio input grid
  buildInputs(DEFAULT_PORTFOLIO.tickers, DEFAULT_PORTFOLIO.weights);

  // Run analysis automatically on page load
  setTimeout(runAnalysis, 300);
});
