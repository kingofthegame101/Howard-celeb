/**
 * Celebrity Insight - Main Application
 * Handles UI rendering and user interactions
 */

// Global state
let allResults = [];
let filteredResults = [];
let currentPage = 1;
const resultsPerPage = 10;
let sortAscending = false;

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

// Format number with appropriate precision
function formatScore(score) {
  if (typeof score === 'number') {
    return score.toFixed(1);
  }
  return parseFloat(score).toFixed(1) || '0.0';
}

// Get trend class and icon
function getTrendInfo(trend) {
  const trendLower = (trend || '').toLowerCase();
  if (trendLower.includes('fast') && trendLower.includes('rising')) {
    return { class: 'text-emerald-500', icon: 'trending_up', text: 'Fast Rising' };
  } else if (trendLower.includes('rising') || trendLower.includes('up')) {
    return { class: 'text-emerald-500', icon: 'north_east', text: 'Rising' };
  } else if (trendLower.includes('fast') && trendLower.includes('falling')) {
    return { class: 'text-rose-500', icon: 'trending_down', text: 'Declining' };
  } else if (trendLower.includes('falling') || trendLower.includes('down')) {
    return { class: 'text-rose-500', icon: 'south_east', text: 'Falling' };
  }
  return { class: 'text-slate-400', icon: 'horizontal_rule', text: 'Stable' };
}

// Get status badge
function getStatusBadge(result) {
  const trendInfo = getTrendInfo(result.trend);
  if (trendInfo.text === 'Fast Rising' || trendInfo.text === 'Rising') {
    return '<span class="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full">Trending</span>';
  } else if (result.riskFlag === 'Yes') {
    return '<span class="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full">Watching</span>';
  }
  return '<span class="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">Stable</span>';
}

// Get initials for avatar
function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

// Render rankings table
function renderRankings(results) {
  const tbody = document.getElementById('rankingsBody');

  if (!results || results.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-8 py-12 text-center">
          <div class="flex flex-col items-center gap-4">
            <span class="material-symbols-outlined text-4xl text-slate-300">sentiment_dissatisfied</span>
            <p class="text-on-surface-variant">No celebrity data available</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  // Paginate results
  const startIdx = (currentPage - 1) * resultsPerPage;
  const pageResults = results.slice(startIdx, startIdx + resultsPerPage);

  tbody.innerHTML = pageResults.map((r, idx) => {
    const trendInfo = getTrendInfo(r.trend);
    const globalRank = startIdx + idx + 1;

    return `
      <tr class="hover:bg-surface-container-low/50 transition-colors group cursor-pointer" onclick="viewCelebrity('${escapeHtml(r.celebrity)}')">
        <td class="px-8 py-5">
          <div class="flex items-center gap-4">
            <div class="relative">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/80 to-secondary/80 flex items-center justify-center text-white font-bold">
                ${escapeHtml(getInitials(r.celebrity))}
              </div>
              <span class="absolute -top-2 -left-2 ${r.rank <= 3 ? 'bg-primary text-white' : 'bg-slate-200 text-slate-700'} text-[10px] font-bold px-1.5 py-0.5 rounded-lg shadow-sm">${r.rank}</span>
            </div>
            <div>
              <p class="font-headline font-bold text-on-surface leading-tight">${escapeHtml(r.celebrity)}</p>
              <p class="text-xs text-on-surface-variant">${escapeHtml(r.topContributingSource || r.topSource || 'Multi-platform')}</p>
            </div>
          </div>
        </td>
        <td class="px-8 py-5">
          <div class="flex items-center gap-2">
            <span class="font-mono text-lg font-bold">${formatScore(r.score)}</span>
            <span class="material-symbols-outlined ${trendInfo.class}" style="font-variation-settings: 'wght' 700;">${trendInfo.icon}</span>
          </div>
        </td>
        <td class="px-8 py-5">
          <div class="w-full max-w-[120px] bg-surface-container-high h-1.5 rounded-full overflow-hidden">
            <div class="bg-primary h-full rounded-full" style="width: ${r.confidence || 0}%"></div>
          </div>
          <span class="text-xs font-bold mt-1 inline-block">${r.confidence || 0}%</span>
        </td>
        <td class="px-8 py-5">
          ${getStatusBadge(r)}
        </td>
        <td class="px-8 py-5">
          <span class="text-sm font-medium">${escapeHtml(r.topSource || '-')}</span>
        </td>
        <td class="px-8 py-5 text-right">
          <button class="opacity-0 group-hover:opacity-100 p-2 hover:bg-surface-container-high rounded-lg transition-all">
            <span class="material-symbols-outlined text-on-surface-variant">more_vert</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Update pagination info
  document.getElementById('paginationInfo').textContent =
    `Showing ${startIdx + 1} to ${Math.min(startIdx + resultsPerPage, results.length)} of ${results.length} results`;
}

// Update hero stats
function updateHeroStats(results) {
  if (!results || results.length === 0) return;

  // Calculate market trend
  const risingCount = results.filter(r => {
    const trend = (r.trend || '').toLowerCase();
    return trend.includes('rising') || trend.includes('up');
  }).length;
  const totalCount = results.length;
  const risingPercent = ((risingCount / totalCount) * 100).toFixed(1);

  const marketTrendEl = document.getElementById('marketTrend');
  if (risingPercent > 50) {
    marketTrendEl.textContent = `Up ${risingPercent}%`;
    marketTrendEl.className = 'text-emerald-300';
  } else if (risingPercent < 30) {
    marketTrendEl.textContent = `Down ${(100 - risingPercent).toFixed(1)}%`;
    marketTrendEl.className = 'text-rose-300';
  } else {
    marketTrendEl.textContent = 'Stable';
    marketTrendEl.className = 'text-slate-300';
  }

  // Update top gainer
  const topCeleb = results[0];
  if (topCeleb) {
    document.getElementById('topGainerName').textContent = topCeleb.celebrity;
    document.getElementById('topGainerScore').textContent = `Fame Index: ${formatScore(topCeleb.score)}`;
    document.getElementById('topGainerAvatar').textContent = getInitials(topCeleb.celebrity);

    const trendInfo = getTrendInfo(topCeleb.trend);
    document.getElementById('topGainerTrend').textContent = trendInfo.text;
    document.getElementById('topGainerBadge').textContent = `#${topCeleb.rank}`;
  }

  // Update total tracked
  document.getElementById('totalTracked').textContent = results.length.toLocaleString();
  document.getElementById('totalTrackedSub').textContent = `Real-time tracking active`;
}

// Update volatility list
function updateVolatilityList(results) {
  const volatilityEl = document.getElementById('volatilityList');
  if (!results || results.length === 0) {
    volatilityEl.innerHTML = '<p class="text-sm text-slate-400">No volatility data available</p>';
    return;
  }

  // Find rising and falling celebrities
  const rising = results.filter(r => {
    const trend = (r.trend || '').toLowerCase();
    return trend.includes('rising') || trend.includes('up');
  }).slice(0, 2);

  const falling = results.filter(r => {
    const trend = (r.trend || '').toLowerCase();
    return trend.includes('falling') || trend.includes('down');
  }).slice(0, 2);

  const volatility = [...falling, ...rising].slice(0, 4);

  if (volatility.length === 0) {
    volatilityEl.innerHTML = '<p class="text-sm text-slate-400">Market is stable</p>';
    return;
  }

  volatilityEl.innerHTML = volatility.map(r => {
    const trendInfo = getTrendInfo(r.trend);
    const isRising = trendInfo.text.includes('Rising');

    return `
      <div class="bg-white p-3 rounded-xl shadow-sm flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined ${isRising ? 'text-emerald-500 bg-emerald-50' : 'text-rose-500 bg-rose-50'} p-2 rounded-lg">
            ${isRising ? 'trending_up' : 'trending_down'}
          </span>
          <span class="text-sm font-semibold">${escapeHtml(r.celebrity)}</span>
        </div>
        <span class="text-sm font-bold ${isRising ? 'text-emerald-600' : 'text-rose-600'}">
          ${isRising ? '+' : ''}${trendInfo.text}
        </span>
      </div>
    `;
  }).join('');
}

// Update top sources
function updateTopSources(results) {
  const sourcesEl = document.getElementById('topSourcesList');
  if (!results || results.length === 0) {
    sourcesEl.innerHTML = '<p class="text-sm text-slate-400">No source data available</p>';
    return;
  }

  // Aggregate sources
  const sourceStats = {};
  results.forEach(r => {
    const source = r.topSource;
    if (source) {
      if (!sourceStats[source]) {
        sourceStats[source] = { count: 0, totalScore: 0 };
      }
      sourceStats[source].count++;
      sourceStats[source].totalScore += parseFloat(r.score) || 0;
    }
  });

  const topSources = Object.entries(sourceStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3);

  if (topSources.length === 0) {
    sourcesEl.innerHTML = '<p class="text-sm text-slate-400">No source data available</p>';
    return;
  }

  sourcesEl.innerHTML = topSources.map(([source, stats]) => {
    const avgScore = (stats.totalScore / stats.count).toFixed(1);
    return `
      <div class="flex-shrink-0 bg-white p-4 rounded-xl shadow-sm w-48">
        <p class="text-[10px] font-bold text-primary uppercase tracking-tighter mb-1">Top Source</p>
        <p class="text-sm font-bold mb-3 leading-tight">${escapeHtml(source)}</p>
        <div class="h-1 bg-primary/10 rounded-full w-full">
          <div class="h-1 bg-primary rounded-full" style="width: ${Math.min(100, stats.count * 20)}%"></div>
        </div>
        <p class="text-[10px] text-on-surface-variant mt-2">${stats.count} celebrities</p>
      </div>
    `;
  }).join('');
}

// Filter results by platform
function filterResults() {
  const platform = document.getElementById('platformFilter').value;

  if (platform === 'all') {
    filteredResults = [...allResults];
  } else {
    filteredResults = allResults.filter(r => r.topSource === platform);
  }

  currentPage = 1;
  renderRankings(filteredResults);
}

// Sort results
function sortResults() {
  sortAscending = !sortAscending;
  filteredResults.sort((a, b) => {
    const scoreA = parseFloat(a.score) || 0;
    const scoreB = parseFloat(b.score) || 0;
    return sortAscending ? scoreA - scoreB : scoreB - scoreA;
  });
  renderRankings(filteredResults);
}

// Pagination
function nextPage() {
  const maxPage = Math.ceil(filteredResults.length / resultsPerPage);
  if (currentPage < maxPage) {
    currentPage++;
    renderRankings(filteredResults);
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderRankings(filteredResults);
  }
}

// View celebrity detail
function viewCelebrity(name) {
  // Store selected celebrity and navigate to detail page
  sessionStorage.setItem('selectedCelebrity', name);
  window.location.href = `detail.html?celebrity=${encodeURIComponent(name)}`;
}

// Refresh data
async function refreshData() {
  API.clearCache();
  await loadData();
}

// Search functionality
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (query === '') {
        filteredResults = [...allResults];
      } else {
        filteredResults = allResults.filter(r =>
          r.celebrity.toLowerCase().includes(query) ||
          (r.topSource && r.topSource.toLowerCase().includes(query))
        );
      }
      currentPage = 1;
      renderRankings(filteredResults);
    });
  }
}

// Load all data
async function loadData() {
  try {
    const data = await API.getAllData();

    allResults = data.results || [];
    filteredResults = [...allResults];

    // Update UI
    renderRankings(filteredResults);
    updateHeroStats(allResults);
    updateVolatilityList(allResults);
    updateTopSources(allResults);

  } catch (error) {
    console.error('Failed to load data:', error);
    document.getElementById('rankingsBody').innerHTML = `
      <tr>
        <td colspan="6" class="px-8 py-12 text-center">
          <div class="flex flex-col items-center gap-4">
            <span class="material-symbols-outlined text-4xl text-rose-400">error</span>
            <p class="text-on-surface-variant">Failed to load data. Please try again.</p>
            <button onclick="refreshData()" class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
              Retry
            </button>
          </div>
        </td>
      </tr>
    `;
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  // Initialize API (uncomment and set URL when deployed)
  // API.init('https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec');

  setupSearch();
  loadData();
});
