/**
 * math.js — Statistical and matrix utility functions
 *
 * All mathematical primitives used by the Monte Carlo engine.
 * Implemented from scratch without external dependencies.
 */

/**
 * Generate a standard normal random variate using the
 * Box-Muller transform.
 *
 * @returns {number} N(0,1) sample
 */
function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Compute the arithmetic mean of an array.
 *
 * @param {number[]} arr
 * @returns {number}
 */
function mean(arr) {
  return arr.reduce((sum, x) => sum + x, 0) / arr.length;
}

/**
 * Compute the population standard deviation of an array.
 *
 * @param {number[]} arr
 * @returns {number}
 */
function std(arr) {
  const m = mean(arr);
  const variance = arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Return the p-th percentile value from an array (linear interpolation).
 *
 * @param {number[]} arr  — input array (will not be mutated)
 * @param {number}   p    — percentile in [0, 1]
 * @returns {number}
 */
function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(p * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

/**
 * Perform a Cholesky decomposition on a symmetric positive-definite
 * covariance matrix to produce lower triangular matrix L such that
 * Σ = L · Lᵀ.
 *
 * Used to generate correlated random variates:
 *   Z_correlated = L · Z_independent
 *
 * @param {number[][]} cov — n×n covariance matrix
 * @param {number}     n   — matrix dimension
 * @returns {number[][]} L — lower triangular matrix
 */
function choleskyDecompose(cov, n) {
  const L = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) {
        sum += L[i][k] * L[j][k];
      }
      if (i === j) {
        // Diagonal: ensure numerical stability with max(·, ε)
        L[i][j] = Math.sqrt(Math.max(cov[i][i] - sum, 1e-10));
      } else {
        L[i][j] = (cov[i][j] - sum) / L[j][j];
      }
    }
  }

  return L;
}

/**
 * Build a covariance matrix from vols array and correlation matrix.
 *
 * Σ[i][j] = ρ[i][j] × σ[i] × σ[j]
 *
 * @param {number[]}   vols       — annual volatilities, length n
 * @param {number[][]} corrMatrix — n×n correlation matrix
 * @param {number}     n
 * @returns {number[][]} covariance matrix
 */
function buildCovMatrix(vols, corrMatrix, n) {
  return corrMatrix.map((row, i) =>
    row.map((rho, j) => rho * vols[i] * vols[j])
  );
}

/**
 * Build a heuristic correlation matrix between assets based on
 * their beta values. Assets with similar betas tend to co-move.
 *
 * Correlation ρ[i][j] = 0.3 + 0.4 × (1 − |β[i]−β[j]| / 3)
 * clamped to [0.05, 0.95].
 *
 * @param {number[]} betas — array of asset betas, length n
 * @param {number}   n
 * @returns {number[][]} correlation matrix
 */
function buildCorrMatrix(betas, n) {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => {
      if (i === j) return 1;
      const rho = 0.3 + 0.4 * (1 - Math.abs(betas[i] - betas[j]) / 3);
      return Math.min(0.95, Math.max(0.05, rho));
    })
  );
}

/**
 * Apply Cholesky factor L to a vector of independent N(0,1) draws
 * to produce correlated variates.
 *
 * @param {number[][]} L  — lower triangular Cholesky factor, n×n
 * @param {number[]}   z  — independent standard normals, length n
 * @param {number}     n
 * @returns {number[]} correlated normals, length n
 */
function applyCholesky(L, z, n) {
  return Array.from({ length: n }, (_, i) => {
    let val = 0;
    for (let j = 0; j <= i; j++) val += L[i][j] * z[j];
    return val;
  });
}
