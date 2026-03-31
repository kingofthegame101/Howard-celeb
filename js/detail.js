/**
 * Celebrity Insight - Detail Page
 * Handles celebrity profile rendering
 */

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

// Format score
function formatScore(score) {
  if (typeof score === 'number') {
    return score.toFixed(1);
  }
  return parseFloat(score).toFixed(1) || '0.0';
}

// Get trend info
function getTrendInfo(trend) {
  const trendLower = (trend || '').toLowerCase();
  if (trendLower.includes('fast') && trendLower.includes('rising')) {
    return { class: 'text-emerald-500', icon: 'trending_up', text: 'Fast Rising', positive: true };
  } else if (trendLower.includes('rising') || trendLower.includes('up')) {
    return { class: 'text-emerald-500', icon: 'north_east', text: 'Rising', positive: true };
  } else if (trendLower.includes('fast') && trendLower.includes('falling')) {
    return { class: 'text-rose-500', icon: 'trending_down', text: 'Declining', positive: false };
  } else if (trendLower.includes('falling') || trendLower.includes('down')) {
    return { class: 'text-rose-500', icon: 'south_east', text: 'Falling', positive: false };
  }
  return { class: 'text-slate-400', icon: 'horizontal_rule', text: 'Stable', positive: null };
}

// Get celebrity name from URL
function getCelebrityFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('celebrity') || sessionStorage.getItem('selectedCelebrity');
}

// Render celebrity profile
function renderProfile(celebrity) {
  // Hide loading, show content
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('contentWrapper').classList.remove('hidden');

  const trendInfo = getTrendInfo(celebrity.trend);

  // Update hero section
  document.getElementById('celebrityName').textContent = celebrity.celebrity;
  document.getElementById('fameIndex').textContent = formatScore(celebrity.score);

  // Trending badge
  const trendingText = document.getElementById('trendingText');
  if (celebrity.rank === 1) {
    trendingText.textContent = 'Trending #1';
  } else if (celebrity.rank <= 5) {
    trendingText.textContent = `Top ${celebrity.rank} Ranked`;
  } else {
    trendingText.textContent = `Rank #${celebrity.rank}`;
  }

  // Fame index trend
  const fameIndexTrend = document.getElementById('fameIndexTrend');
  fameIndexTrend.innerHTML = `
    <span class="material-symbols-outlined ${trendInfo.class}">${trendInfo.icon}</span>
    <span class="${trendInfo.class}">${trendInfo.text}</span>
  `;

  // Description
  const descriptions = [
    `Celebrity profile with real-time fame tracking across multiple platforms.`,
    `Currently ${trendInfo.text.toLowerCase()} in popularity with ${celebrity.confidence}% credibility score.`,
    `Top source: ${celebrity.topSource || 'Multi-platform'}.`
  ];
  document.getElementById('celebrityDescription').textContent = descriptions.join(' ');

  // Profile details
  document.getElementById('detailRank').textContent = `#${celebrity.rank}`;
  document.getElementById('detailCredibility').textContent = `${celebrity.confidence || 0}%`;
  document.getElementById('detailTopSource').textContent = celebrity.topSource || 'Multi-platform';
  document.getElementById('detailEndorsement').textContent = celebrity.endorsement === 'Yes' ? 'Ready' : 'Not Ready';
  document.getElementById('detailEndorsement').className = `font-bold ${celebrity.endorsement === 'Yes' ? 'text-emerald-600' : 'text-amber-600'}`;
  document.getElementById('detailLastUpdated').textContent = celebrity.lastUpdated || 'Recently';

  // Growth opportunity
  if (celebrity.analysisNotes) {
    document.getElementById('growthOpportunity').classList.remove('hidden');
    document.getElementById('growthOpportunityText').textContent = celebrity.analysisNotes;
  }

  // Render source breakdown
  renderSourceBreakdown(celebrity.sourceBreakdown);

  // Generate chart based on trend
  generateVelocityChart(trendInfo.positive);
}

// Render source breakdown
function renderSourceBreakdown(sourceBreakdownStr) {
  const container = document.getElementById('sourceBreakdown');

  let breakdown = {};
  try {
    breakdown = JSON.parse(sourceBreakdownStr || '{}');
  } catch (e) {
    breakdown = {};
  }

  const sources = Object.entries(breakdown);

  if (sources.length === 0) {
    // Default sources if none provided
    sources.push(
      ['Social Media', 0.45],
      ['Search Trends', 0.30],
      ['News & Press', 0.25]
    );
  }

  const icons = {
    'Instagram': 'share',
    'Facebook': 'share',
    'TikTok': 'share',
    'YouTube': 'play_circle',
    'News': 'newspaper',
    'Social Media': 'share',
    'Search Trends': 'search_insights',
    'News & Press': 'newspaper'
  };

  const colors = {
    'Instagram': 'bg-secondary',
    'Facebook': 'bg-tertiary',
    'TikTok': 'bg-primary',
    'YouTube': 'bg-error',
    'News': 'bg-tertiary',
    'Social Media': 'bg-secondary',
    'Search Trends': 'bg-primary',
    'News & Press': 'bg-tertiary'
  };

  const textColors = {
    'Instagram': 'text-secondary',
    'Facebook': 'text-tertiary',
    'TikTok': 'text-primary',
    'YouTube': 'text-error',
    'News': 'text-tertiary',
    'Social Media': 'text-secondary',
    'Search Trends': 'text-primary',
    'News & Press': 'text-tertiary'
  };

  container.innerHTML = sources.map(([source, value]) => {
    const percent = Math.round((typeof value === 'number' ? value : parseFloat(value) || 0) * 100);
    const icon = icons[source] || 'analytics';
    const color = colors[source] || 'bg-primary';
    const textColor = textColors[source] || 'text-primary';

    return `
      <div>
        <div class="flex justify-between items-center mb-2">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined ${textColor}">${icon}</span>
            <span class="font-semibold text-sm">${escapeHtml(source)}</span>
          </div>
          <span class="font-bold text-sm">${percent}%</span>
        </div>
        <div class="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
          <div class="h-full ${color} rounded-full transition-all duration-500" style="width: ${percent}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// Generate velocity chart SVG path
function generateVelocityChart(isPositive) {
  const chartLine = document.getElementById('chartLine');
  const chartFill = document.getElementById('chartFill');

  let path;
  if (isPositive === true) {
    // Rising trend
    path = 'M0 280 Q 100 270, 200 250 T 400 200 T 600 120 T 800 40';
  } else if (isPositive === false) {
    // Falling trend
    path = 'M0 40 Q 100 60, 200 100 T 400 180 T 600 240 T 800 280';
  } else {
    // Stable trend
    path = 'M0 150 Q 100 140, 200 160 T 400 150 T 600 140 T 800 150';
  }

  chartLine.setAttribute('d', path);
  chartFill.setAttribute('d', path + ' V 300 H 0 Z');
}

// Render news feed
function renderNewsFeed(news, celebrityName) {
  const container = document.getElementById('newsFeed');

  // Filter news for this celebrity
  const posts = (news.posts || []).filter(p =>
    p.celebrity.toLowerCase() === celebrityName.toLowerCase()
  ).slice(0, 3);

  if (posts.length === 0) {
    // Show placeholder news
    container.innerHTML = `
      <article class="bg-surface-container-low p-6 rounded-2xl">
        <div class="flex justify-between items-start mb-1">
          <span class="text-xs font-bold text-secondary uppercase tracking-tight">Activity Update</span>
          <span class="text-xs text-on-surface-variant font-medium">Recently</span>
        </div>
        <h4 class="font-headline font-bold text-lg text-on-surface">No recent updates available</h4>
        <p class="text-on-surface-variant text-sm line-clamp-1 mt-2">Check back later for the latest news and social media activity.</p>
      </article>
    `;
    return;
  }

  container.innerHTML = posts.map(post => {
    const platformColors = {
      'Instagram': 'text-secondary',
      'Facebook': 'text-tertiary',
      'YouTube': 'text-error',
      'TikTok': 'text-primary',
      'News': 'text-tertiary'
    };

    return `
      <article class="bg-surface-container-low p-6 rounded-2xl flex gap-6 hover:bg-surface-container hover:shadow-md transition-all duration-300 group cursor-pointer">
        <div class="flex-grow">
          <div class="flex justify-between items-start mb-1">
            <span class="text-xs font-bold ${platformColors[post.platform] || 'text-secondary'} uppercase tracking-tight">${escapeHtml(post.platform)}</span>
            <span class="text-xs text-on-surface-variant font-medium">${escapeHtml(post.date)}</span>
          </div>
          <h4 class="font-headline font-bold text-lg text-on-surface group-hover:text-primary transition-colors">${escapeHtml(post.content.substring(0, 60))}...</h4>
          <p class="text-on-surface-variant text-sm line-clamp-2 mt-2">${escapeHtml(post.content)}</p>
        </div>
      </article>
    `;
  }).join('');
}

// Show error state
function showError() {
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('contentWrapper').classList.add('hidden');
  document.getElementById('errorState').classList.remove('hidden');
}

// Load celebrity data
async function loadCelebrityData() {
  const celebrityName = getCelebrityFromUrl();

  if (!celebrityName) {
    showError();
    return;
  }

  try {
    const data = await API.getAllData();
    const results = data.results || [];

    // Find the celebrity
    const celebrity = results.find(r =>
      r.celebrity.toLowerCase() === celebrityName.toLowerCase()
    );

    if (!celebrity) {
      showError();
      return;
    }

    // Render profile
    renderProfile(celebrity);

    // Render news feed
    renderNewsFeed(data.news || { posts: [] }, celebrityName);

  } catch (error) {
    console.error('Failed to load celebrity data:', error);
    showError();
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Initialize API (uncomment and set URL when deployed)
  // API.init('https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec');

  loadCelebrityData();

  // Watchlist button
  const watchlistBtn = document.getElementById('watchlistBtn');
  if (watchlistBtn) {
    watchlistBtn.addEventListener('click', () => {
      const celebrityName = getCelebrityFromUrl();
      let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');

      if (watchlist.includes(celebrityName)) {
        watchlist = watchlist.filter(c => c !== celebrityName);
        watchlistBtn.innerHTML = `
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">star</span>
          Add to Watchlist
        `;
      } else {
        watchlist.push(celebrityName);
        watchlistBtn.innerHTML = `
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">star</span>
          Added to Watchlist
        `;
      }

      localStorage.setItem('watchlist', JSON.stringify(watchlist));
    });

    // Check if already in watchlist
    const celebrityName = getCelebrityFromUrl();
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    if (watchlist.includes(celebrityName)) {
      watchlistBtn.innerHTML = `
        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">star</span>
        Added to Watchlist
      `;
    }
  }
});
