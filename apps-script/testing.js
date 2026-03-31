/**
 * Celebrity Popularity Quantifier - Testing
 * Taiwan Edition v5.0
 *
 * Test utility functions for debugging and verification
 */

// =====================================================
// API TESTING
// =====================================================

/**
 * Test SerpAPI connection
 */
function testSerpAPI() {
  const apiKey = getSerpApiKey();

  if (!apiKey) {
    Logger.log("ERROR: SERPAPI_API_KEY not found in Script Properties");
    Logger.log("Go to Project Settings > Script Properties > Add Property");
    return;
  }

  Logger.log("✓ API Key found in Script Properties");

  try {
    const posts = querySerpAPI("蔡依林", apiKey);
    Logger.log(`✓ API test successful! Received ${posts.length} posts`);

    if (posts.length > 0) {
      Logger.log(`Sample post: ${JSON.stringify(posts[0], null, 2)}`);
    }
  } catch (e) {
    Logger.log(`✗ API test failed: ${e.message}`);
  }
}

// =====================================================
// CONFIG TESTING
// =====================================================

/**
 * Test configuration loading
 */
function testLoadConfig() {
  const config = loadConfig();
  Logger.log("Configuration loaded:");
  Logger.log(`- Celebrities: ${config.CELEBRITIES_TO_TRACK.join(", ")}`);
  Logger.log(`- Accuracy Threshold: ${config.MODEL_ACCURACY_THRESHOLD}`);
  Logger.log(`- Confidence Threshold: ${config.CONFIDENCE_THRESHOLD}`);
}

// =====================================================
// SINGLE CELEBRITY TEST
// =====================================================

/**
 * Manual test run (single celebrity)
 */
function testSingleCelebrity() {
  const apiKey = getSerpApiKey();
  const celebrity = "蔡依林";

  Logger.log(`Testing fetch for: ${celebrity}`);

  try {
    const posts = querySerpAPI(celebrity, apiKey);
    const validated = validateSerpApiResponse(posts, celebrity);

    Logger.log(`Raw posts: ${posts.length}`);
    Logger.log(`Validated posts: ${validated.length}`);

    validated.forEach((post, i) => {
      Logger.log(`Post ${i + 1}: ${post.platform} - ${post.content.substring(0, 50)}...`);
    });

  } catch (e) {
    Logger.log(`Error: ${e.message}`);
  }
}

// =====================================================
// SHEET TESTING
// =====================================================

/**
 * Test sheet access
 */
function testSheetAccess() {
  const sheetNames = [
    SHEET_NAMES.RAW_DATA,
    SHEET_NAMES.CONFIG,
    SHEET_NAMES.RESULTS,
    SHEET_NAMES.SOURCE_WEIGHTS,
    SHEET_NAMES.MODEL_METRICS,
    SHEET_NAMES.SOURCE_CONFIG
  ];

  Logger.log("測試工作表存取...");

  sheetNames.forEach(name => {
    try {
      const sheet = getSheetSafe(SHEET_ID, name);
      const rowCount = sheet.getLastRow();
      Logger.log("✓ " + name + ": " + rowCount + " 列");
    } catch (e) {
      Logger.log("✗ " + name + ": " + e.message);
    }
  });
}

/**
 * Test deduplication key generation
 */
function testDeduplicationKeys() {
  Logger.log("Testing deduplication key generation...");

  // Test URL-based key
  const urlKey = generatePostKey("https://instagram.com/post/123", "蔡依林", "Instagram", "@jolin_cai", "Some content");
  Logger.log(`URL-based key: ${urlKey}`);

  // Test content-based key (no URL)
  const contentKey = generatePostKey("#", "蔡依林", "Instagram", "@jolin_cai", "Some content here for testing");
  Logger.log(`Content-based key: ${contentKey}`);

  // Test empty URL
  const emptyUrlKey = generatePostKey("", "蔡依林", "Instagram", "@jolin_cai", "Some content");
  Logger.log(`Empty URL key: ${emptyUrlKey}`);

  Logger.log("✓ Key generation tests complete");
}

// =====================================================
// SOURCE WEIGHTS TESTING
// =====================================================

/**
 * Test source weights loading
 */
function testSourceWeights() {
  const weights = loadSourceWeights();

  Logger.log("Source Weights:");
  Object.entries(weights).forEach(([platform, weight]) => {
    Logger.log(`  ${platform}: ${weight}`);
  });
}

// =====================================================
// FULL PIPELINE TEST
// =====================================================

/**
 * Test full pipeline without writing to sheet
 * Use this to verify API and validation work correctly
 */
function testFullPipelineDryRun() {
  Logger.log("========================================");
  Logger.log("FULL PIPELINE DRY RUN");
  Logger.log("========================================");

  const apiKey = getSerpApiKey();
  if (!apiKey) {
    Logger.log("ERROR: No API key configured");
    return;
  }

  const config = loadConfig();
  const celebrities = config.CELEBRITIES_TO_TRACK.slice(0, 2); // Only test first 2

  Logger.log(`Testing with ${celebrities.length} celebrities: ${celebrities.join(", ")}`);

  let totalPosts = 0;
  let totalValidated = 0;

  celebrities.forEach(celebrity => {
    try {
      Logger.log(`\nFetching: ${celebrity}`);
      const posts = querySerpAPI(celebrity, apiKey);
      const validated = validateSerpApiResponse(posts, celebrity);

      Logger.log(`  Raw: ${posts.length}, Validated: ${validated.length}`);
      totalPosts += posts.length;
      totalValidated += validated.length;

    } catch (e) {
      Logger.log(`  Error: ${e.message}`);
    }

    // Rate limiting
    Utilities.sleep(1000);
  });

  Logger.log("\n========================================");
  Logger.log("DRY RUN COMPLETE");
  Logger.log(`Total raw posts: ${totalPosts}`);
  Logger.log(`Total validated: ${totalValidated}`);
  Logger.log("========================================");
}
