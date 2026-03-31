/**
 * Celebrity Popularity Quantifier - System Reset
 * Taiwan Edition v5.0
 *
 * Functions to reset system to initial state for presentations
 */

/**
 * Reboot system to clean state for presentations
 * Clears all data sheets and resets config to defaults
 */
function reboot() {
  const ui = SpreadsheetApp.getUi();

  // 1. Confirm with user
  const response = ui.alert(
    '🔄 系統重置 (Reboot)',
    '此操作將清除所有資料並重置系統設定：\n\n' +
    '• 清除 Raw Data (所有貼文)\n' +
    '• 清除 Results (所有排名)\n' +
    '• 清除 Feedback History (所有回饋)\n' +
    '• 清除 Model Metrics (所有執行記錄)\n' +
    '• 清除 Source Config (所有來源評分)\n' +
    '• 重置 Config (預設設定)\n' +
    '• 重置 Source Weights (預設權重)\n\n' +
    '確定要繼續嗎？',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    ui.alert('已取消重置');
    return;
  }

  // 2. Execute reset
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);

    // Clear data sheets (keep headers)
    clearDataSheet(ss, SHEET_NAMES.RAW_DATA);
    clearDataSheet(ss, SHEET_NAMES.RESULTS);
    clearDataSheet(ss, SHEET_NAMES.FEEDBACK_HISTORY);
    clearDataSheet(ss, SHEET_NAMES.MODEL_METRICS);
    clearDataSheet(ss, SHEET_NAMES.SOURCE_CONFIG);

    // Reset config sheets to defaults
    resetConfigSheet(ss);
    resetSourceWeightsSheet(ss);

    // Show success
    ui.alert(
      '✓ 系統重置完成',
      '系統已重置為初始狀態，可開始進行簡報展示。',
      ui.ButtonSet.OK
    );

    Logger.log('System reboot completed at ' + new Date().toISOString());

  } catch (e) {
    ui.alert('重置失敗: ' + e.message);
    Logger.log('Reboot failed: ' + e.message);
  }
}

/**
 * Clear a data sheet (keep header row)
 * @param {Spreadsheet} ss - Spreadsheet object
 * @param {string} sheetName - Name of sheet to clear
 */
function clearDataSheet(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log('找不到工作表: ' + sheetName);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  Logger.log('已清除: ' + sheetName);
}

/**
 * Reset Config sheet to defaults
 * @param {Spreadsheet} ss - Spreadsheet object
 */
function resetConfigSheet(ss) {
  const sheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
  if (!sheet) return;

  sheet.clear();

  const now = new Date();
  const data = [
    CONFIG_HEADERS,
    ["CELEBRITIES_TO_TRACK", "蔡依林, 王心凌, 柯震東, 林俊傑, 五月天", "要追蹤的名人清單", now],
    ["MODEL_ACCURACY_THRESHOLD", "0.85", "模型準確度低於此值時發出警告", now],
    ["CONFIDENCE_THRESHOLD", "0.70", "可信度高於此值時可代言", now],
    ["SENTIMENT_STDDEV_MAX", "0.25", "最大情感波動度", now],
    ["DATA_RETENTION_DAYS", "30", "歷史資料保留天數", now],
    ["TRAINING_DATA_MIN", "200", "重新訓練所需最少回饋樣本數", now]
  ];

  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  Logger.log('已重置: ' + SHEET_NAMES.CONFIG);
}

/**
 * Reset Source Weights sheet to defaults
 * @param {Spreadsheet} ss - Spreadsheet object
 */
function resetSourceWeightsSheet(ss) {
  const sheet = ss.getSheetByName(SHEET_NAMES.SOURCE_WEIGHTS);
  if (!sheet) return;

  sheet.clear();

  const now = new Date();
  const data = [
    SOURCE_WEIGHTS_HEADERS,
    ["TikTok", 10, "最高觸及率；病毒式傳播潛力", now],
    ["Instagram", 9, "視覺互動；年輕族群", now],
    ["YouTube", 8, "長篇內容；深度互動", now],
    ["Facebook", 7, "廣泛觸及；年長族群", now],
    ["News", 6, "可信度；媒體報導", now]
  ];

  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  Logger.log('已重置: ' + SHEET_NAMES.SOURCE_WEIGHTS);
}
