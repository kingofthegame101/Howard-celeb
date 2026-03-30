/**
 * Celebrity Popularity Quantifier - Source Sync
 * Taiwan Edition v5.0
 *
 * Functions for syncing sources and celebrities to config sheets
 */

// =====================================================
// SOURCE SYNC
// =====================================================

/**
 * Sync discovered sources to Source Config sheet
 * Auto-discovers new sources from Raw Data and adds them with default rating
 */
function syncSourcesToConfig() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // Get or create Source Config sheet
  let sourceConfigSheet = ss.getSheetByName(SHEET_NAMES.SOURCE_CONFIG);
  if (!sourceConfigSheet) {
    sourceConfigSheet = ss.insertSheet(SHEET_NAMES.SOURCE_CONFIG);
    sourceConfigSheet.appendRow(SOURCE_CONFIG_HEADERS);
  }

  // Get existing sources (Source_Name + Platform as composite key)
  const existingData = sourceConfigSheet.getDataRange().getValues();
  const existingSources = new Set();

  // Skip header row
  for (let i = 1; i < existingData.length; i++) {
    const sourceName = existingData[i][0];
    const platform = existingData[i][2];
    if (sourceName && platform) {
      existingSources.add(`${sourceName}|${platform}`);
    }
  }

  // Get Raw Data sheet
  const rawDataSheet = ss.getSheetByName(SHEET_NAMES.RAW_DATA);
  if (!rawDataSheet) {
    Logger.log("警告: 找不到「" + SHEET_NAMES.RAW_DATA + "」工作表");
    return;
  }

  const rawData = rawDataSheet.getDataRange().getValues();
  if (rawData.length <= 1) {
    Logger.log("「" + SHEET_NAMES.RAW_DATA + "」工作表無資料");
    return;
  }

  // Find column indices dynamically using header names (繁體中文)
  const headers = rawData[0];
  const accountNameCol = headers.indexOf("帳號名稱");
  const platformCol = headers.indexOf("平台");
  const accountTypeCol = headers.indexOf("帳號類型");

  if (accountNameCol === -1 || platformCol === -1) {
    Logger.log("警告: 在「" + SHEET_NAMES.RAW_DATA + "」中找不到必要欄位");
    return;
  }

  // Discover new sources
  const newSources = new Map(); // Map to avoid duplicates in same run
  const now = new Date();

  for (let i = 1; i < rawData.length; i++) {
    const accountName = rawData[i][accountNameCol];
    const platform = rawData[i][platformCol];
    const accountType = accountTypeCol >= 0 ? (rawData[i][accountTypeCol] || "unknown") : "unknown";

    if (!accountName || !platform) continue;

    const key = `${accountName}|${platform}`;

    // Skip if already exists in Source Config
    if (existingSources.has(key)) continue;

    // Skip if already found in this run
    if (newSources.has(key)) continue;

    // Map account_type to source_type for display
    let sourceType = "其他";
    if (accountType === "official") sourceType = "官方";
    else if (accountType === "fan") sourceType = "粉絲";
    else if (accountType === "media") sourceType = "媒體";

    newSources.set(key, {
      name: accountName,
      type: sourceType,
      platform: platform
    });
  }

  // Batch add new sources with default importance score of 3
  if (newSources.size > 0) {
    const newRows = [];

    newSources.forEach((source, key) => {
      newRows.push([
        source.name,           // 來源名稱
        source.type,           // 來源類型
        source.platform,       // 平台
        3,                     // 重要性分數 (預設: 中性)
        "auto",                // 評分者
        now                    // 最後修改
      ]);
    });

    // Append all new sources at once
    const startRow = sourceConfigSheet.getLastRow() + 1;
    sourceConfigSheet.getRange(startRow, 1, newRows.length, 6).setValues(newRows);

    Logger.log("✓ 已新增 " + newRows.length + " 個來源至「" + SHEET_NAMES.SOURCE_CONFIG + "」");
  } else {
    Logger.log("無新來源需要新增");
  }
}

// =====================================================
// CELEBRITY SYNC
// =====================================================

/**
 * Sync CELEBRITIES_TO_TRACK in Config sheet with celebrities found in Raw Data
 * This ensures Config matches the actual data collected
 */
function syncCelebritiesToConfig() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // Get all unique celebrities from Raw Data
  const rawDataSheet = ss.getSheetByName(SHEET_NAMES.RAW_DATA);
  if (!rawDataSheet || rawDataSheet.getLastRow() <= 1) {
    ui.alert("「" + SHEET_NAMES.RAW_DATA + "」工作表無資料");
    return;
  }

  const rawData = rawDataSheet.getDataRange().getValues();
  const celebrities = new Set();

  // Dynamic column lookup for Celebrity (繁體中文)
  const headers = rawData[0];
  const celebrityIdx = headers.indexOf("名人");
  if (celebrityIdx === -1) {
    ui.alert("錯誤: 在「" + SHEET_NAMES.RAW_DATA + "」工作表找不到「名人」欄位");
    return;
  }

  for (let i = 1; i < rawData.length; i++) {
    const celeb = String(rawData[i][celebrityIdx] || "").trim();
    if (celeb) {
      celebrities.add(celeb);
    }
  }

  const celebList = Array.from(celebrities).sort();
  Logger.log("在「" + SHEET_NAMES.RAW_DATA + "」找到 " + celebList.length + " 位不重複名人");

  // Get current Config
  const configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
  if (!configSheet) {
    ui.alert("找不到「" + SHEET_NAMES.CONFIG + "」工作表，請先執行「初始化工作表」");
    return;
  }

  const configData = configSheet.getDataRange().getValues();
  let celebRowIndex = -1;
  let currentCelebs = [];

  for (let i = 1; i < configData.length; i++) {
    if (configData[i][0] === "CELEBRITIES_TO_TRACK") {
      celebRowIndex = i + 1; // 1-indexed for sheet
      currentCelebs = String(configData[i][1] || "").split(",").map(s => s.trim()).filter(s => s);
      break;
    }
  }

  // Show comparison
  const newCelebs = celebList.filter(c => !currentCelebs.includes(c));
  const removedCelebs = currentCelebs.filter(c => !celebList.includes(c));

  let message = "📊 名人同步分析\n\n";
  message += "目前設定: " + currentCelebs.length + " 位名人\n";
  message += "原始資料: " + celebList.length + " 位名人\n\n";

  if (newCelebs.length > 0) {
    message += "➕ 新增 (" + newCelebs.length + "): " + newCelebs.slice(0, 10).join(", ");
    if (newCelebs.length > 10) message += "... 以及其他 " + (newCelebs.length - 10) + " 位";
    message += "\n\n";
  }

  if (removedCelebs.length > 0) {
    message += "➖ 設定中有但無資料 (" + removedCelebs.length + "): " + removedCelebs.join(", ") + "\n\n";
  }

  if (newCelebs.length === 0 && removedCelebs.length === 0) {
    ui.alert("✅ 設定已與原始資料同步");
    return;
  }

  message += "是否更新設定以符合原始資料？";

  const response = ui.alert("🔄 同步名人", message, ui.ButtonSet.YES_NO);

  if (response !== ui.Button.YES) {
    ui.alert("已取消，未做任何變更。");
    return;
  }

  // Update Config sheet
  const newValue = celebList.join(", ");

  if (celebRowIndex > 0) {
    // Update existing row
    configSheet.getRange(celebRowIndex, 2).setValue(newValue);
    configSheet.getRange(celebRowIndex, 4).setValue(new Date()); // Update 最後更新
  } else {
    // Add new row
    configSheet.appendRow(["CELEBRITIES_TO_TRACK", newValue, "要追蹤的名人清單", new Date()]);
  }

  ui.alert("✅ 已更新 CELEBRITIES_TO_TRACK\n\n目前追蹤 " + celebList.length + " 位名人。\n\n每日觸發器將會擷取這些名人的資料。");
  Logger.log("已更新 CELEBRITIES_TO_TRACK，共 " + celebList.length + " 位名人");
}
