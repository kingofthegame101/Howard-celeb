/**
 * Celebrity Popularity Quantifier - Kaggle API Integration
 * Taiwan Edition v5.0
 *
 * Functions to trigger Kaggle sentiment analysis notebook via API
 */

// Kaggle API Configuration
const KAGGLE_API_URL = "https://www.kaggle.com/api/v1";
const KAGGLE_KERNEL_ID = "howardleeeeee/celebrity-popularity-quantifier-taiwan";

/**
 * Get Kaggle credentials from Script Properties
 * @returns {Object} {username, apiKey}
 */
function getKaggleCredentials() {
  const props = PropertiesService.getScriptProperties();
  return {
    username: props.getProperty('KAGGLE_USERNAME') || 'howardleeeeee',
    apiKey: props.getProperty('KAGGLE_API_KEY')
  };
}

/**
 * Trigger the Kaggle sentiment analysis notebook
 * Called from CPQ Tools menu
 */
function triggerKaggleSentimentAnalysis() {
  const ui = SpreadsheetApp.getUi();

  // Confirm with user
  const response = ui.alert(
    '🤖 執行情感分析',
    '此操作將觸發 Kaggle 筆記本執行情感分析：\n\n' +
    '• 處理 Raw Data 中的所有貼文\n' +
    '• 執行 ML 模型進行情感分析\n' +
    '• 更新 Results 表格排名\n' +
    '• 記錄模型指標\n\n' +
    '執行時間約 15-20 分鐘。確定要繼續嗎？',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    ui.alert('已取消執行');
    return;
  }

  try {
    const result = pushKaggleKernel();

    if (result.success) {
      ui.alert(
        '✓ 已觸發情感分析',
        '筆記本已開始執行。\n\n' +
        '• 版本號: ' + (result.versionNumber || 'N/A') + '\n' +
        '• 預計完成時間: 15-20 分鐘\n\n' +
        '可使用「檢查執行狀態」查看進度。',
        ui.ButtonSet.OK
      );
    } else {
      ui.alert('執行失敗: ' + result.error);
    }

  } catch (e) {
    ui.alert('錯誤: ' + e.message);
    Logger.log('Kaggle trigger failed: ' + e.message);
  }
}

/**
 * Push/trigger the Kaggle kernel
 * Two-step process: pull existing kernel, then push to trigger new run
 * @returns {Object} {success, versionNumber, error}
 */
function pushKaggleKernel() {
  const creds = getKaggleCredentials();

  if (!creds.apiKey) {
    return { success: false, error: '在腳本屬性中找不到 KAGGLE_API_KEY' };
  }

  const authString = Utilities.base64Encode(creds.username + ':' + creds.apiKey);
  const authHeader = { 'Authorization': 'Basic ' + authString };

  // Step 1: Pull existing kernel to get metadata and source
  try {
    const pullUrl = KAGGLE_API_URL + '/kernels/pull?userName=' + creds.username +
                    '&kernelSlug=celebrity-popularity-quantifier-taiwan';

    const pullResponse = UrlFetchApp.fetch(pullUrl, {
      method: 'get',
      headers: authHeader,
      muteHttpExceptions: true
    });

    if (pullResponse.getResponseCode() !== 200) {
      return { success: false, error: '無法拉取筆記本: HTTP ' + pullResponse.getResponseCode() };
    }

    const kernelData = JSON.parse(pullResponse.getContentText());
    const metadata = kernelData.metadata;
    const sourceCode = kernelData.blob.source;

    Logger.log('Pulled kernel v' + metadata.currentVersionNumber);

    // Step 2: Push kernel back to trigger new run
    const pushPayload = {
      id: metadata.id,  // Use numeric ID
      slug: metadata.slug,
      title: metadata.title,
      text: sourceCode,
      language: metadata.language,
      kernelType: metadata.kernelType,
      isPrivate: metadata.isPrivate,
      enableGpu: metadata.enableGpu,
      enableTpu: metadata.enableTpu,
      enableInternet: metadata.enableInternet,
      datasetDataSources: metadata.datasetDataSources || [],
      competitionDataSources: metadata.competitionDataSources || [],
      kernelDataSources: metadata.kernelDataSources || [],
      modelDataSources: metadata.modelDataSources || [],
      categoryIds: metadata.categoryIds || []
    };

    const pushResponse = UrlFetchApp.fetch(KAGGLE_API_URL + '/kernels/push', {
      method: 'post',
      headers: {
        'Authorization': 'Basic ' + authString,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(pushPayload),
      muteHttpExceptions: true
    });

    const pushCode = pushResponse.getResponseCode();
    const pushBody = pushResponse.getContentText();

    Logger.log('Kaggle push response: ' + pushCode + ' - ' + pushBody);

    if (pushCode === 200) {
      const data = JSON.parse(pushBody);
      return {
        success: true,
        versionNumber: data.versionNumber,
        url: data.url
      };
    } else if (pushCode === 401) {
      return { success: false, error: '無效的 Kaggle 憑證' };
    } else if (pushCode === 403) {
      return { success: false, error: '無法存取筆記本' };
    } else {
      return { success: false, error: 'HTTP ' + pushCode + ': ' + pushBody };
    }

  } catch (e) {
    Logger.log('Kaggle trigger error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Check the status of the Kaggle kernel
 */
function checkKaggleKernelStatus() {
  const ui = SpreadsheetApp.getUi();

  try {
    const status = getKaggleKernelStatus();

    if (status.success) {
      ui.alert(
        '📊 執行狀態',
        '筆記本: ' + KAGGLE_KERNEL_ID + '\n\n' +
        '• 狀態: ' + status.status + '\n' +
        '• 最新版本: ' + status.versionNumber + '\n' +
        '• 最後執行: ' + status.lastRunTime,
        ui.ButtonSet.OK
      );
    } else {
      ui.alert('無法取得狀態: ' + status.error);
    }

  } catch (e) {
    ui.alert('錯誤: ' + e.message);
  }
}

/**
 * Get kernel status from Kaggle API
 * @returns {Object} {success, status, versionNumber, lastRunTime, error}
 */
function getKaggleKernelStatus() {
  const creds = getKaggleCredentials();

  if (!creds.apiKey) {
    return { success: false, error: '在腳本屬性中找不到 KAGGLE_API_KEY' };
  }

  const authString = Utilities.base64Encode(creds.username + ':' + creds.apiKey);

  const options = {
    method: 'get',
    headers: {
      'Authorization': 'Basic ' + authString
    },
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(
      KAGGLE_API_URL + '/kernels/status?userName=' + creds.username +
      '&kernelSlug=celebrity-popularity-quantifier-taiwan',
      options
    );
    const code = response.getResponseCode();
    const body = response.getContentText();

    if (code === 200) {
      const data = JSON.parse(body);
      return {
        success: true,
        status: data.status || 'unknown',
        versionNumber: data.versionNumber || 'N/A',
        lastRunTime: data.lastRunTime || 'N/A'
      };
    } else {
      return { success: false, error: 'HTTP ' + code };
    }

  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Test function - verify Kaggle API connection
 * Run from GAS editor to verify credentials are set correctly
 */
function testKaggleAPI() {
  const creds = getKaggleCredentials();
  Logger.log('Kaggle Username: ' + creds.username);
  Logger.log('Kaggle API Key: ' + (creds.apiKey ? 'Set (' + creds.apiKey.length + ' chars)' : 'NOT SET'));

  const status = getKaggleKernelStatus();
  Logger.log('Status check: ' + JSON.stringify(status));
}
