/**
 * Celebrity Popularity Quantifier - Logging
 * Taiwan Edition v5.0
 *
 * Logging and error alerting functions
 */

// =====================================================
// MODEL METRICS LOGGING
// =====================================================

/**
 * Update Model Metrics sheet with run summary
 * @param {Object} summary - Summary object with timestamp, counts, errors
 */
function updateLogSheet(summary) {
  try {
    let metricsSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAMES.MODEL_METRICS);

    if (!metricsSheet) {
      // Create the sheet if it doesn't exist
      const ss = SpreadsheetApp.openById(SHEET_ID);
      metricsSheet = ss.insertSheet(SHEET_NAMES.MODEL_METRICS);
      metricsSheet.appendRow(MODEL_METRICS_HEADERS);
    }

    const runId = "fetch_" + Utilities.formatDate(new Date(), 'GMT+8', 'yyyyMMdd_HHmmss');

    metricsSheet.appendRow([
      summary.timestamp,
      runId,
      summary.total_posts,
      "", "", "", "", "", "", "",
      "擷取完成",
      summary.celebrities_processed,
      "",
      summary.errors === "None" ? "成功" : "警告",
      summary.errors
    ]);

  } catch (e) {
    Logger.log("更新記錄工作表失敗: " + e.message);
  }
}

// =====================================================
// ERROR ALERTS
// =====================================================

/**
 * Send email alert on critical errors
 * @param {Error} error - Error object
 */
function sendErrorAlert(error) {
  try {
    const email = Session.getActiveUser().getEmail();
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}`;

    GmailApp.sendEmail(
      email,
      "🚨 Celebrity Popularity Quantifier - Pipeline Error",
      `Error: ${error.message}\n\nCheck GAS execution log for details.\n\nSheet: ${sheetUrl}\n\nTimestamp: ${new Date().toISOString()}`
    );

    Logger.log(`Error alert sent to ${email}`);

  } catch (e) {
    Logger.log(`Failed to send error alert: ${e.message}`);
  }
}

// =====================================================
// PIPELINE STATUS LOGGING
// =====================================================

/**
 * Log pipeline start
 * @param {string} pipelineName - Name of the pipeline
 * @param {Object} params - Parameters being used
 */
function logPipelineStart(pipelineName, params = {}) {
  const timestamp = new Date().toISOString();
  Logger.log(`========================================`);
  Logger.log(`PIPELINE START: ${pipelineName}`);
  Logger.log(`Timestamp: ${timestamp}`);
  if (Object.keys(params).length > 0) {
    Logger.log(`Parameters: ${JSON.stringify(params)}`);
  }
  Logger.log(`========================================`);
}

/**
 * Log pipeline completion
 * @param {string} pipelineName - Name of the pipeline
 * @param {number} startTime - Start time in milliseconds
 * @param {Object} stats - Statistics to log
 */
function logPipelineComplete(pipelineName, startTime, stats = {}) {
  const totalTime = Math.round((new Date().getTime() - startTime) / 1000);
  Logger.log(`========================================`);
  Logger.log(`PIPELINE COMPLETE: ${pipelineName}`);
  Logger.log(`Duration: ${totalTime}s`);
  Object.entries(stats).forEach(([key, value]) => {
    Logger.log(`${key}: ${value}`);
  });
  Logger.log(`========================================`);
}

/**
 * Log pipeline error
 * @param {string} pipelineName - Name of the pipeline
 * @param {Error} error - Error that occurred
 * @param {boolean} sendAlert - Whether to send email alert
 */
function logPipelineError(pipelineName, error, sendAlert = true) {
  Logger.log(`========================================`);
  Logger.log(`PIPELINE ERROR: ${pipelineName}`);
  Logger.log(`Error: ${error.message}`);
  if (error.stack) {
    Logger.log(`Stack: ${error.stack}`);
  }
  Logger.log(`========================================`);

  if (sendAlert) {
    sendErrorAlert(error);
  }
}
