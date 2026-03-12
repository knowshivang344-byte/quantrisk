/**
 * ui.js — UI rendering and DOM manipulation
 *
 * Handles KPI card updates, holdings table, input building,
 * and preset loading. Keeps all DOM logic out of app.js.
 */

const NUM_ASSETS = 5;
const pct = v => (v * 100).toFixed(2) + '%';

// ── Clock ──────────────────────────────────────────────────────────
function startClock() {
  const el = document.getElementById('clock');
  const update = () => {
    el.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
  };
  update();
  setInterval(update, 1000);
}

// ── Ticker Inputs ──────────────────────────────────────────────────

/**
 * Build the ticker/weight input grid.
 *
 * @param {string[]} tickers
 * @param {number[]} weights
 */
function buildInputs(tickers, weights) {
  const grid = document.getElementById('tickerInputs');
  grid.innerHTML = '';

  tickers.forEach((ticker, i) => {
    const weight = weights[i] ?? 20;
    grid.innerHTML += `
      <div class="ticker-input-wrap">
        <div class="ticker-label">
          <span>Asset ${i + 1}</span>
          <span>wt %</span>
        </div>
        <div class="ticker-field">
          <input
            type="text"
            id="ticker${i}"
            value="${ticker}"
            placeholder="TICKER"
            style="text-transform:uppercase"
          />
          <input
            type="number"
            id="weight${i}"
            value="${weight}"
            min="1"
            max="100"
          />
        </div>
      </div>`;
  });
}

/**
 * Read ticker symbols and weights from the input grid.
 *
 * @returns {{ tickers: string[], weights: number[] }}
 */
function readInputs() {
  const tickers = [];
  const weights = [];

  for (let i = 0; i < NUM_ASSETS; i++) {
    const t = document.getElementById(`ticker${i}`).value.trim().toUpperCase();
    const w = parseFloat(document.getElementById(`weight${i}`).value) || 0;
    tickers.push(t || `ASSET${i + 1}`);
    weights.push(w);
  }

  return { tickers, weights };
}

/**
 * Load a preset portfolio into the input grid.
 *
 * @param {string} presetKey — key in PRESETS object
 */
function loadPreset(presetKey) {
  const preset = PRESETS[presetKey];
  if (!preset) return;
  buildInputs(preset.tickers, preset.weights);
}

/**
 * Read the selected confidence level and horizon from dropdowns.
 *
 * @returns {{ confidence: number, horizon: number }}
 */
function readParams() {
  const confidence = parseFloat(document.getElementById('confidence').value);
  const horizon    = parseInt(document.getElementById('horizon').value, 10);
  return { confidence, horizon };
}

// ── KPI Cards ──────────────────────────────────────────────────────

/**
 * Update a KPI card's value and subtitle.
 *
 * @param {string} id      — e.g. 'var', 'sharpe'
 * @param {string} value   — formatted display value
 * @param {string} sub     — subtitle text
 * @param {string} [cls]   — CSS class: 'positive' | 'negative' | ''
 */
function setKPI(id, value, sub, cls = '') {
  const valEl = document.getElementById(`kpi-${id}`);
  const subEl = document.getElementById(`kpi-${id}-sub`);
  valEl.textContent  = value;
  valEl.className    = `kpi-value ${cls}`;
  if (subEl && sub) subEl.textContent = sub;
}

/**
 * Update all 6 KPI cards from simulation metrics.
 *
 * @param {Metrics} metrics
 * @param {number}  confidence
 * @param {number}  horizon
 */
function updateKPIs(metrics, confidence, horizon) {
  const { varValue, cvarValue, portVolAnnual, sharpe, maxDrawdown, portBeta } = metrics;

  setKPI(
    'var',
    pct(varValue),
    `${horizon}-day @ ${(confidence * 100).toFixed(0)}% confidence`,
    'negative'
  );

  setKPI('cvar', pct(cvarValue), 'Expected tail loss', 'negative');

  setKPI('vol', pct(portVolAnnual), 'Annualized portfolio σ', 'negative');

  setKPI(
    'sharpe',
    sharpe.toFixed(2),
    sharpe > 1 ? '✓ Good risk-adjusted return' : 'Below target (>1.0)',
    sharpe > 1 ? 'positive' : 'negative'
  );

  setKPI('drawdown', pct(-maxDrawdown), 'Simulated max peak-to-trough', 'negative');

  setKPI(
    'beta',
    portBeta.toFixed(2),
    portBeta > 1.2 ? 'High market sensitivity' : 'Moderate sensitivity',
    portBeta > 1.2 ? 'negative' : ''
  );
}

// ── Holdings Table ─────────────────────────────────────────────────

/**
 * Populate the holdings breakdown table.
 *
 * @param {SimulationResult} result
 */
function updateHoldingsTable(result) {
  const { tickers, weights, means, vols, metrics } = result;
  const { portVolAnnual } = metrics;
  const tbody = document.getElementById('holdingsBody');
  tbody.innerHTML = '';

  tickers.forEach((ticker, i) => {
    const contrib = computeRiskContributions(weights, vols, portVolAnnual)[i];
    const signal  = getSignal(means[i], vols[i]);
    const sigClass = signal === 'BUY' ? 'tag-green' : signal === 'HOLD' ? 'tag-blue' : 'tag-red';

    tbody.innerHTML += `
      <tr>
        <td style="font-weight:500;color:var(--accent)">${ticker}</td>
        <td>${(weights[i] * 100).toFixed(1)}%</td>
        <td>${(means[i]  * 100).toFixed(1)}%</td>
        <td>${(vols[i]   * 100).toFixed(1)}%</td>
        <td>${(contrib   * 100).toFixed(1)}%</td>
        <td><span class="tag ${sigClass}">${signal}</span></td>
      </tr>`;
  });
}

// ── Loading Overlay ────────────────────────────────────────────────

function showLoading(message = 'Running Monte Carlo simulations...') {
  const el = document.getElementById('loading');
  document.getElementById('loadingText').textContent = message;
  el.classList.add('active');
}

function hideLoading() {
  document.getElementById('loading').classList.remove('active');
}
