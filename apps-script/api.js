/**
 * Celebrity Insight - API Endpoint Handler
 * Handles HTTP requests from the frontend
 *
 * Deploy as: Web app > Execute as me > Anyone can access
 */

/**
 * Handle GET requests - serves both HTML dashboard and JSON API
 * @param {Object} e - Event object with query parameters
 */
function doGet(e) {
  const action = e.parameter.action;

  // If no action specified, serve the HTML dashboard
  if (!action) {
    return HtmlService.createHtmlOutput(getHtmlDashboard())
      .setTitle("Celebrity Insight Dashboard")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // Otherwise, handle as JSON API request
  try {
    let result;

    switch (action) {
      case 'getAllDashboardData':
        result = getAllDashboardData();
        break;

      case 'getResults':
        result = getResults();
        break;

      case 'getNewsData':
        result = getNewsData();
        break;

      case 'getSourcesData':
        result = getSourcesData();
        break;

      case 'getAnalytics':
        result = getAnalytics();
        break;

      case 'compareCelebrities':
        const celeb1 = e.parameter.celebrity1;
        const celeb2 = e.parameter.celebrity2;
        result = compareCelebrities(celeb1, celeb2);
        break;

      case 'getAccuracyHistory':
        result = getAccuracyHistory();
        break;

      default:
        result = { error: 'Unknown action: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('API Error: ' + error.message);
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle POST requests for data mutations
 * @param {Object} e - Event object with POST data
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result;

    switch (action) {
      case 'saveFeedback':
        result = saveFeedback(data.postId, data.feedback, data.reason);
        break;

      case 'saveFeedbackBatch':
        result = saveFeedbackBatch(data.items);
        break;

      case 'saveSourceRating':
        result = saveSourceRating(data.sourceName, data.platform, data.rating);
        break;

      case 'saveSourceRatingsBatch':
        result = saveSourceRatingsBatch(data.ratings);
        break;

      case 'generatePdfReport':
        result = generatePdfReport();
        break;

      default:
        result = { error: 'Unknown action: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('API POST Error: ' + error.message);
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Enable CORS for external frontend requests
 * This is handled automatically by Apps Script when deployed as web app
 */

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Escape HTML characters for safe output
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  if (!date) return '-';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return String(date).substring(0, 10);
  }
}

/**
 * Truncate content to specified length
 * @param {string} content - Content to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated content
 */
function truncateContent(content, maxLength) {
  if (!content) return '';
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
}
