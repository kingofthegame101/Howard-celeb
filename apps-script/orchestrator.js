/**
 * Celebrity Popularity Quantifier - Orchestrator
 * Taiwan Edition v5.0
 *
 * Main orchestration for daily social media data fetching via SerpAPI
 * Triggered daily at 06:00 UTC+8
 *
 * Note: This file has been modularized. Supporting functions are in:
 * - constants.gs: Shared constants
 * - config.gs: Configuration loading
 * - perplexityApi.gs: SerpAPI integration
 * - deduplication.gs: Duplicate detection
 * - logging.gs: Logging and alerts
 * - triggers.gs: Trigger management
 * - sourceSync.gs: Source synchronization
 * - sheetHelpers.gs: Sheet utilities
 * - audit.gs: Data validation
 * - autoFix.gs: Auto-repair functions
 * - testing.gs: Test utilities
 */

// =====================================================
// MAIN ENTRY POINT
// =====================================================

/**
 * MAIN ENTRY POINT
 * Triggered daily at 06:00 UTC+8 by Google Apps Script time-based trigger
 */
function fetchTaiwanSocialMedia() {
  // Each execution processes one celebrity, rotating through the list
  const config = loadConfig();
  const celebrities = config.CELEBRITIES_TO_TRACK;

  if (!celebrities || celebrities.length === 0) {
    Logger.log("No celebrities configured.");
    return;
  }

  // Get the next celebrity index from Script Properties
  const props = PropertiesService.getScriptProperties();
  const currentIndex = parseInt(props.getProperty("FETCH_CELEBRITY_INDEX") || "0");
  const celebrity = celebrities[currentIndex % celebrities.length];

  // Advance index for next execution
  props.setProperty("FETCH_CELEBRITY_INDEX", String((currentIndex + 1) % celebrities.length));

  Logger.log(`Daily fetch: ${celebrity} (${currentIndex % celebrities.length + 1}/${celebrities.length})`);

  try {
    const result = fetchOneCelebrity(celebrity);
    Logger.log(`Daily fetch complete for ${celebrity}: ${result.postsAdded} posts added`);
  } catch (e) {
    Logger.log(`CRITICAL: ${e.message}`);
    sendErrorAlert(e);
  }
}

// =====================================================
// SINGLE CELEBRITY FETCH
// =====================================================

/**
 * Fetch data for a single celebrity by name
 * @param {string} celebrity - Celebrity name in Traditional Chinese
 * @returns {Object} Result summary
 */
function fetchOneCelebrity(celebrity) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log("Pipeline already running, skipping this execution");
    return { postsAdded: 0, error: "Pipeline locked" };
  }

  try {
    const apiKey = getSerpApiKey();
    if (!apiKey) {
      throw new Error("SERPAPI_API_KEY not found in Script Properties");
    }

    const sheet = getSheetSafe(SHEET_ID, SHEET_NAMES.RAW_DATA);
    const existingKeys = loadExistingPostKeys();

    Logger.log(`Fetching data for: ${celebrity}`);
    const posts = querySerpAPI(celebrity, apiKey);
    const validated = validateSerpApiResponse(posts, celebrity);
    const uniquePosts = deduplicatePosts(validated, celebrity, existingKeys);
    const duplicatesFiltered = validated.length - uniquePosts.length;

    let totalAdded = 0;
    if (uniquePosts.length > 0) {
      const batchData = uniquePosts.map(post => [
        new Date(),
        celebrity,
        post.platform,
        post.account_name,
        post.content,
        post.post_url,
        post.post_timestamp,
        post.account_type || "unknown",
        "", "", "", ""
      ]);

      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, batchData.length, batchData[0].length).setValues(batchData);
      totalAdded = uniquePosts.length;
    }

    Logger.log(`✓ Added ${totalAdded} posts for ${celebrity} (${duplicatesFiltered} duplicates filtered)`);

    updateLogSheet({
      timestamp: new Date(),
      total_posts: totalAdded,
      celebrities_processed: 1,
      errors: "None"
    });

    try { syncSourcesToConfig(); } catch (e) {
      Logger.log(`Warning: Failed to sync sources: ${e.message}`);
    }

    return { postsAdded: totalAdded, duplicatesFiltered: duplicatesFiltered };

  } catch (e) {
    Logger.log(`Error fetching ${celebrity}: ${e.message}`);
    return { postsAdded: 0, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

// =====================================================
// CELEBRITY SELECTOR DIALOG
// =====================================================

/**
 * Show a dialog for the user to select which celebrity to fetch
 * Called from the CPQ menu
 */
function showCelebritySelector() {
  const config = loadConfig();
  const celebrities = config.CELEBRITIES_TO_TRACK;

  const options = celebrities.map(c =>
    `<option value="${c}">${c}</option>`
  ).join("\n");

  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; padding: 16px; }
      h3 { margin: 0 0 12px 0; color: #333; }
      select { width: 100%; padding: 8px; font-size: 14px; margin-bottom: 16px; }
      .btn-row { display: flex; gap: 8px; justify-content: flex-end; }
      button {
        padding: 8px 20px; font-size: 14px; border: none;
        border-radius: 4px; cursor: pointer;
      }
      .btn-primary { background: #1a73e8; color: white; }
      .btn-primary:hover { background: #1557b0; }
      .btn-cancel { background: #f1f3f4; color: #333; }
      .btn-cancel:hover { background: #dadce0; }
      #status { margin-top: 12px; font-size: 13px; color: #666; display: none; }
    </style>

    <h3>選擇名人擷取資料</h3>
    <select id="celebrity">
      ${options}
    </select>
    <div class="btn-row">
      <button class="btn-cancel" onclick="google.script.host.close()">取消</button>
      <button class="btn-primary" id="fetchBtn" onclick="doFetch()">開始擷取</button>
    </div>
    <div id="status"></div>

    <script>
      function doFetch() {
        var celebrity = document.getElementById('celebrity').value;
        var btn = document.getElementById('fetchBtn');
        var status = document.getElementById('status');
        btn.disabled = true;
        btn.textContent = '擷取中...';
        status.style.display = 'block';
        status.textContent = '正在擷取 ' + celebrity + ' 的資料，請稍候...';

        google.script.run
          .withSuccessHandler(function(result) {
            status.textContent = '✓ 完成！新增 ' + result.postsAdded + ' 則貼文' +
              (result.duplicatesFiltered ? '（過濾 ' + result.duplicatesFiltered + ' 則重複）' : '');
            status.style.color = '#1e8e3e';
            btn.textContent = '完成';
          })
          .withFailureHandler(function(err) {
            status.textContent = '✗ 錯誤: ' + err.message;
            status.style.color = '#d93025';
            btn.disabled = false;
            btn.textContent = '重試';
          })
          .fetchOneCelebrity(celebrity);
      }
    </script>
  `)
    .setWidth(360)
    .setHeight(220);

  SpreadsheetApp.getUi().showModalDialog(html, '擷取名人資料');
}

// =====================================================
// GOOGLE SHEETS MENU
// =====================================================

/**
 * Add custom menu to Google Sheets UI
 * Runs automatically when spreadsheet is opened
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎬 CPQ 工具')
    .addItem('🔍 擷取名人資料', 'showCelebritySelector')
    .addItem('🧹 移除重複資料', 'deduplicateExistingData')
    .addItem('📊 新聞評分', 'triggerKaggleSentimentAnalysis')
    .addItem('📋 顯示儀表板', 'showDashboard')
    .addToUi();
}
