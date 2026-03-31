/**
 * Celebrity Popularity Quantifier - Dashboard Backend
 * Taiwan Edition v5.0
 *
 * Backend data functions for the dashboard
 * Called by frontend JavaScript via google.script.run
 */

// =====================================================
// MAIN DATA LOADER - Single API call for all data
// =====================================================

/**
 * Get ALL dashboard data in one API call
 * This dramatically reduces API calls from ~6 to 1 on page load
 * @returns {Object} All dashboard data bundled together
 */
function getAllDashboardData() {
  try {
    const ss = SpreadsheetApp.openById(DASHBOARD_SHEET_ID);

    // Load config for threshold values
    const config = loadDashboardConfigFromSheet(ss);
    const accuracyThreshold = (config.MODEL_ACCURACY_THRESHOLD || 0.85) * 100;

    // Single spreadsheet open - read all sheets once
    const resultsSheet = ss.getSheetByName(SHEET_NAMES.RESULTS);
    const rawSheet = ss.getSheetByName(SHEET_NAMES.RAW_DATA);
    const sourceSheet = ss.getSheetByName(SHEET_NAMES.SOURCE_CONFIG);
    const metricsSheet = ss.getSheetByName(SHEET_NAMES.MODEL_METRICS);

    // Get raw data once - reused for news, feedback, analytics, progress
    const rawData = rawSheet ? rawSheet.getDataRange().getValues() : [];

    return {
      results: getResultsFromSheet(resultsSheet),
      news: getNewsFromRawData(rawData),
      feedback: getFeedbackFromRawData(rawData),
      sources: getSourcesFromSheet(sourceSheet),
      analytics: getAnalyticsFromData(metricsSheet, rawData, accuracyThreshold),
      accuracyHistory: getAccuracyHistoryFromSheet(metricsSheet),
      progress: getProgressFromRawData(rawData),
      config: {
        accuracyThreshold: accuracyThreshold
      }
    };

  } catch (e) {
    Logger.log(`Error in getAllDashboardData: ${e.message}`);
    return {
      results: [],
      news: { posts: [], celebrities: [] },
      feedback: { posts: [] },
      sources: [],
      analytics: null,
      progress: { reviewed: 0, total: 0 },
      config: { accuracyThreshold: 85 }
    };
  }
}

// =====================================================
// RESULTS DATA
// =====================================================

/**
 * Get celebrity rankings from Results sheet
 * @returns {Array} Array of ranking objects
 */
function getResults() {
  try {
    const resultsSheet = SpreadsheetApp.openById(DASHBOARD_SHEET_ID).getSheetByName(SHEET_NAMES.RESULTS);
    return getResultsFromSheet(resultsSheet);
  } catch (e) {
    Logger.log(`Error in getResults: ${e.message}`);
    return [];
  }
}

/**
 * Helper: Extract results from Results sheet
 * @param {Sheet} resultsSheet - Results sheet
 * @returns {Array} Array of result objects
 */
function getResultsFromSheet(resultsSheet) {
  if (!resultsSheet) return [];

  const data = resultsSheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  // Dynamic column lookup using header names (繁體中文)
  const headers = data[0];
  const rankIdx = headers.indexOf("排名");
  const celebrityIdx = headers.indexOf("名人");
  const scoreIdx = headers.indexOf("加權聲量分數");
  const confidenceIdx = headers.indexOf("可信度分數");
  const trendIdx = headers.indexOf("趨勢方向");
  const sourceBreakdownIdx = headers.indexOf("來源分析");
  const topSourceIdx = headers.indexOf("主要來源");
  const riskIdx = headers.indexOf("風險標記");
  const endorsementIdx = headers.indexOf("可代言");
  const topContributingIdx = headers.indexOf("最大貢獻來源");
  const scoreChangeIdx = headers.indexOf("分數變化分析");
  const lastUpdatedIdx = headers.indexOf("最後更新");
  const analysisNotesIdx = headers.indexOf("分析備註");

  return data.slice(1).map((row) => ({
    rank: rankIdx >= 0 ? (row[rankIdx] || 0) : 0,
    celebrity: celebrityIdx >= 0 ? (row[celebrityIdx] || "") : "",
    score: scoreIdx >= 0 ? (row[scoreIdx] || 0) : 0,
    confidence: confidenceIdx >= 0 ? (row[confidenceIdx] || 0) : 0,
    trend: trendIdx >= 0 ? (row[trendIdx] || "→ Stable") : "→ Stable",
    sourceBreakdown: sourceBreakdownIdx >= 0 ? (row[sourceBreakdownIdx] || "{}") : "{}",
    topSource: topSourceIdx >= 0 ? (row[topSourceIdx] || "") : "",
    riskFlag: riskIdx >= 0 ? (row[riskIdx] || "No") : "No",
    endorsement: endorsementIdx >= 0 ? (row[endorsementIdx] || "No") : "No",
    topContributingSource: topContributingIdx >= 0 ? (row[topContributingIdx] || "") : "",
    scoreChangeBreakdown: scoreChangeIdx >= 0 ? (row[scoreChangeIdx] || "{}") : "{}",
    lastUpdated: lastUpdatedIdx >= 0 ? (row[lastUpdatedIdx] || "") : "",
    analysisNotes: analysisNotesIdx >= 0 ? (row[analysisNotesIdx] || "") : ""
  })).filter(r => r.celebrity);
}

// =====================================================
// NEWS DATA
// =====================================================

/**
 * Get news data for News tab
 * @returns {Object} Object with posts and celebrities arrays
 */
function getNewsData() {
  try {
    const rawSheet = SpreadsheetApp.openById(DASHBOARD_SHEET_ID).getSheetByName(SHEET_NAMES.RAW_DATA);
    if (!rawSheet) return { posts: [], celebrities: [] };

    const rawData = rawSheet.getDataRange().getValues();
    return getNewsFromRawData(rawData);
  } catch (e) {
    Logger.log(`Error in getNewsData: ${e.message}`);
    return { posts: [], celebrities: [] };
  }
}

/**
 * Helper: Extract news data from raw data array
 * @param {Array} rawData - Raw data array
 * @returns {Object} News data object
 */
function getNewsFromRawData(rawData) {
  const posts = [];
  const celebritiesSet = new Set();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  for (let i = 1; i < rawData.length; i++) {
    const timestamp = new Date(rawData[i][0]);
    const celebrity = rawData[i][1] || "";

    if (celebrity) {
      celebritiesSet.add(celebrity);
    }

    if (timestamp >= sevenDaysAgo || isNaN(timestamp.getTime())) {
      posts.push({
        celebrity: celebrity,
        platform: rawData[i][2] || "",
        content: truncateContent(rawData[i][4] || "", 200),
        date: rawData[i][6] ? formatDate(rawData[i][6]) : formatDate(rawData[i][0]),
        url: rawData[i][5] || "#"
      });
    }
  }

  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    posts: posts.slice(0, 100),
    celebrities: Array.from(celebritiesSet).sort()
  };
}

// =====================================================
// FEEDBACK DATA
// =====================================================

/**
 * Get posts for feedback/review
 * @returns {Array} Array of unreviewed post objects
 */
function getPostsForFeedback() {
  try {
    const rawSheet = SpreadsheetApp.openById(DASHBOARD_SHEET_ID).getSheetByName(SHEET_NAMES.RAW_DATA);
    if (!rawSheet) return [];

    const rawData = rawSheet.getDataRange().getValues();
    return getFeedbackFromRawData(rawData).posts;
  } catch (e) {
    Logger.log(`Error in getPostsForFeedback: ${e.message}`);
    return [];
  }
}

/**
 * Helper: Extract feedback data from raw data array
 * @param {Array} rawData - Raw data array
 * @returns {Object} Feedback data object with posts array
 */
function getFeedbackFromRawData(rawData) {
  const unreviewedPosts = [];

  for (let i = 1; i < rawData.length; i++) {
    const feedback = rawData[i][8];

    if (!feedback || feedback === '') {
      unreviewedPosts.push({
        id: i,
        platform: rawData[i][2] || "",
        celebrity: rawData[i][1] || "",
        date: rawData[i][6] ? formatDate(rawData[i][6]) : formatDate(rawData[i][0]),
        content: rawData[i][4] || ""
      });
    }
  }

  return {
    posts: unreviewedPosts.slice(0, 50)
  };
}

/**
 * Save feedback for a post
 * @param {number} postId - Row number in Raw Data
 * @param {string} feedback - Feedback value (Good/Bad/Skip)
 * @param {string} reason - Optional reason for Bad feedback
 * @returns {Object} Success status
 */
function saveFeedback(postId, feedback, reason) {
  try {
    const rawSheet = SpreadsheetApp.openById(DASHBOARD_SHEET_ID).getSheetByName(SHEET_NAMES.RAW_DATA);

    if (!rawSheet) {
      throw new Error("找不到「" + SHEET_NAMES.RAW_DATA + "」工作表");
    }

    // Validate feedback value
    if (!VALID_FEEDBACK_VALUES.includes(feedback)) {
      throw new Error("無效的回饋值: " + feedback);
    }

    // postId is the data row index (1-indexed from frontend)
    // Add 1 to get sheet row number (accounting for header)
    const sheetRowNum = parseInt(postId) + 1;

    if (isNaN(sheetRowNum) || sheetRowNum < 2) {
      throw new Error("無效的貼文編號: " + postId);
    }

    // Sanitize reason input (max 500 chars)
    const sanitizedReason = String(reason || '').substring(0, 500);

    rawSheet.getRange(sheetRowNum, 9).setValue(feedback);  // Column I: Feedback
    rawSheet.getRange(sheetRowNum, 10).setValue(sanitizedReason);    // Column J: Feedback_Notes

    Logger.log(`Saved feedback for row ${sheetRowNum}: ${feedback}`);

    return { success: true };

  } catch (e) {
    Logger.log(`Error in saveFeedback: ${e.message}`);
    throw e;
  }
}

/**
 * Save multiple feedback items in one API call
 * Reduces 50+ individual saves to 10 batch saves
 * @param {Array} items - Array of {postId, feedback, reason}
 * @returns {Object} Success status and count
 */
function saveFeedbackBatch(items) {
  if (!items || items.length === 0) return { success: true, count: 0 };

  try {
    const rawSheet = SpreadsheetApp.openById(DASHBOARD_SHEET_ID).getSheetByName(SHEET_NAMES.RAW_DATA);
    if (!rawSheet) throw new Error("找不到「" + SHEET_NAMES.RAW_DATA + "」工作表");

    // Batch all updates
    items.forEach(item => {
      const rowNum = parseInt(item.postId) + 1;
      if (rowNum > 1) {
        // Update both columns in one setValues call
        rawSheet.getRange(rowNum, 9, 1, 2).setValues([[item.feedback, item.reason || '']]);
      }
    });

    Logger.log(`Batch saved ${items.length} feedback items`);
    return { success: true, count: items.length };

  } catch (e) {
    Logger.log(`Error in saveFeedbackBatch: ${e.message}`);
    throw e;
  }
}

// =====================================================
// PROGRESS DATA
// =====================================================

/**
 * Get progress statistics
 * @returns {Object} Progress object with reviewed and total counts
 */
function getProgress() {
  try {
    const rawSheet = SpreadsheetApp.openById(DASHBOARD_SHEET_ID).getSheetByName(SHEET_NAMES.RAW_DATA);

    if (!rawSheet) {
      return { reviewed: 0, total: 0 };
    }

    const data = rawSheet.getDataRange().getValues();
    return getProgressFromRawData(data);

  } catch (e) {
    Logger.log(`Error in getProgress: ${e.message}`);
    return { reviewed: 0, total: 0 };
  }
}

/**
 * Helper: Extract progress from raw data array
 * @param {Array} rawData - Raw data array
 * @returns {Object} Progress object
 */
function getProgressFromRawData(rawData) {
  let reviewed = 0;
  const total = rawData.length - 1;

  for (let i = 1; i < rawData.length; i++) {
    if (rawData[i][8] && rawData[i][8] !== '') {
      reviewed++;
    }
  }

  return { reviewed, total };
}

// =====================================================
// ANALYTICS DATA
// =====================================================

/**
 * Get analytics for Model Analytics tab
 * @returns {Object} Analytics object
 */
function getAnalytics() {
  try {
    const ss = SpreadsheetApp.openById(DASHBOARD_SHEET_ID);

    // Load config to get accuracy threshold
    const config = loadDashboardConfigFromSheet(ss);
    const accuracyThreshold = (config.MODEL_ACCURACY_THRESHOLD || 0.85) * 100;

    const metricsSheet = ss.getSheetByName(SHEET_NAMES.MODEL_METRICS);
    const rawSheet = ss.getSheetByName(SHEET_NAMES.RAW_DATA);
    const rawData = rawSheet ? rawSheet.getDataRange().getValues() : [];

    return getAnalyticsFromData(metricsSheet, rawData, accuracyThreshold);

  } catch (e) {
    Logger.log(`Error in getAnalytics: ${e.message}`);
    return {
      accuracy: 0,
      accuracyThreshold: 85,
      accuracyTrend: "-",
      trainingData: 0,
      goodRatio: 0,
      lastRun: "-",
      lastRunStatus: "-"
    };
  }
}

/**
 * Helper: Extract analytics from metrics sheet and raw data
 * @param {Sheet} metricsSheet - Model Metrics sheet
 * @param {Array} rawData - Raw data array
 * @param {number} accuracyThreshold - Accuracy threshold from config (e.g., 85)
 * @returns {Object} Analytics object
 */
function getAnalyticsFromData(metricsSheet, rawData, accuracyThreshold) {
  const threshold = accuracyThreshold || 85;

  let accuracy = 0;
  let lastRun = "-";
  let lastRunStatus = "-";

  if (metricsSheet) {
    const metricsData = metricsSheet.getDataRange().getValues();
    if (metricsData.length > 1) {
      const latestRow = metricsData[metricsData.length - 1];
      accuracy = parseFloat(String(latestRow[6]).replace('%', '')) || 0;
      lastRun = latestRow[0] ? new Date(latestRow[0]).toLocaleDateString('zh-TW') : "-";
      lastRunStatus = latestRow[13] === "成功" ? "✓ 成功" :
                      latestRow[13] === "警告" ? "⚠️ 警告" :
                      latestRow[13] || "-";
    }
  }

  let goodCount = 0;
  let totalWithFeedback = 0;

  for (let i = 1; i < rawData.length; i++) {
    const feedback = rawData[i][8];
    if (feedback === "好評") {
      goodCount++;
      totalWithFeedback++;
    } else if (feedback === "負評") {
      totalWithFeedback++;
    }
  }

  const goodRatio = totalWithFeedback > 0 ? Math.round((goodCount / totalWithFeedback) * 100) : 0;

  return {
    accuracy,
    accuracyThreshold: threshold,
    accuracyTrend: accuracy >= threshold ? "✓ 表現良好" : "⚠️ 需要改善",
    trainingData: totalWithFeedback,
    goodRatio,
    lastRun,
    lastRunStatus
  };
}

/**
 * Get accuracy history for trend chart (last 7 runs)
 * @returns {Array} Array of { date: string, accuracy: number }
 */
function getAccuracyHistory() {
  try {
    const metricsSheet = SpreadsheetApp.openById(DASHBOARD_SHEET_ID).getSheetByName(SHEET_NAMES.MODEL_METRICS);
    return getAccuracyHistoryFromSheet(metricsSheet);
  } catch (e) {
    Logger.log(`Error in getAccuracyHistory: ${e.message}`);
    return [];
  }
}

/**
 * Helper: Extract accuracy history from metrics sheet
 * @param {Sheet} metricsSheet - Model Metrics sheet
 * @returns {Array} Accuracy history array
 */
function getAccuracyHistoryFromSheet(metricsSheet) {
  if (!metricsSheet) return [];

  const data = metricsSheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  // Get last 7 rows (excluding header)
  const rows = data.slice(1).slice(-7);

  return rows.map(row => {
    const dateVal = row[0];
    let dateStr = '-';
    if (dateVal) {
      try {
        const d = new Date(dateVal);
        dateStr = d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
      } catch (e) {
        dateStr = String(dateVal).substring(0, 10);
      }
    }

    // Parse accuracy (column 7, index 6)
    let accuracy = 0;
    const accStr = String(row[6] || '0');
    accuracy = parseFloat(accStr.replace('%', '')) || 0;

    return { date: dateStr, accuracy: accuracy };
  });
}

// =====================================================
// SOURCES DATA
// =====================================================

/**
 * Get sources data for Source Rating tab
 * @returns {Array} Array of source objects
 */
function getSourcesData() {
  try {
    const sourceConfigSheet = SpreadsheetApp.openById(DASHBOARD_SHEET_ID).getSheetByName(SHEET_NAMES.SOURCE_CONFIG);
    return getSourcesFromSheet(sourceConfigSheet);
  } catch (e) {
    Logger.log(`Error in getSourcesData: ${e.message}`);
    return [];
  }
}

/**
 * Helper: Extract sources from Source Config sheet
 * @param {Sheet} sourceSheet - Source Config sheet
 * @returns {Array} Sources array
 */
function getSourcesFromSheet(sourceSheet) {
  if (!sourceSheet) return [];

  const data = sourceSheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  return data.slice(1).map((row) => ({
    name: row[0] || "",
    sourceType: row[1] || "其他",
    platform: row[2] || "",
    rating: parseInt(row[3]) || 3,
    ratedBy: row[4] || "auto",
    lastModified: row[5] ? formatDate(row[5]) : "-"
  })).filter(s => s.name);
}

/**
 * Save source rating
 * @param {string} sourceName - Source name (e.g., @JJLin)
 * @param {string} platform - Platform (e.g., Instagram)
 * @param {number} rating - Rating 1-5
 * @returns {Object} Success status
 */
function saveSourceRating(sourceName, platform, rating) {
  try {
    const sourceConfigSheet = SpreadsheetApp.openById(DASHBOARD_SHEET_ID).getSheetByName(SHEET_NAMES.SOURCE_CONFIG);

    if (!sourceConfigSheet) {
      throw new Error("找不到「" + SHEET_NAMES.SOURCE_CONFIG + "」工作表");
    }

    // Validate rating
    const numRating = parseInt(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      throw new Error("無效的評分: " + rating);
    }

    // Sanitize inputs
    const sanitizedName = String(sourceName || '').substring(0, 200);
    const sanitizedPlatform = String(platform || '').substring(0, 50);

    if (!sanitizedName || !sanitizedPlatform) {
      throw new Error("來源名稱或平台不可為空");
    }

    const data = sourceConfigSheet.getDataRange().getValues();

    // Find the row with matching source name and platform
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === sanitizedName && data[i][2] === sanitizedPlatform) {
        rowIndex = i + 1; // +1 because sheet rows are 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error("找不到來源: " + sanitizedName + " (" + sanitizedPlatform + ")");
    }

    // Get current user email
    let userEmail = "user";
    try {
      userEmail = Session.getActiveUser().getEmail() || "user";
    } catch (e) {
      // User email not available
    }

    // Update the row
    sourceConfigSheet.getRange(rowIndex, 4).setValue(numRating);           // Importance_Score
    sourceConfigSheet.getRange(rowIndex, 5).setValue(userEmail);           // Rated_By
    sourceConfigSheet.getRange(rowIndex, 6).setValue(new Date());          // Last_Modified

    Logger.log(`Saved rating for ${sanitizedName} (${sanitizedPlatform}): ${numRating} by ${userEmail}`);

    return { success: true };

  } catch (e) {
    Logger.log(`Error in saveSourceRating: ${e.message}`);
    throw e;
  }
}

/**
 * Save multiple source ratings in one API call
 * Reduces many individual saves to 1-2 batch saves
 * @param {Array} ratings - Array of {name, platform, rating}
 * @returns {Object} Success status and count
 */
function saveSourceRatingsBatch(ratings) {
  if (!ratings || ratings.length === 0) return { success: true, count: 0 };

  try {
    const sheet = SpreadsheetApp.openById(DASHBOARD_SHEET_ID).getSheetByName(SHEET_NAMES.SOURCE_CONFIG);
    if (!sheet) throw new Error("找不到「" + SHEET_NAMES.SOURCE_CONFIG + "」工作表");

    const data = sheet.getDataRange().getValues();

    // Build lookup map: "name|platform" -> row number
    const sourceMap = {};
    for (let i = 1; i < data.length; i++) {
      sourceMap[`${data[i][0]}|${data[i][2]}`] = i + 1;
    }

    let userEmail = "user";
    try {
      userEmail = Session.getActiveUser().getEmail() || "user";
    } catch (e) {}

    const now = new Date();

    // Update each rating
    ratings.forEach(r => {
      const key = `${r.name}|${r.platform}`;
      const row = sourceMap[key];
      if (row) {
        // Update rating, user, and timestamp in one setValues call
        sheet.getRange(row, 4, 1, 3).setValues([[r.rating, userEmail, now]]);
      }
    });

    Logger.log(`Batch saved ${ratings.length} source ratings`);
    return { success: true, count: ratings.length };

  } catch (e) {
    Logger.log(`Error in saveSourceRatingsBatch: ${e.message}`);
    throw e;
  }
}

// =====================================================
// PDF EXPORT
// =====================================================

/**
 * Generate PDF report with rankings and metrics
 * @returns {Object} { success: boolean, url: string, error: string }
 */
function generatePdfReport() {
  try {
    const results = getResults();
    const analytics = getAnalytics();

    const today = new Date().toLocaleDateString('zh-TW');

    // Build HTML content for PDF
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Noto Sans TC', sans-serif;
            padding: 40px;
            color: #333;
          }
          h1 {
            color: #667eea;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
          }
          h2 {
            color: #444;
            margin-top: 30px;
          }
          .header-info {
            color: #666;
            margin-bottom: 30px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 12px 8px;
            text-align: left;
          }
          th {
            background: #667eea;
            color: white;
          }
          tr:nth-child(even) {
            background: #f9f9f9;
          }
          .metric-box {
            display: inline-block;
            background: #f5f5f5;
            padding: 15px 25px;
            margin: 10px;
            border-radius: 8px;
            text-align: center;
          }
          .metric-value {
            font-size: 28px;
            font-weight: bold;
            color: #667eea;
          }
          .metric-label {
            font-size: 12px;
            color: #888;
          }
          .endorsement-ready {
            color: #28a745;
            font-weight: bold;
          }
          .endorsement-not-ready {
            color: #dc3545;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #888;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <h1>🎬 名人聲量監測報告</h1>
        <p class="header-info">報告日期：${today} | 台灣市場分析</p>

        <h2>📊 模型指標</h2>
        <div>
          <div class="metric-box">
            <div class="metric-value">${analytics.accuracy || 0}%</div>
            <div class="metric-label">模型準確度</div>
          </div>
          <div class="metric-box">
            <div class="metric-value">${analytics.trainingData || 0}</div>
            <div class="metric-label">訓練資料</div>
          </div>
          <div class="metric-box">
            <div class="metric-value">${analytics.goodRatio || 0}%</div>
            <div class="metric-label">好評比例</div>
          </div>
        </div>

        <h2>🏆 名人排名 (Top 10)</h2>
        <table>
          <tr>
            <th>排名</th>
            <th>名人</th>
            <th>綜合分數</th>
            <th>趨勢</th>
            <th>代言狀態</th>
          </tr>
    `;

    // Add top 10 rankings
    const top10 = results.slice(0, 10);
    top10.forEach(r => {
      const endorsementClass = r.endorsement === 'Yes' ? 'endorsement-ready' : 'endorsement-not-ready';
      const endorsementText = r.endorsement === 'Yes' ? '✓ 可代言' : '✗ 待觀察';
      htmlContent += `
        <tr>
          <td>#${r.rank}</td>
          <td>${escapeHtml(r.celebrity)}</td>
          <td>${typeof r.score === 'number' ? r.score.toFixed(2) : r.score}</td>
          <td>${escapeHtml(r.trend || '→ 持平')}</td>
          <td class="${endorsementClass}">${endorsementText}</td>
        </tr>
      `;
    });

    // Endorsement summary
    const readyCount = results.filter(r => r.endorsement === 'Yes').length;
    const notReadyCount = results.length - readyCount;

    htmlContent += `
        </table>

        <h2>✨ 代言摘要</h2>
        <p>
          <strong>可代言名人：</strong> ${readyCount} 位<br>
          <strong>待觀察名人：</strong> ${notReadyCount} 位
        </p>

        <div class="footer">
          <p>此報告由 Celebrity Popularity Quantifier (CPQ) 系統自動產生</p>
          <p>上次執行：${analytics.lastRun || '-'} | 狀態：${analytics.lastRunStatus || '-'}</p>
        </div>
      </body>
      </html>
    `;

    // Create PDF blob
    const blob = HtmlService.createHtmlOutput(htmlContent)
      .getBlob()
      .setName(`CPQ_Report_${today.replace(/\//g, '-')}.pdf`);

    // Save to Drive and get URL
    const file = DriveApp.createFile(blob);
    const url = file.getDownloadUrl();

    Logger.log(`PDF generated: ${file.getName()}`);

    return { success: true, url: url };

  } catch (e) {
    Logger.log(`Error generating PDF: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// =====================================================
// COMPARISON FUNCTIONS
// =====================================================

/**
 * Compare two celebrities side by side
 * @param {string} celebrity1 - First celebrity name
 * @param {string} celebrity2 - Second celebrity name
 * @returns {Object} Comparison data
 */
function compareCelebrities(celebrity1, celebrity2) {
  try {
    const results = getResults();

    const c1 = results.find(r => r.celebrity === celebrity1);
    const c2 = results.find(r => r.celebrity === celebrity2);

    if (!c1 || !c2) {
      throw new Error("找不到指定的名人資料");
    }

    return {
      success: true,
      data: {
        celebrity1: c1,
        celebrity2: c2
      }
    };
  } catch (e) {
    Logger.log(`Error in compareCelebrities: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// =====================================================
// DASHBOARD CONFIG LOADER (Sheet-based)
// =====================================================

/**
 * Load dashboard configuration from Config sheet
 * Note: Named loadDashboardConfigFromSheet to avoid collision with loadDashboardConfig in config.gs
 * @param {Spreadsheet} ss - Optional spreadsheet object (to avoid re-opening)
 * @returns {Object} Configuration object with thresholds
 */
function loadDashboardConfigFromSheet(ss) {
  try {
    const spreadsheet = ss || SpreadsheetApp.openById(DASHBOARD_SHEET_ID);
    const configSheet = spreadsheet.getSheetByName(SHEET_NAMES.CONFIG);

    if (!configSheet) {
      // Return defaults if Config sheet doesn't exist
      return {
        MODEL_ACCURACY_THRESHOLD: 0.85,
        CONFIDENCE_THRESHOLD: 0.70,
        SENTIMENT_STDDEV_MAX: 0.25
      };
    }

    const data = configSheet.getDataRange().getValues();
    const config = {};

    for (let i = 1; i < data.length; i++) {
      const key = String(data[i][0] || "").trim();
      const value = data[i][1];

      if (!key) continue;

      if (key.includes("THRESHOLD") || key.includes("MAX")) {
        config[key] = parseFloat(value) || 0;
      } else {
        config[key] = value;
      }
    }

    // Ensure defaults
    if (!config.MODEL_ACCURACY_THRESHOLD) config.MODEL_ACCURACY_THRESHOLD = 0.85;
    if (!config.CONFIDENCE_THRESHOLD) config.CONFIDENCE_THRESHOLD = 0.70;
    if (!config.SENTIMENT_STDDEV_MAX) config.SENTIMENT_STDDEV_MAX = 0.25;

    return config;

  } catch (e) {
    Logger.log(`Error loading dashboard config: ${e.message}`);
    return {
      MODEL_ACCURACY_THRESHOLD: 0.85,
      CONFIDENCE_THRESHOLD: 0.70,
      SENTIMENT_STDDEV_MAX: 0.25
    };
  }
}
