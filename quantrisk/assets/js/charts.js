/**
 * charts.js — Chart rendering module
 *
 * All Chart.js chart creation and update functions.
 * Each function takes simulation results and renders
 * the corresponding visualization.
 */

// Registry of active Chart.js instances (for cleanup on re-run)
const chartRegistry = {};

const CHART_COLORS = ['#00d4aa', '#0088ff', '#ffaa00', '#ff4455', '#aa55ff'];

const AXIS_STYLE = {
  color: '#5a6478',
  font: { family: "'IBM Plex Mono'", size: 9 },
};

const GRID_COLOR = 'rgba(30,36,48,0.5)';

/**
 * Destroy a chart instance if it exists.
 * Required before re-rendering the same canvas.
 *
 * @param {string} id — canvas element ID
 */
function destroyChart(id) {
  if (chartRegistry[id]) {
    chartRegistry[id].destroy();
    delete chartRegistry[id];
  }
}

/**
 * Render the P&L return distribution histogram.
 * Bars are color-coded: red = CVaR zone, orange = VaR zone, green = normal.
 *
 * @param {SimulationResult} result
 */
function renderDistributionChart(result) {
  destroyChart('distChart');

  const { portfolioReturns, metrics } = result;
  const { varValue, cvarValue } = metrics;
  const BINS = 80;

  const minR = Math.min(...portfolioReturns);
  const maxR = Math.max(...portfolioReturns);
  const binWidth = (maxR - minR) / BINS;

  // Build histogram
  const hist = new Array(BINS).fill(0);
  portfolioReturns.forEach(r => {
    const idx = Math.min(BINS - 1, Math.floor((r - minR) / binWidth));
    hist[idx]++;
  });

  const labels = Array.from({ length: BINS }, (_, i) =>
    ((minR + (i + 0.5) * binWidth) * 100).toFixed(1) + '%'
  );

  const varBin  = Math.floor((varValue  - minR) / binWidth);
  const cvarBin = Math.floor((cvarValue - minR) / binWidth);

  const barColors = hist.map((_, i) => {
    if (i <= cvarBin) return 'rgba(255,68,85,0.9)';
    if (i <= varBin)  return 'rgba(255,170,0,0.7)';
    return 'rgba(0,212,170,0.5)';
  });

  const ctx = document.getElementById('distChart').getContext('2d');
  chartRegistry.distChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: hist, backgroundColor: barColors, borderWidth: 0 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => `Frequency: ${ctx.parsed.y}` },
        },
      },
      scales: {
        x: { ticks: { ...AXIS_STYLE, maxTicksLimit: 10 }, grid: { color: GRID_COLOR } },
        y: { ticks: AXIS_STYLE, grid: { color: GRID_COLOR } },
      },
    },
  });
}

/**
 * Render the composite risk score gauge (doughnut chart).
 *
 * @param {SimulationResult} result
 */
function renderGaugeChart(result) {
  destroyChart('gaugeChart');

  const { riskScore } = result.metrics;
  const color = riskScore > 70 ? '#ff4455' : riskScore > 40 ? '#ffaa00' : '#00d4aa';
  const label = riskScore > 70 ? '⚠ HIGH RISK' : riskScore > 40 ? 'MODERATE RISK' : '✓ LOW RISK';

  const ctx = document.getElementById('gaugeChart').getContext('2d');
  chartRegistry.gaugeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [riskScore, 100 - riskScore],
        backgroundColor: [color, '#1e2430'],
        borderWidth: 0,
        circumference: 270,
        rotation: 225,
      }],
    },
    options: {
      responsive: false,
      cutout: '80%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    },
  });

  const gaugeVal = document.getElementById('gaugeValue');
  gaugeVal.textContent = riskScore;
  gaugeVal.style.color = color;

  const gaugeLbl = document.getElementById('gaugeLabel');
  gaugeLbl.textContent = label;
  gaugeLbl.style.color = color;
}

/**
 * Render the Monte Carlo path chart.
 * Shows PATH_SAMPLE_COUNT simulated paths + the median path in orange.
 *
 * @param {SimulationResult} result
 */
function renderPathChart(result) {
  destroyChart('pathChart');

  const { pathData } = result;
  const steps  = pathData[0].length;
  const labels = Array.from({ length: steps }, (_, i) => `D${i}`);

  // Individual paths
  const datasets = pathData.slice(0, 50).map((path, i) => ({
    data: path,
    borderColor: `rgba(0,212,170,${i < 10 ? 0.35 : 0.10})`,
    borderWidth: i < 10 ? 1.5 : 0.8,
    pointRadius: 0,
    fill: false,
    tension: 0.3,
  }));

  // Median path overlay
  const medianPath = labels.map((_, d) => {
    const vals = pathData.map(p => p[d] ?? 1);
    return percentile(vals, 0.5);
  });

  datasets.push({
    data: medianPath,
    borderColor: '#ffaa00',
    borderWidth: 2.5,
    borderDash: [4, 4],
    pointRadius: 0,
    fill: false,
    tension: 0.3,
    label: 'Median',
  });

  const ctx = document.getElementById('pathChart').getContext('2d');
  chartRegistry.pathChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { ticks: AXIS_STYLE, grid: { color: GRID_COLOR } },
        y: {
          ticks: {
            ...AXIS_STYLE,
            callback: v => ((v - 1) * 100).toFixed(1) + '%',
          },
          grid: { color: GRID_COLOR },
        },
      },
    },
  });
}

/**
 * Render the asset allocation donut chart.
 *
 * @param {SimulationResult} result
 */
function renderAllocationChart(result) {
  destroyChart('allocChart');

  const { tickers, weights } = result;

  const ctx = document.getElementById('allocChart').getContext('2d');
  chartRegistry.allocChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: tickers,
      datasets: [{
        data: weights.map(w => (w * 100).toFixed(1)),
        backgroundColor: CHART_COLORS,
        borderColor: '#0a0c0f',
        borderWidth: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#e8eaf0',
            font: { family: "'IBM Plex Mono'", size: 11 },
            padding: 12,
          },
        },
      },
    },
  });
}

/**
 * Render the correlation heatmap as an HTML grid.
 *
 * @param {SimulationResult} result
 */
function renderCorrelationHeatmap(result) {
  const { corrMatrix, tickers, n } = result;
  const mapEl = document.getElementById('correlationMap');
  mapEl.innerHTML = '';

  const cellSize = Math.min(46, Math.floor((300 - n * 3) / n));

  const heatmap = document.createElement('div');
  heatmap.className = 'heatmap';
  heatmap.style.gridTemplateColumns = `repeat(${n + 1}, auto)`;

  // Header row
  heatmap.innerHTML += `<div style="width:${cellSize}px"></div>`;
  tickers.forEach(t => {
    heatmap.innerHTML += `
      <div style="width:${cellSize}px;height:24px;display:flex;align-items:center;
                  justify-content:center;font-family:var(--mono);font-size:10px;
                  color:var(--muted)">${t.substring(0, 4)}</div>`;
  });

  // Data rows
  tickers.forEach((rowTicker, i) => {
    heatmap.innerHTML += `
      <div style="width:${cellSize}px;height:${cellSize}px;display:flex;align-items:center;
                  justify-content:center;font-family:var(--mono);font-size:10px;
                  color:var(--muted)">${rowTicker.substring(0, 4)}</div>`;
    tickers.forEach((_, j) => {
      const c = corrMatrix[i][j];
      const r = Math.round(255 * (1 - c));
      const g = Math.round(255 * c * 0.8);
      const bg = i === j
        ? 'rgba(0,212,170,0.3)'
        : `rgba(${r},${g},80,${0.3 + c * 0.5})`;
      heatmap.innerHTML += `
        <div class="heatmap-cell"
             style="width:${cellSize}px;background:${bg};color:${c > 0.6 ? '#fff' : '#aaa'}">
          ${c.toFixed(2)}
        </div>`;
    });
  });

  mapEl.appendChild(heatmap);
}

/**
 * Render all charts from a simulation result.
 *
 * @param {SimulationResult} result
 */
function renderAllCharts(result) {
  renderDistributionChart(result);
  renderGaugeChart(result);
  renderPathChart(result);
  renderAllocationChart(result);
  renderCorrelationHeatmap(result);
}
