/**
 * Celebrity Popularity Quantifier - Sheet Helpers
 * Taiwan Edition v5.0
 *
 * Utility functions for Google Sheets operations
 */

// =====================================================
// SHEET ACCESS
// =====================================================

/**
 * Safe sheet access wrapper with validation
 * @param {string} sheetId - The spreadsheet ID
 * @param {string} sheetName - The sheet/tab name
 * @returns {Sheet} The sheet object
 * @throws {Error} If spreadsheet or sheet not found
 */
function getSheetSafe(sheetId, sheetName) {
  try {
    const ss = SpreadsheetApp.openById(sheetId);
    if (!ss) {
      throw new Error(`Spreadsheet not found: ${sheetId}`);
    }
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found in spreadsheet`);
    }
    return sheet;
  } catch (e) {
    throw new Error(`Sheet access error: ${e.message}`);
  }
}

/**
 * Find column index by header name
 * @param {Sheet} sheet - The sheet to search
 * @param {string} headerName - The column header to find
 * @returns {number} 1-based column index
 * @throws {Error} If column not found
 */
function findColumnIndex(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idx = headers.indexOf(headerName);
  if (idx === -1) {
    throw new Error(`Column "${headerName}" not found in sheet`);
  }
  return idx + 1; // Convert to 1-based index
}

/**
 * Get headers from a sheet
 * @param {Sheet} sheet - The sheet to read
 * @returns {Array} Array of header strings
 */
function getSheetHeaders(sheet) {
  if (sheet.getLastColumn() === 0) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

// =====================================================
// SHEET INITIALIZATION
// =====================================================

/**
 * Initialize all required sheets with headers
 * Run once to set up the Google Sheet structure
 */
function initializeSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // 原始資料工作表
  let rawSheet = ss.getSheetByName(SHEET_NAMES.RAW_DATA);
  if (!rawSheet) {
    rawSheet = ss.insertSheet(SHEET_NAMES.RAW_DATA);
    rawSheet.appendRow(RAW_DATA_HEADERS);
    Logger.log("✓ 已建立「" + SHEET_NAMES.RAW_DATA + "」工作表");
  }

  // 設定工作表
  let configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
  if (!configSheet) {
    configSheet = ss.insertSheet(SHEET_NAMES.CONFIG);
    configSheet.appendRow(CONFIG_HEADERS);
    configSheet.appendRow(["CELEBRITIES_TO_TRACK", DEFAULT_CELEBRITIES.join(", "), "要追蹤的名人清單", new Date()]);
    configSheet.appendRow(["MODEL_ACCURACY_THRESHOLD", "0.85", "模型準確度低於此值時發出警告", new Date()]);
    configSheet.appendRow(["CONFIDENCE_THRESHOLD", "0.70", "可信度高於此值時可代言", new Date()]);
    configSheet.appendRow(["SENTIMENT_STDDEV_MAX", "0.25", "最大情感波動度", new Date()]);
    configSheet.appendRow(["DATA_RETENTION_DAYS", "30", "歷史資料保留天數", new Date()]);
    configSheet.appendRow(["TRAINING_DATA_MIN", "200", "重新訓練所需最少回饋樣本數", new Date()]);
    Logger.log("✓ 已建立「" + SHEET_NAMES.CONFIG + "」工作表");
  }

  // 來源權重工作表
  let weightsSheet = ss.getSheetByName(SHEET_NAMES.SOURCE_WEIGHTS);
  if (!weightsSheet) {
    weightsSheet = ss.insertSheet(SHEET_NAMES.SOURCE_WEIGHTS);
    weightsSheet.appendRow(SOURCE_WEIGHTS_HEADERS);
    DEFAULT_PLATFORM_WEIGHTS.forEach(([platform, weight, rationale]) => {
      weightsSheet.appendRow([platform, weight, rationale, new Date()]);
    });
    Logger.log("✓ 已建立「" + SHEET_NAMES.SOURCE_WEIGHTS + "」工作表");
  }

  // 結果工作表 (v5.0 規格 19 欄)
  let resultsSheet = ss.getSheetByName(SHEET_NAMES.RESULTS);
  if (!resultsSheet) {
    resultsSheet = ss.insertSheet(SHEET_NAMES.RESULTS);
    resultsSheet.appendRow(RESULTS_HEADERS);
    Logger.log("✓ 已建立「" + SHEET_NAMES.RESULTS + "」工作表");
  }

  // 回饋歷史工作表
  let feedbackSheet = ss.getSheetByName(SHEET_NAMES.FEEDBACK_HISTORY);
  if (!feedbackSheet) {
    feedbackSheet = ss.insertSheet(SHEET_NAMES.FEEDBACK_HISTORY);
    feedbackSheet.appendRow(FEEDBACK_HISTORY_HEADERS);
    Logger.log("✓ 已建立「" + SHEET_NAMES.FEEDBACK_HISTORY + "」工作表");
  }

  // 模型指標工作表
  let metricsSheet = ss.getSheetByName(SHEET_NAMES.MODEL_METRICS);
  if (!metricsSheet) {
    metricsSheet = ss.insertSheet(SHEET_NAMES.MODEL_METRICS);
    metricsSheet.appendRow(MODEL_METRICS_HEADERS);
    Logger.log("✓ 已建立「" + SHEET_NAMES.MODEL_METRICS + "」工作表");
  }

  // 來源設定工作表 (用於來源專屬重要性評分)
  let sourceConfigSheet = ss.getSheetByName(SHEET_NAMES.SOURCE_CONFIG);
  if (!sourceConfigSheet) {
    sourceConfigSheet = ss.insertSheet(SHEET_NAMES.SOURCE_CONFIG);
    sourceConfigSheet.appendRow(SOURCE_CONFIG_HEADERS);
    Logger.log("✓ 已建立「" + SHEET_NAMES.SOURCE_CONFIG + "」工作表");
  }

  Logger.log("✓ 所有工作表初始化完成！");
}

// =====================================================
// TEXT UTILITIES
// =====================================================

/**
 * Truncate content to a maximum length
 * @param {string} content - The content to truncate
 * @param {number} maxLength - Maximum length (default 200)
 * @returns {string} Truncated content with ellipsis if needed
 */
function truncateContent(content, maxLength = 200) {
  if (!content) return "";
  const str = String(content);
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + "...";
}

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {string} format - Format string (default: yyyy-MM-dd HH:mm)
 * @returns {string} Formatted date string
 */
function formatDate(date, format = "yyyy-MM-dd HH:mm") {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return Utilities.formatDate(d, TIMEZONE, format);
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// =====================================================
// DATA CONVERSION
// =====================================================

/**
 * Convert row data to object using headers
 * @param {Array} headers - Array of header names
 * @param {Array} row - Array of row values
 * @returns {Object} Object with header keys and row values
 */
function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((header, idx) => {
    obj[header] = row[idx];
  });
  return obj;
}

/**
 * Convert object to row data using headers
 * @param {Array} headers - Array of header names
 * @param {Object} obj - Object with values
 * @returns {Array} Array of values in header order
 */
function objectToRow(headers, obj) {
  return headers.map(header => obj[header] !== undefined ? obj[header] : "");
}
