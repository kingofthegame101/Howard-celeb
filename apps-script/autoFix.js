/**
 * Celebrity Popularity Quantifier - Auto Fix
 * Taiwan Edition v5.0
 *
 * Functions for automatically fixing common data issues
 */

// =====================================================
// RESULTS SHEET FIXES
// =====================================================

/**
 * Add missing v5.0 columns to existing Results sheet
 * Call this if Results sheet exists but is missing newer columns
 */
function addMissingResultsColumns() {
  const ui = SpreadsheetApp.getUi();

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAMES.RESULTS);
    if (!sheet) {
      ui.alert("找不到「" + SHEET_NAMES.RESULTS + "」工作表");
      return;
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    let addedColumns = [];

    RESULTS_HEADERS.forEach((col, idx) => {
      if (!headers.includes(col)) {
        // Add column at end
        const newColIdx = sheet.getLastColumn() + 1;
        sheet.getRange(1, newColIdx).setValue(col);
        addedColumns.push(col);
      }
    });

    if (addedColumns.length > 0) {
      ui.alert("✓ 已新增 " + addedColumns.length + " 個缺少的欄位:\n\n" + addedColumns.join("\n"));
      Logger.log("已新增欄位至「" + SHEET_NAMES.RESULTS + "」: " + addedColumns.join(", "));
    } else {
      ui.alert("✓ 所有必要欄位已存在");
    }

  } catch (e) {
    ui.alert("錯誤: " + e.message);
    Logger.log("新增欄位時發生錯誤: " + e.message);
  }
}

/**
 * Auto-fix common issues in Results sheet
 * - Convert TRUE/FALSE to Yes/No
 * - Add missing trend emojis
 * - Fix empty JSON fields
 */
function fixResultsSheet() {
  const ui = SpreadsheetApp.getUi();

  const response = ui.alert(
    '🔧 修復結果工作表',
    '此操作將自動修復:\n' +
    '• 將 TRUE/FALSE 轉換為 Yes/No\n' +
    '• 補上缺少的趨勢表情符號\n' +
    '• 為空的 JSON 欄位填入 {}\n\n' +
    '是否繼續？',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAMES.RESULTS);
    if (!sheet) {
      ui.alert("找不到「" + SHEET_NAMES.RESULTS + "」工作表");
      return;
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      ui.alert("無資料需要修復");
      return;
    }

    const headers = data[0];
    const riskIdx = headers.indexOf("風險標記");
    const endorsementIdx = headers.indexOf("可代言");
    const trendIdx = headers.indexOf("趨勢方向");
    const sourceBreakdownIdx = headers.indexOf("來源分析");
    const scoreChangeIdx = headers.indexOf("分數變化分析");
    const scoreIdx = headers.indexOf("加權聲量分數");

    let fixCount = 0;

    for (let i = 1; i < data.length; i++) {
      let rowChanged = false;

      // Fix Risk_Flag: TRUE/FALSE → Yes/No
      if (riskIdx >= 0) {
        const val = String(data[i][riskIdx]).toUpperCase().trim();
        if (val === "TRUE") {
          data[i][riskIdx] = "Yes";
          rowChanged = true;
        } else if (val === "FALSE") {
          data[i][riskIdx] = "No";
          rowChanged = true;
        }
      }

      // Fix Endorsement_Ready: TRUE/FALSE → Yes/No
      if (endorsementIdx >= 0) {
        const val = String(data[i][endorsementIdx]).toUpperCase().trim();
        if (val === "TRUE") {
          data[i][endorsementIdx] = "Yes";
          rowChanged = true;
        } else if (val === "FALSE") {
          data[i][endorsementIdx] = "No";
          rowChanged = true;
        }
      }

      // Fix Trend_Direction: Add emoji if missing
      if (trendIdx >= 0) {
        const trend = String(data[i][trendIdx] || "");
        const hasEmoji = TREND_EMOJIS.some(e => trend.includes(e));

        if (!hasEmoji && trend) {
          // Try to determine direction from value or default to stable
          let newTrend = "→ 持平";

          // If we have score data, check previous row for delta
          if (scoreIdx >= 0 && i > 1) {
            const currentScore = Number(data[i][scoreIdx]);
            const prevScore = Number(data[i-1][scoreIdx]);
            const delta = currentScore - prevScore;

            if (delta > 0.15) newTrend = "🚀 快速上升";
            else if (delta > 0.05) newTrend = "↑ 上升";
            else if (delta < -0.15) newTrend = "📉 快速下降";
            else if (delta < -0.05) newTrend = "↓ 下降";
          }

          data[i][trendIdx] = newTrend;
          rowChanged = true;
        } else if (!trend) {
          data[i][trendIdx] = "→ 持平";
          rowChanged = true;
        }
      }

      // Fix Source_Breakdown: Add {} if empty
      if (sourceBreakdownIdx >= 0) {
        const val = String(data[i][sourceBreakdownIdx] || "").trim();
        if (!val) {
          data[i][sourceBreakdownIdx] = "{}";
          rowChanged = true;
        }
      }

      // Fix Score_Change_Breakdown: Add {} if empty
      if (scoreChangeIdx >= 0) {
        const val = String(data[i][scoreChangeIdx] || "").trim();
        if (!val) {
          data[i][scoreChangeIdx] = "{}";
          rowChanged = true;
        }
      }

      if (rowChanged) fixCount++;
    }

    // Write back data
    if (fixCount > 0) {
      sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    }

    ui.alert("✓ 已修復「" + SHEET_NAMES.RESULTS + "」工作表中的 " + fixCount + " 列");
    Logger.log("已修復「" + SHEET_NAMES.RESULTS + "」工作表中的 " + fixCount + " 列");

  } catch (e) {
    ui.alert("錯誤: " + e.message);
    Logger.log("修復時發生錯誤: " + e.message);
  }
}

// =====================================================
// RAW DATA SHEET FIXES
// =====================================================

/**
 * Auto-fix common issues in Raw Data sheet
 * - Normalize platform names
 * - Trim whitespace from text fields
 */
function fixRawDataSheet() {
  const ui = SpreadsheetApp.getUi();

  const response = ui.alert(
    '🔧 修復原始資料工作表',
    '此操作將自動修復:\n' +
    '• 標準化平台名稱 (instagram → Instagram)\n' +
    '• 清除文字欄位前後空白\n\n' +
    '是否繼續？',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAMES.RAW_DATA);
    if (!sheet) {
      ui.alert("找不到「" + SHEET_NAMES.RAW_DATA + "」工作表");
      return;
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      ui.alert("無資料需要修復");
      return;
    }

    // Use dynamic header lookup instead of hardcoded indices (繁體中文)
    const headers = data[0];
    const platformIdx = headers.indexOf("平台");
    const celebrityIdx = headers.indexOf("名人");

    if (platformIdx === -1 || celebrityIdx === -1) {
      ui.alert("錯誤: 找不到必要欄位。預期: 平台、名人");
      return;
    }

    let fixCount = 0;

    for (let i = 1; i < data.length; i++) {
      let rowChanged = false;

      // Fix platform names
      const platform = String(data[i][platformIdx] || "").trim().toLowerCase();
      if (PLATFORM_NAME_MAP[platform] && data[i][platformIdx] !== PLATFORM_NAME_MAP[platform]) {
        data[i][platformIdx] = PLATFORM_NAME_MAP[platform];
        rowChanged = true;
      }

      // Trim celebrity name
      const celebrity = String(data[i][celebrityIdx] || "").trim();
      if (celebrity !== data[i][celebrityIdx]) {
        data[i][celebrityIdx] = celebrity;
        rowChanged = true;
      }

      if (rowChanged) fixCount++;
    }

    // Write back data
    if (fixCount > 0) {
      sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    }

    ui.alert("✓ 已修復「" + SHEET_NAMES.RAW_DATA + "」工作表中的 " + fixCount + " 列");
    Logger.log("已修復「" + SHEET_NAMES.RAW_DATA + "」工作表中的 " + fixCount + " 列");

  } catch (e) {
    ui.alert("錯誤: " + e.message);
    Logger.log("修復時發生錯誤: " + e.message);
  }
}

// =====================================================
// SOURCE WEIGHTS FIXES
// =====================================================

/**
 * Fix Source Weights sheet - adds missing platforms
 */
function fixSourceWeights() {
  const ui = SpreadsheetApp.getUi();

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAMES.SOURCE_WEIGHTS);
    if (!sheet) {
      ui.alert("找不到「" + SHEET_NAMES.SOURCE_WEIGHTS + "」工作表，請先執行「初始化工作表」。");
      return;
    }

    const data = sheet.getDataRange().getValues();
    const existingSources = new Set();

    // Find existing sources
    for (let i = 1; i < data.length; i++) {
      const source = String(data[i][0] || "").trim();
      if (source) existingSources.add(source);
    }

    let added = [];

    DEFAULT_PLATFORM_WEIGHTS.forEach(([platform, weight, rationale]) => {
      if (!existingSources.has(platform)) {
        sheet.appendRow([platform, weight, rationale, new Date()]);
        added.push(platform);
      }
    });

    if (added.length > 0) {
      ui.alert("✓ 已新增缺少的平台:\n\n" + added.join("\n"));
      Logger.log("已新增平台至「" + SHEET_NAMES.SOURCE_WEIGHTS + "」: " + added.join(", "));
    } else {
      ui.alert("✓ 所有必要的平台已存在。");
    }

  } catch (e) {
    ui.alert("錯誤: " + e.message);
  }
}

// =====================================================
// RAW DATA HEADERS FIX
// =====================================================

/**
 * Fix Raw Data headers - shows current vs expected and offers to fix
 * Offers two modes:
 * - YES: Fix labels only (rename headers, don't move data)
 * - NO: Reorder columns (move data to correct positions based on header names)
 */
function fixRawDataHeaders() {
  const ui = SpreadsheetApp.getUi();

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAMES.RAW_DATA);
    if (!sheet) {
      ui.alert("找不到「" + SHEET_NAMES.RAW_DATA + "」工作表。");
      return;
    }

    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Compare headers
    let mismatches = [];
    for (let i = 0; i < RAW_DATA_HEADERS.length; i++) {
      const expected = RAW_DATA_HEADERS[i];
      const current = currentHeaders[i] || "(空白)";
      if (expected !== current) {
        mismatches.push("欄位 " + String.fromCharCode(65 + i) + ": \"" + current + "\" → \"" + expected + "\"");
      }
    }

    if (mismatches.length === 0) {
      ui.alert("✓ 所有原始資料標題皆正確！");
      return;
    }

    // Show comparison with two options
    let message = "發現 " + mismatches.length + " 個標題不符:\n\n";
    message += mismatches.slice(0, 10).join("\n");
    if (mismatches.length > 10) {
      message += "\n... 以及其他 " + (mismatches.length - 10) + " 個";
    }
    message += "\n\n 選擇修復模式:\n";
    message += "• 是 = 僅修復標籤 (標題錯誤，資料位置正確)\n";
    message += "• 否 = 重新排列欄位 (資料位置錯誤，依標題名稱移動欄位)\n";
    message += "• 取消 = 中止";

    const response = ui.alert("🔧 修復原始資料標題", message, ui.ButtonSet.YES_NO_CANCEL);

    if (response === ui.Button.CANCEL) {
      ui.alert("已取消，未做任何變更。");
      return;
    }

    if (response === ui.Button.YES) {
      // Fix labels only (original behavior)
      sheet.getRange(1, 1, 1, RAW_DATA_HEADERS.length).setValues([RAW_DATA_HEADERS]);
      ui.alert("✓ 已更新 " + mismatches.length + " 個標題以符合預期架構。\n\n注意: 資料未被移動。若資料在錯誤的欄位中，請再次執行並選擇「否」。");
      Logger.log("已修復原始資料標題 (僅標籤): " + mismatches.length + " 欄位已更新");
    } else if (response === ui.Button.NO) {
      // Reorder columns
      reorderRawDataColumns();
    }

  } catch (e) {
    ui.alert("錯誤: " + e.message);
  }
}

/**
 * Reorder Raw Data columns to match expected schema
 * Moves data to correct positions based on header names
 */
function reorderRawDataColumns() {
  const ui = SpreadsheetApp.getUi();

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAMES.RAW_DATA);
    if (!sheet) {
      ui.alert("找不到「" + SHEET_NAMES.RAW_DATA + "」工作表。");
      return;
    }

    const data = sheet.getDataRange().getValues();
    if (data.length === 0) {
      ui.alert("「" + SHEET_NAMES.RAW_DATA + "」工作表無資料。");
      return;
    }

    const currentHeaders = data[0];

    // Build position map: header name → current column index
    const headerPositions = {};
    for (let i = 0; i < currentHeaders.length; i++) {
      const header = String(currentHeaders[i] || "").trim();
      if (header) {
        headerPositions[header] = i;
      }
    }

    // Build reorder plan and preview
    const reorderPlan = [];
    const preview = [];
    let hasChanges = false;

    for (let targetIdx = 0; targetIdx < RAW_DATA_HEADERS.length; targetIdx++) {
      const expectedHeader = RAW_DATA_HEADERS[targetIdx];
      const currentIdx = headerPositions[expectedHeader];

      if (currentIdx !== undefined && currentIdx !== targetIdx) {
        preview.push(expectedHeader + ": 欄位 " + String.fromCharCode(65 + currentIdx) + " → 欄位 " + String.fromCharCode(65 + targetIdx));
        hasChanges = true;
      } else if (currentIdx === undefined) {
        preview.push(expectedHeader + ": (缺少) → 欄位 " + String.fromCharCode(65 + targetIdx) + " [將為空白]");
        hasChanges = true;
      }

      reorderPlan.push({
        targetIdx: targetIdx,
        sourceIdx: currentIdx, // undefined if column not found
        header: expectedHeader
      });
    }

    if (!hasChanges) {
      ui.alert("✓ 所有欄位已在正確位置！");
      return;
    }

    // Show preview
    let previewMsg = "欄位移動:\n\n" + preview.slice(0, 15).join("\n");
    if (preview.length > 15) {
      previewMsg += "\n... 以及其他 " + (preview.length - 15) + " 個";
    }
    previewMsg += "\n\n此操作將重寫全部 " + (data.length - 1) + " 列資料。\n\n是否繼續？";

    const confirm = ui.alert("🔄 重新排列欄位預覽", previewMsg, ui.ButtonSet.YES_NO);
    if (confirm !== ui.Button.YES) {
      ui.alert("已取消，未做任何變更。");
      return;
    }

    // Reorder all rows
    const reorderedData = [];

    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      const oldRow = data[rowIdx];
      const newRow = [];

      for (let colIdx = 0; colIdx < RAW_DATA_HEADERS.length; colIdx++) {
        const plan = reorderPlan[colIdx];
        if (rowIdx === 0) {
          // Header row: use expected header name
          newRow.push(plan.header);
        } else {
          // Data row: copy from source column or empty
          if (plan.sourceIdx !== undefined) {
            newRow.push(oldRow[plan.sourceIdx]);
          } else {
            newRow.push(""); // Column doesn't exist in source
          }
        }
      }

      reorderedData.push(newRow);
    }

    // Clear and rewrite sheet
    sheet.clear();
    if (reorderedData.length > 0) {
      sheet.getRange(1, 1, reorderedData.length, reorderedData[0].length).setValues(reorderedData);
    }

    ui.alert("✓ 已重新排列 " + preview.length + " 個欄位。\n\n全部 " + (data.length - 1) + " 列資料已重新對應至正確位置。");
    Logger.log("已重新排列原始資料欄位: " + preview.length + " 欄位已移動, " + (data.length - 1) + " 列已處理");

  } catch (e) {
    ui.alert("錯誤: " + e.message);
    Logger.log("重新排列時發生錯誤: " + e.message);
  }
}
