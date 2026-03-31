/**
 * Celebrity Popularity Quantifier - Audit
 * Taiwan Edition v5.0
 *
 * Pre-presentation data validation functions
 */

// =====================================================
// MAIN AUDIT FUNCTION
// =====================================================

/**
 * MAIN AUDIT FUNCTION
 * Run this before presentations to validate all data
 * Accessible from CPQ Tools menu
 */
function runFullAudit() {
  const ui = SpreadsheetApp.getUi();

  Logger.log("========================================");
  Logger.log("STARTING FULL DATA AUDIT");
  Logger.log("========================================");

  const report = {
    timestamp: new Date().toISOString(),
    sheets: {},
    totalIssues: 0,
    criticalIssues: 0,
    warnings: 0
  };

  // Audit each sheet
  report.sheets.rawData = auditRawDataSheet();
  report.sheets.results = auditResultsSheet();
  report.sheets.config = auditConfigSheet();
  report.sheets.modelMetrics = auditModelMetricsSheet();
  report.sheets.sourceWeights = auditSourceWeightsSheet();
  report.sheets.sourceConfig = auditSourceConfigSheet();

  // Calculate totals
  Object.values(report.sheets).forEach(sheet => {
    report.totalIssues += sheet.issues.length;
    sheet.issues.forEach(issue => {
      if (issue.severity === "CRITICAL") report.criticalIssues++;
      else if (issue.severity === "WARNING") report.warnings++;
    });
  });

  // Log summary
  Logger.log("\n========================================");
  Logger.log("AUDIT COMPLETE");
  Logger.log(`Total Issues: ${report.totalIssues}`);
  Logger.log(`Critical: ${report.criticalIssues}`);
  Logger.log(`Warnings: ${report.warnings}`);
  Logger.log("========================================");

  // Show UI alert
  const status = report.criticalIssues > 0 ? "❌ 發現嚴重問題" :
                 report.warnings > 0 ? "⚠️ 發現警告" :
                 "✅ 所有檢查通過";

  let message = status + "\n\n";
  message += "問題總數: " + report.totalIssues + "\n";
  message += "嚴重: " + report.criticalIssues + "\n";
  message += "警告: " + report.warnings + "\n\n";

  if (report.totalIssues > 0) {
    message += "各工作表問題:\n";
    Object.entries(report.sheets).forEach(([name, data]) => {
      if (data.issues.length > 0) {
        message += "\n• " + name + ": " + data.issues.length + " 個問題\n";
        data.issues.slice(0, 3).forEach(issue => {
          message += "  - [" + issue.severity + "] " + issue.message + "\n";
        });
        if (data.issues.length > 3) {
          message += "  ... 以及其他 " + (data.issues.length - 3) + " 個\n";
        }
      }
    });
    message += "\n查看記錄器以取得完整詳細資訊。";
  }

  ui.alert("📋 稽核報告", message, ui.ButtonSet.OK);

  return report;
}

// =====================================================
// RAW DATA AUDIT
// =====================================================

/**
 * Audit Raw Data sheet
 * Checks: schema, data types, valid values, duplicates
 */
function auditRawDataSheet() {
  const result = {
    sheetName: SHEET_NAMES.RAW_DATA,
    status: "OK",
    rowCount: 0,
    issues: []
  };

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAMES.RAW_DATA);

    if (!sheet) {
      result.status = "MISSING";
      result.issues.push({ severity: "嚴重", message: "找不到「" + SHEET_NAMES.RAW_DATA + "」工作表" });
      return result;
    }

    const data = sheet.getDataRange().getValues();
    result.rowCount = data.length - 1; // Exclude header

    if (data.length <= 1) {
      result.issues.push({ severity: "警告", message: "「" + SHEET_NAMES.RAW_DATA + "」工作表是空的 (無資料列)" });
      return result;
    }

    const headers = data[0];

    // Dynamic column lookup for data validation (繁體中文)
    const celebrityIdx = headers.indexOf("名人");
    const platformIdx = headers.indexOf("平台");
    const feedbackIdx = headers.indexOf("回饋");
    const postUrlIdx = headers.indexOf("貼文網址");
    const timestampIdx = headers.indexOf("發布時間");

    if (celebrityIdx === -1 || platformIdx === -1 || postUrlIdx === -1) {
      result.issues.push({
        severity: "嚴重",
        message: "找不到必要欄位: 名人、平台 或 貼文網址"
      });
      return result;
    }

    // Check headers
    RAW_DATA_HEADERS.forEach((expected, idx) => {
      if (headers[idx] !== expected) {
        result.issues.push({
          severity: "嚴重",
          message: "欄位 " + String.fromCharCode(65 + idx) + " 標題不符: 預期 \"" + expected + "\", 實際 \"" + (headers[idx] || '(空白)') + "\""
        });
      }
    });

    if (headers.length < 12) {
      result.issues.push({
        severity: "嚴重",
        message: "欄位不足: 預期 12 個, 實際 " + headers.length + " 個"
      });
    }

    // Validate each data row
    const seenUrls = new Set();
    let emptyCelebrities = 0;
    let invalidPlatforms = 0;
    let invalidFeedback = 0;
    let duplicateUrls = 0;
    let invalidTimestamps = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;

      // Check empty celebrity (using dynamic index)
      if (!row[celebrityIdx] || String(row[celebrityIdx]).trim() === "") {
        emptyCelebrities++;
      }

      // Check valid platform (using dynamic index)
      const platform = String(row[platformIdx] || "").trim();
      if (platform && !VALID_PLATFORMS.includes(platform)) {
        invalidPlatforms++;
        if (invalidPlatforms <= 3) {
          result.issues.push({
            severity: "警告",
            message: "第 " + rowNum + " 列: 無效的平台 \"" + platform + "\""
          });
        }
      }

      // Check valid feedback (using dynamic index)
      const feedback = feedbackIdx >= 0 ? String(row[feedbackIdx] || "").trim() : "";
      if (feedback && !VALID_FEEDBACK_VALUES.includes(feedback)) {
        invalidFeedback++;
        if (invalidFeedback <= 3) {
          result.issues.push({
            severity: "警告",
            message: "第 " + rowNum + " 列: 無效的回饋值 \"" + feedback + "\""
          });
        }
      }

      // Check duplicate URLs (using dynamic index)
      const url = String(row[postUrlIdx] || "").trim();
      if (url && url !== "#" && url.startsWith("http")) {
        if (seenUrls.has(url)) {
          duplicateUrls++;
        } else {
          seenUrls.add(url);
        }
      }

      // Check timestamp format (using dynamic index)
      const timestamp = timestampIdx >= 0 ? String(row[timestampIdx] || "") : "";
      if (timestamp && !timestamp.match(/\d{4}-\d{2}-\d{2}/)) {
        invalidTimestamps++;
      }
    }

    // Add summary issues
    if (emptyCelebrities > 0) {
      result.issues.push({
        severity: "嚴重",
        message: emptyCelebrities + " 列的名人欄位為空"
      });
    }

    if (invalidPlatforms > 3) {
      result.issues.push({
        severity: "警告",
        message: "共 " + invalidPlatforms + " 列有無效的平台值"
      });
    }

    if (invalidFeedback > 3) {
      result.issues.push({
        severity: "警告",
        message: "共 " + invalidFeedback + " 列有無效的回饋值"
      });
    }

    if (duplicateUrls > 0) {
      result.issues.push({
        severity: "警告",
        message: "發現 " + duplicateUrls + " 個重複的貼文網址 (請執行「移除重複資料」)"
      });
    }

    if (invalidTimestamps > 0) {
      result.issues.push({
        severity: "警告",
        message: invalidTimestamps + " 列的時間戳記格式無效 (預期 YYYY-MM-DD)"
      });
    }

    result.status = result.issues.some(i => i.severity === "嚴重") ? "FAIL" :
                    result.issues.length > 0 ? "WARNING" : "OK";

    Logger.log("原始資料稽核: " + result.rowCount + " 列, " + result.issues.length + " 個問題");

  } catch (e) {
    result.status = "ERROR";
    result.issues.push({ severity: "嚴重", message: "稽核錯誤: " + e.message });
  }

  return result;
}

// =====================================================
// RESULTS AUDIT
// =====================================================

/**
 * Audit Results sheet
 * Checks: schema, valid scores, sequential ranks, valid JSON, trend emojis
 */
function auditResultsSheet() {
  const result = {
    sheetName: SHEET_NAMES.RESULTS,
    status: "OK",
    rowCount: 0,
    issues: []
  };

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAMES.RESULTS);

    if (!sheet) {
      result.status = "MISSING";
      result.issues.push({ severity: "嚴重", message: "找不到「" + SHEET_NAMES.RESULTS + "」工作表" });
      return result;
    }

    const data = sheet.getDataRange().getValues();
    result.rowCount = data.length - 1;

    if (data.length <= 1) {
      result.issues.push({ severity: "警告", message: "「" + SHEET_NAMES.RESULTS + "」工作表是空的" });
      return result;
    }

    const headers = data[0];

    // Check key headers exist (繁體中文)
    const requiredHeaders = ["排名", "名人", "加權聲量分數", "趨勢方向", "風險標記", "可代言"];
    requiredHeaders.forEach(header => {
      if (!headers.includes(header)) {
        result.issues.push({
          severity: "嚴重",
          message: "缺少必要欄位: " + header
        });
      }
    });

    // Find column indices (繁體中文)
    const rankIdx = headers.indexOf("排名");
    const scoreIdx = headers.indexOf("加權聲量分數");
    const sentimentIdx = headers.indexOf("平均情感分數");
    const trendIdx = headers.indexOf("趨勢方向");
    const sourceBreakdownIdx = headers.indexOf("來源分析");
    const riskIdx = headers.indexOf("風險標記");
    const endorsementIdx = headers.indexOf("可代言");
    const scoreChangeIdx = headers.indexOf("分數變化分析");

    let prevRank = 0;
    let rankGaps = 0;
    let invalidScores = 0;
    let invalidJson = 0;
    let missingTrendEmoji = 0;
    let invalidRiskFlag = 0;
    let invalidEndorsement = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;

      // Check sequential ranks
      if (rankIdx >= 0) {
        const rank = Number(row[rankIdx]);
        if (rank !== prevRank + 1) {
          rankGaps++;
          if (rankGaps <= 2) {
            result.issues.push({
              severity: "警告",
              message: "第 " + rowNum + " 列: 排名間隔 (預期 " + (prevRank + 1) + ", 實際 " + rank + ")"
            });
          }
        }
        prevRank = rank;
      }

      // Check score range (0-1)
      if (scoreIdx >= 0) {
        const score = Number(row[scoreIdx]);
        if (!isNaN(score) && (score < 0 || score > 1)) {
          invalidScores++;
        }
      }

      // Check sentiment range (-1 to +1)
      if (sentimentIdx >= 0) {
        const sentiment = Number(row[sentimentIdx]);
        if (!isNaN(sentiment) && (sentiment < -1 || sentiment > 1)) {
          result.issues.push({
            severity: "警告",
            message: "第 " + rowNum + " 列: 情感分數 " + sentiment + " 超出範圍 (-1 到 +1)"
          });
        }
      }

      // Check Source_Breakdown is valid JSON
      if (sourceBreakdownIdx >= 0) {
        const jsonStr = String(row[sourceBreakdownIdx] || "").trim();
        if (jsonStr && jsonStr !== "") {
          try {
            JSON.parse(jsonStr);
          } catch (e) {
            invalidJson++;
            if (invalidJson <= 2) {
              result.issues.push({
                severity: "警告",
                message: "第 " + rowNum + " 列: 來源分析欄位的 JSON 無效"
              });
            }
          }
        }
      }

      // Check Score_Change_Breakdown is valid JSON
      if (scoreChangeIdx >= 0) {
        const jsonStr = String(row[scoreChangeIdx] || "").trim();
        if (jsonStr && jsonStr !== "") {
          try {
            JSON.parse(jsonStr);
          } catch (e) {
            invalidJson++;
          }
        }
      }

      // Check trend has emoji
      if (trendIdx >= 0) {
        const trend = String(row[trendIdx] || "");
        if (trend && !TREND_EMOJIS.some(emoji => trend.includes(emoji))) {
          missingTrendEmoji++;
        }
      }

      // Check Risk_Flag is "Yes" or "No"
      if (riskIdx >= 0) {
        const riskFlag = String(row[riskIdx] || "").trim();
        if (riskFlag && riskFlag !== "Yes" && riskFlag !== "No") {
          invalidRiskFlag++;
          if (invalidRiskFlag <= 2) {
            result.issues.push({
              severity: "警告",
              message: "第 " + rowNum + " 列: 風險標記應為 \"Yes\" 或 \"No\", 實際為 \"" + riskFlag + "\""
            });
          }
        }
      }

      // Check Endorsement_Ready is "Yes" or "No"
      if (endorsementIdx >= 0) {
        const endorsement = String(row[endorsementIdx] || "").trim();
        if (endorsement && endorsement !== "Yes" && endorsement !== "No") {
          invalidEndorsement++;
          if (invalidEndorsement <= 2) {
            result.issues.push({
              severity: "警告",
              message: "第 " + rowNum + " 列: 可代言應為 \"Yes\" 或 \"No\", 實際為 \"" + endorsement + "\""
            });
          }
        }
      }
    }

    // Add summary issues
    if (rankGaps > 2) {
      result.issues.push({
        severity: "警告",
        message: "共發現 " + rankGaps + " 個排名序列間隔"
      });
    }

    if (invalidScores > 0) {
      result.issues.push({
        severity: "嚴重",
        message: invalidScores + " 列的分數超出 0-1 範圍"
      });
    }

    if (invalidJson > 2) {
      result.issues.push({
        severity: "警告",
        message: "共發現 " + invalidJson + " 個無效的 JSON 欄位"
      });
    }

    if (missingTrendEmoji > 0) {
      result.issues.push({
        severity: "警告",
        message: missingTrendEmoji + " 列缺少趨勢表情符號 (🚀, ↑, →, ↓, 📉)"
      });
    }

    if (invalidRiskFlag > 2) {
      result.issues.push({
        severity: "警告",
        message: "共 " + invalidRiskFlag + " 個無效的風險標記值 (應為 \"Yes\" 或 \"No\")"
      });
    }

    if (invalidEndorsement > 2) {
      result.issues.push({
        severity: "警告",
        message: "共 " + invalidEndorsement + " 個無效的可代言值"
      });
    }

    result.status = result.issues.some(i => i.severity === "嚴重") ? "FAIL" :
                    result.issues.length > 0 ? "WARNING" : "OK";

    Logger.log("結果稽核: " + result.rowCount + " 列, " + result.issues.length + " 個問題");

  } catch (e) {
    result.status = "ERROR";
    result.issues.push({ severity: "嚴重", message: "稽核錯誤: " + e.message });
  }

  return result;
}

// =====================================================
// CONFIG AUDIT
// =====================================================

/**
 * Audit Config sheet
 * Checks: required settings exist, valid numeric values
 */
function auditConfigSheet() {
  const result = {
    sheetName: SHEET_NAMES.CONFIG,
    status: "OK",
    rowCount: 0,
    issues: []
  };

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAMES.CONFIG);

    if (!sheet) {
      result.status = "MISSING";
      result.issues.push({ severity: "嚴重", message: "找不到「" + SHEET_NAMES.CONFIG + "」工作表" });
      return result;
    }

    const data = sheet.getDataRange().getValues();
    result.rowCount = data.length - 1;

    // Build config map
    const config = {};
    for (let i = 1; i < data.length; i++) {
      const key = String(data[i][0] || "").trim();
      const value = data[i][1];
      if (key) config[key] = value;
    }

    // Required settings
    const requiredSettings = [
      { name: "CELEBRITIES_TO_TRACK", type: "string" },
      { name: "MODEL_ACCURACY_THRESHOLD", type: "number", min: 0, max: 1 },
      { name: "CONFIDENCE_THRESHOLD", type: "number", min: 0, max: 1 },
      { name: "SENTIMENT_STDDEV_MAX", type: "number", min: 0, max: 1 },
      { name: "TRAINING_DATA_MIN", type: "number", min: 1 }
    ];

    requiredSettings.forEach(setting => {
      if (!(setting.name in config)) {
        result.issues.push({
          severity: "嚴重",
          message: "缺少必要設定: " + setting.name
        });
      } else if (setting.type === "number") {
        const val = Number(config[setting.name]);
        if (isNaN(val)) {
          result.issues.push({
            severity: "嚴重",
            message: setting.name + " 必須為數字, 實際為 \"" + config[setting.name] + "\""
          });
        } else {
          if (setting.min !== undefined && val < setting.min) {
            result.issues.push({
              severity: "警告",
              message: setting.name + " 值 " + val + " 低於最小值 " + setting.min
            });
          }
          if (setting.max !== undefined && val > setting.max) {
            result.issues.push({
              severity: "警告",
              message: setting.name + " 值 " + val + " 高於最大值 " + setting.max
            });
          }
        }
      }
    });

    // Check CELEBRITIES_TO_TRACK has values
    if (config.CELEBRITIES_TO_TRACK) {
      const celebrities = String(config.CELEBRITIES_TO_TRACK).split(",").map(s => s.trim()).filter(s => s);
      if (celebrities.length === 0) {
        result.issues.push({
          severity: "嚴重",
          message: "CELEBRITIES_TO_TRACK 是空的"
        });
      } else {
        Logger.log("設定: 已設定 " + celebrities.length + " 位名人");
      }
    }

    result.status = result.issues.some(i => i.severity === "嚴重") ? "FAIL" :
                    result.issues.length > 0 ? "WARNING" : "OK";

    Logger.log("設定稽核: " + result.issues.length + " 個問題");

  } catch (e) {
    result.status = "ERROR";
    result.issues.push({ severity: "嚴重", message: "稽核錯誤: " + e.message });
  }

  return result;
}

// =====================================================
// MODEL METRICS AUDIT
// =====================================================

/**
 * Audit Model Metrics sheet
 * Checks: at least one run, accuracy format, status values
 */
function auditModelMetricsSheet() {
  const result = {
    sheetName: SHEET_NAMES.MODEL_METRICS,
    status: "OK",
    rowCount: 0,
    issues: []
  };

  // Load config to get accuracy threshold
  const config = loadConfig();
  const accuracyThreshold = (config.MODEL_ACCURACY_THRESHOLD || 0.85) * 100;

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAMES.MODEL_METRICS);

    if (!sheet) {
      result.status = "MISSING";
      result.issues.push({ severity: "警告", message: "找不到「" + SHEET_NAMES.MODEL_METRICS + "」工作表 (首次執行時會自動建立)" });
      return result;
    }

    const data = sheet.getDataRange().getValues();
    result.rowCount = data.length - 1;

    if (data.length <= 1) {
      result.issues.push({ severity: "警告", message: "尚無模型執行記錄" });
      return result;
    }

    const headers = data[0];
    const accuracyIdx = headers.indexOf("訓練準確度");
    const modelStatusIdx = headers.indexOf("模型狀態");
    const pipelineStatusIdx = headers.indexOf("流程狀態");

    // Check latest run (last row)
    const lastRow = data[data.length - 1];

    // Check accuracy format (should include %)
    if (accuracyIdx >= 0) {
      const accuracy = String(lastRow[accuracyIdx] || "");
      if (accuracy && !accuracy.includes("%") && accuracy !== "N/A" && accuracy !== "") {
        result.issues.push({
          severity: "警告",
          message: "最新準確度值 \"" + accuracy + "\" 缺少 % 符號"
        });
      }

      // Check if accuracy is above threshold
      const accNum = parseFloat(accuracy.replace("%", ""));
      if (!isNaN(accNum) && accNum < accuracyThreshold) {
        result.issues.push({
          severity: "警告",
          message: "最新準確度 " + accuracy + " 低於 " + accuracyThreshold + "% 門檻"
        });
      }
    }

    // Check model status
    if (modelStatusIdx >= 0) {
      const modelStatus = String(lastRow[modelStatusIdx] || "");
      if (modelStatus && modelStatus !== "通過" && modelStatus !== "擷取完成") {
        result.issues.push({
          severity: "警告",
          message: "最新模型狀態為 \"" + modelStatus + "\" (預期為 通過)"
        });
      }
    }

    // Check pipeline status
    if (pipelineStatusIdx >= 0) {
      const pipelineStatus = String(lastRow[pipelineStatusIdx] || "");
      if (pipelineStatus === "錯誤" || pipelineStatus === "失敗") {
        result.issues.push({
          severity: "嚴重",
          message: "最新流程狀態為 \"" + pipelineStatus + "\""
        });
      }
    }

    result.status = result.issues.some(i => i.severity === "嚴重") ? "FAIL" :
                    result.issues.length > 0 ? "WARNING" : "OK";

    Logger.log("模型指標稽核: " + result.rowCount + " 次執行, " + result.issues.length + " 個問題");

  } catch (e) {
    result.status = "ERROR";
    result.issues.push({ severity: "嚴重", message: "稽核錯誤: " + e.message });
  }

  return result;
}

// =====================================================
// SOURCE WEIGHTS AUDIT
// =====================================================

/**
 * Audit Source Weights sheet
 * Checks: all platforms listed, valid weights (1-10)
 */
function auditSourceWeightsSheet() {
  const result = {
    sheetName: SHEET_NAMES.SOURCE_WEIGHTS,
    status: "OK",
    rowCount: 0,
    issues: []
  };

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAMES.SOURCE_WEIGHTS);

    if (!sheet) {
      result.status = "MISSING";
      result.issues.push({ severity: "警告", message: "找不到「" + SHEET_NAMES.SOURCE_WEIGHTS + "」工作表" });
      return result;
    }

    const data = sheet.getDataRange().getValues();
    result.rowCount = data.length - 1;

    if (data.length <= 1) {
      result.issues.push({ severity: "警告", message: "「" + SHEET_NAMES.SOURCE_WEIGHTS + "」工作表是空的" });
      return result;
    }

    const headers = data[0];
    const sourceIdx = headers.indexOf("來源");
    const weightIdx = headers.indexOf("權重分數");

    const foundPlatforms = new Set();
    const duplicates = [];

    for (let i = 1; i < data.length; i++) {
      const source = String(data[i][sourceIdx >= 0 ? sourceIdx : 0] || "").trim();
      const weight = Number(data[i][weightIdx >= 0 ? weightIdx : 1]);

      if (!source) continue;

      // Check for duplicates
      if (foundPlatforms.has(source)) {
        duplicates.push(source);
      } else {
        foundPlatforms.add(source);
      }

      // Check weight range (1-10)
      if (isNaN(weight) || weight < 1 || weight > 10) {
        result.issues.push({
          severity: "警告",
          message: source + ": 權重 " + weight + " 應介於 1-10 之間"
        });
      }
    }

    // Check all platforms are listed
    VALID_PLATFORMS.forEach(platform => {
      if (!foundPlatforms.has(platform)) {
        result.issues.push({
          severity: "警告",
          message: "缺少平台: " + platform
        });
      }
    });

    if (duplicates.length > 0) {
      result.issues.push({
        severity: "警告",
        message: "發現重複的平台: " + duplicates.join(", ")
      });
    }

    result.status = result.issues.some(i => i.severity === "嚴重") ? "FAIL" :
                    result.issues.length > 0 ? "WARNING" : "OK";

    Logger.log("來源權重稽核: " + result.rowCount + " 列, " + result.issues.length + " 個問題");

  } catch (e) {
    result.status = "ERROR";
    result.issues.push({ severity: "嚴重", message: "稽核錯誤: " + e.message });
  }

  return result;
}

// =====================================================
// SOURCE CONFIG AUDIT
// =====================================================

/**
 * Audit Source Config sheet
 * Checks: auto-populated sources, valid importance scores (1-5)
 */
function auditSourceConfigSheet() {
  const result = {
    sheetName: SHEET_NAMES.SOURCE_CONFIG,
    status: "OK",
    rowCount: 0,
    issues: []
  };

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAMES.SOURCE_CONFIG);

    if (!sheet) {
      result.status = "MISSING";
      result.issues.push({ severity: "警告", message: "找不到「" + SHEET_NAMES.SOURCE_CONFIG + "」工作表 (請執行「同步來源」)" });
      return result;
    }

    const data = sheet.getDataRange().getValues();
    result.rowCount = data.length - 1;

    if (data.length <= 1) {
      result.issues.push({ severity: "警告", message: "「" + SHEET_NAMES.SOURCE_CONFIG + "」工作表是空的 (請執行「同步來源」)" });
      return result;
    }

    const headers = data[0];
    const sourceNameIdx = headers.indexOf("來源名稱");
    const importanceIdx = headers.indexOf("重要性分數");
    const platformIdx = headers.indexOf("平台");

    const seenSources = new Set();
    let invalidImportance = 0;
    let duplicateSources = 0;

    for (let i = 1; i < data.length; i++) {
      const sourceName = String(data[i][sourceNameIdx >= 0 ? sourceNameIdx : 0] || "").trim();
      const platform = String(data[i][platformIdx >= 0 ? platformIdx : 2] || "").trim();
      const importance = Number(data[i][importanceIdx >= 0 ? importanceIdx : 3]);

      if (!sourceName) continue;

      const key = `${sourceName}|${platform}`;

      // Check duplicates
      if (seenSources.has(key)) {
        duplicateSources++;
      } else {
        seenSources.add(key);
      }

      // Check importance range (1-5)
      if (isNaN(importance) || importance < 1 || importance > 5) {
        invalidImportance++;
      }
    }

    if (duplicateSources > 0) {
      result.issues.push({
        severity: "警告",
        message: "發現 " + duplicateSources + " 個重複的來源項目"
      });
    }

    if (invalidImportance > 0) {
      result.issues.push({
        severity: "警告",
        message: invalidImportance + " 個來源的重要性分數無效 (應為 1-5)"
      });
    }

    result.status = result.issues.some(i => i.severity === "嚴重") ? "FAIL" :
                    result.issues.length > 0 ? "WARNING" : "OK";

    Logger.log("來源設定稽核: " + result.rowCount + " 個來源, " + result.issues.length + " 個問題");

  } catch (e) {
    result.status = "ERROR";
    result.issues.push({ severity: "嚴重", message: "稽核錯誤: " + e.message });
  }

  return result;
}
