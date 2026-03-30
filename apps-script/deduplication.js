/**
 * Celebrity Popularity Quantifier - Deduplication
 * Taiwan Edition v5.0
 *
 * Functions for detecting and removing duplicate posts
 */

// =====================================================
// POST KEY GENERATION
// =====================================================

/**
 * Generate a unique key for a post (used for deduplication)
 * Primary key: Post URL (most reliable unique identifier)
 * Fallback: Celebrity + Platform + Account + Content (for posts without URL)
 * @param {string} postUrl - Post URL (Column G)
 * @param {string} celebrity - Celebrity name (fallback)
 * @param {string} platform - Platform name (fallback)
 * @param {string} accountName - Account name (fallback)
 * @param {string} content - Post content (fallback)
 * @returns {string} Unique key
 */
function generatePostKey(postUrl, celebrity, platform, accountName, content) {
  // Primary: Use URL if available and not placeholder
  const url = String(postUrl || '').trim();
  if (url && url !== '#' && url !== '' && url.startsWith('http')) {
    return `url:${url}`;
  }

  // Fallback: Use content fingerprint for posts without valid URL
  const contentFingerprint = String(content || '').substring(0, 100).trim().toLowerCase();
  return `content:${celebrity}|${platform}|${accountName}|${contentFingerprint}`;
}

// =====================================================
// EXISTING KEYS LOADER
// =====================================================

/**
 * Load existing post keys from Raw Data sheet for deduplication
 * @returns {Set} Set of existing post keys
 */
function loadExistingPostKeys() {
  const existingKeys = new Set();

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAMES.RAW_DATA);
    if (!sheet || sheet.getLastRow() <= 1) {
      return existingKeys;
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Dynamic column lookup using header names (繁體中文)
    const celebrityIdx = headers.indexOf("名人");
    const platformIdx = headers.indexOf("平台");
    const accountIdx = headers.indexOf("帳號名稱");
    const contentIdx = headers.indexOf("貼文內容");
    const urlIdx = headers.indexOf("貼文網址");

    // Validate required columns exist
    if (celebrityIdx === -1 || platformIdx === -1 || urlIdx === -1) {
      Logger.log("警告: 找不到去重複所需的欄位，使用備用索引。");
      // Fallback to expected positions from RAW_DATA_HEADERS schema
      const fallbackCelebrity = 1, fallbackPlatform = 2, fallbackAccount = 3, fallbackContent = 4, fallbackUrl = 6;

      for (let i = 1; i < data.length; i++) {
        const key = generatePostKey(
          data[i][fallbackUrl] || '',
          data[i][fallbackCelebrity] || '',
          data[i][fallbackPlatform] || '',
          data[i][fallbackAccount] || '',
          data[i][fallbackContent] || ''
        );
        existingKeys.add(key);
      }
    } else {
      // Use dynamic indices
      for (let i = 1; i < data.length; i++) {
        const celebrity = data[i][celebrityIdx] || '';
        const platform = data[i][platformIdx] || '';
        const accountName = accountIdx >= 0 ? (data[i][accountIdx] || '') : '';
        const content = contentIdx >= 0 ? (data[i][contentIdx] || '') : '';
        const postUrl = data[i][urlIdx] || '';

        const key = generatePostKey(postUrl, celebrity, platform, accountName, content);
        existingKeys.add(key);
      }
    }

    Logger.log("已載入 " + existingKeys.size + " 個現有貼文金鑰用於去重複");

  } catch (e) {
    Logger.log("警告: 無法載入現有貼文進行去重複: " + e.message);
  }

  return existingKeys;
}

// =====================================================
// BATCH DEDUPLICATION
// =====================================================

/**
 * Filter out duplicate posts before insertion
 * @param {Array} posts - Array of post objects from API
 * @param {string} celebrity - Celebrity name
 * @param {Set} existingKeys - Set of existing post keys
 * @returns {Array} Filtered posts (duplicates removed)
 */
function deduplicatePosts(posts, celebrity, existingKeys) {
  if (!posts || posts.length === 0) return [];

  const uniquePosts = [];
  let duplicateCount = 0;

  for (const post of posts) {
    const key = generatePostKey(
      post.post_url || '',      // Primary: URL
      celebrity,                 // Fallback params
      post.platform || '',
      post.account_name || '',
      post.content || ''
    );

    if (existingKeys.has(key)) {
      duplicateCount++;
      continue;
    }

    // Add to existing keys to prevent duplicates within same batch
    existingKeys.add(key);
    uniquePosts.push(post);
  }

  if (duplicateCount > 0) {
    Logger.log("  已過濾 " + duplicateCount + " 筆重複貼文 (" + celebrity + ")");
  }

  return uniquePosts;
}

// =====================================================
// INTERACTIVE DEDUPLICATION
// =====================================================

/**
 * Remove duplicate posts from Raw Data sheet
 * Keeps the first occurrence, removes subsequent duplicates
 * @returns {Object} Summary of deduplication results
 */
function deduplicateExistingData() {
  const ui = SpreadsheetApp.getUi();

  // Confirm before running
  const response = ui.alert(
    '🧹 移除重複資料',
    '此操作將掃描原始資料工作表並移除重複的貼文。\n\n重複判斷依據: 貼文網址 (主要) 或 名人 + 平台 + 帳號 + 內容 (備用)\n\n是否繼續？',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    ui.alert('操作已取消。');
    return;
  }

  const startTime = new Date().getTime();

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAMES.RAW_DATA);
    if (!sheet) {
      ui.alert('錯誤: 找不到「' + SHEET_NAMES.RAW_DATA + '」工作表。');
      return;
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      ui.alert('無資料需要去重複。');
      return;
    }

    const header = data[0];
    const seenKeys = new Set();
    const uniqueRows = [header]; // Keep header
    const duplicateRows = [];

    // Dynamic column lookup using header names (繁體中文)
    const celebrityIdx = header.indexOf("名人");
    const platformIdx = header.indexOf("平台");
    const accountIdx = header.indexOf("帳號名稱");
    const contentIdx = header.indexOf("貼文內容");
    const urlIdx = header.indexOf("貼文網址");

    // Validate required columns exist
    if (celebrityIdx === -1 || platformIdx === -1 || urlIdx === -1) {
      ui.alert("錯誤: 找不到必要欄位 (名人、平台、貼文網址)。請先執行「修復原始資料標題」。");
      return;
    }

    // Process each row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const celebrity = row[celebrityIdx] || '';
      const platform = row[platformIdx] || '';
      const accountName = accountIdx >= 0 ? (row[accountIdx] || '') : '';
      const content = contentIdx >= 0 ? (row[contentIdx] || '') : '';
      const postUrl = row[urlIdx] || '';

      const key = generatePostKey(postUrl, celebrity, platform, accountName, content);

      if (seenKeys.has(key)) {
        duplicateRows.push(i + 1); // Store 1-indexed row number
      } else {
        seenKeys.add(key);
        uniqueRows.push(row);
      }
    }

    const duplicateCount = data.length - uniqueRows.length;

    if (duplicateCount === 0) {
      ui.alert('✓ 未發現重複資料！\n\n您的資料已是乾淨的。');
      return { removed: 0, remaining: uniqueRows.length - 1 };
    }

    // Clear sheet and rewrite unique data
    sheet.clear();
    if (uniqueRows.length > 0) {
      sheet.getRange(1, 1, uniqueRows.length, uniqueRows[0].length).setValues(uniqueRows);
    }

    const totalTime = Math.round((new Date().getTime() - startTime) / 1000);

    const summary = "✓ 去重複完成！\n\n" +
      "• 已移除重複: " + duplicateCount + " 筆\n" +
      "• 剩餘不重複貼文: " + (uniqueRows.length - 1) + " 筆\n" +
      "• 耗時: " + totalTime + " 秒";

    ui.alert(summary);
    Logger.log(summary);

    return {
      removed: duplicateCount,
      remaining: uniqueRows.length - 1,
      timeSeconds: totalTime
    };

  } catch (e) {
    const errorMsg = "去重複時發生錯誤: " + e.message;
    ui.alert(errorMsg);
    Logger.log(errorMsg);
    throw e;
  }
}

// =====================================================
// SILENT DEDUPLICATION
// =====================================================

/**
 * Standalone deduplication function (no UI prompts)
 * For use in scripts or API calls
 */
function deduplicateRawDataSilent() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAMES.RAW_DATA);
  if (!sheet || sheet.getLastRow() <= 1) {
    Logger.log("無資料需要去重複");
    return { removed: 0, remaining: 0 };
  }

  const data = sheet.getDataRange().getValues();
  const header = data[0];
  const seenKeys = new Set();
  const uniqueRows = [header];

  // Dynamic column lookup using header names with fallback to expected positions (繁體中文)
  const celebrityIdx = header.indexOf("名人") >= 0 ? header.indexOf("名人") : 1;
  const platformIdx = header.indexOf("平台") >= 0 ? header.indexOf("平台") : 2;
  const accountIdx = header.indexOf("帳號名稱") >= 0 ? header.indexOf("帳號名稱") : 3;
  const contentIdx = header.indexOf("貼文內容") >= 0 ? header.indexOf("貼文內容") : 4;
  const urlIdx = header.indexOf("貼文網址") >= 0 ? header.indexOf("貼文網址") : 6;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const key = generatePostKey(
      row[urlIdx] || '',
      row[celebrityIdx] || '',
      row[platformIdx] || '',
      row[accountIdx] || '',
      row[contentIdx] || ''
    );

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueRows.push(row);
    }
  }

  const duplicateCount = data.length - uniqueRows.length;

  if (duplicateCount > 0) {
    sheet.clear();
    sheet.getRange(1, 1, uniqueRows.length, uniqueRows[0].length).setValues(uniqueRows);
    Logger.log("已移除 " + duplicateCount + " 筆重複。剩餘 " + (uniqueRows.length - 1) + " 筆不重複貼文。");
  }

  return { removed: duplicateCount, remaining: uniqueRows.length - 1 };
}
