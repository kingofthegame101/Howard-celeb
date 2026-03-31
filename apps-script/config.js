/**
 * Celebrity Popularity Quantifier - Configuration
 * Taiwan Edition v5.0
 *
 * Configuration loading functions
 */

// =====================================================
// MAIN CONFIG LOADER
// =====================================================

/**
 * Load configuration from Config sheet
 * @returns {Object} Configuration object
 */
function loadConfig() {
  const configSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAMES.CONFIG);

  if (!configSheet) {
    // Return default config if Config sheet doesn't exist
    return {
      CELEBRITIES_TO_TRACK: DEFAULT_CELEBRITIES,
      MODEL_ACCURACY_THRESHOLD: 0.85,
      CONFIDENCE_THRESHOLD: 0.70,
      SENTIMENT_STDDEV_MAX: 0.25,
      DATA_RETENTION_DAYS: 30
    };
  }

  const data = configSheet.getDataRange().getValues();
  const config = {};

  for (let i = 1; i < data.length; i++) {
    const [key, value] = [data[i][0], data[i][1]];

    if (!key) continue;

    if (key === "CELEBRITIES_TO_TRACK") {
      config[key] = String(value).split(",").map(s => s.trim()).filter(s => s.length > 0);
    } else if (key.includes("WEIGHT") || key.includes("DAYS") || key.includes("MIN")) {
      config[key] = parseInt(value) || 0;
    } else if (key.includes("THRESHOLD") || key.includes("MAX")) {
      config[key] = parseFloat(value) || 0;
    } else {
      config[key] = value;
    }
  }

  // Ensure celebrities list exists
  if (!config.CELEBRITIES_TO_TRACK || config.CELEBRITIES_TO_TRACK.length === 0) {
    config.CELEBRITIES_TO_TRACK = DEFAULT_CELEBRITIES;
  }

  return config;
}

// =====================================================
// DASHBOARD CONFIG LOADER
// =====================================================

/**
 * Load dashboard-specific configuration
 * @returns {Object} Dashboard configuration
 */
function loadDashboardConfig() {
  const config = loadConfig();

  return {
    celebrities: config.CELEBRITIES_TO_TRACK || DEFAULT_CELEBRITIES,
    accuracyThreshold: config.MODEL_ACCURACY_THRESHOLD || 0.85,
    confidenceThreshold: config.CONFIDENCE_THRESHOLD || 0.70,
    sentimentStdDevMax: config.SENTIMENT_STDDEV_MAX || 0.25,
    trainingDataMin: config.TRAINING_DATA_MIN || 200,
    platforms: VALID_PLATFORMS
  };
}

// =====================================================
// SOURCE WEIGHTS LOADER
// =====================================================

/**
 * Load source weights from Source Weights sheet
 * @returns {Object} Map of platform to weight
 */
function loadSourceWeights() {
  const weights = {};

  // Set defaults first
  DEFAULT_PLATFORM_WEIGHTS.forEach(([platform, weight]) => {
    weights[platform] = weight;
  });

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAMES.SOURCE_WEIGHTS);
    if (!sheet || sheet.getLastRow() <= 1) {
      return weights;
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const sourceIdx = headers.indexOf("來源");
    const weightIdx = headers.indexOf("權重分數");

    for (let i = 1; i < data.length; i++) {
      const source = String(data[i][sourceIdx >= 0 ? sourceIdx : 0] || "").trim();
      const weight = Number(data[i][weightIdx >= 0 ? weightIdx : 1]);
      if (source && !isNaN(weight)) {
        weights[source] = weight;
      }
    }
  } catch (e) {
    Logger.log(`Warning: Could not load source weights: ${e.message}`);
  }

  return weights;
}

// =====================================================
// SOURCE CONFIG LOADER
// =====================================================

/**
 * Load source-specific importance ratings
 * @returns {Map} Map of "sourceName|platform" to importance score
 */
function loadSourceConfig() {
  const sourceConfig = new Map();

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAMES.SOURCE_CONFIG);
    if (!sheet || sheet.getLastRow() <= 1) {
      return sourceConfig;
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const sourceNameIdx = headers.indexOf("來源名稱");
    const platformIdx = headers.indexOf("平台");
    const importanceIdx = headers.indexOf("重要性分數");

    for (let i = 1; i < data.length; i++) {
      const sourceName = String(data[i][sourceNameIdx >= 0 ? sourceNameIdx : 0] || "").trim();
      const platform = String(data[i][platformIdx >= 0 ? platformIdx : 2] || "").trim();
      const importance = Number(data[i][importanceIdx >= 0 ? importanceIdx : 3]);

      if (sourceName && platform) {
        sourceConfig.set(`${sourceName}|${platform}`, importance || 3);
      }
    }
  } catch (e) {
    Logger.log(`Warning: Could not load source config: ${e.message}`);
  }

  return sourceConfig;
}

// =====================================================
// API KEY LOADER
// =====================================================

/**
 * Get SerpAPI key from Script Properties
 * @returns {string|null} API key or null if not found
 */
function getSerpApiKey() {
  return PropertiesService.getScriptProperties().getProperty('SERPAPI_API_KEY');
}
