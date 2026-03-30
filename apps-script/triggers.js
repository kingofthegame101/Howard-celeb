/**
 * Celebrity Popularity Quantifier - Triggers
 * Taiwan Edition v5.0
 *
 * Trigger management functions
 */

// =====================================================
// DAILY TRIGGER SETUP
// =====================================================

/**
 * Setup daily trigger at 06:00 UTC+8
 * Run this once to initialize the daily schedule
 */
function setupDailyTrigger() {
  // Delete existing triggers for this function
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === "fetchTaiwanSocialMedia") {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Create new trigger at 06:00 UTC+8 (22:00 UTC previous day)
  ScriptApp.newTrigger("fetchTaiwanSocialMedia")
    .timeBased()
    .atHour(6)  // 06:00 in project timezone (Asia/Taipei)
    .everyDays(1)
    .create();

  Logger.log("✓ 已建立觸發器: 每日 06:00 UTC+8 (Asia/Taipei)");
}

// =====================================================
// TRIGGER MANAGEMENT
// =====================================================

/**
 * Delete all triggers for this project
 */
function deleteAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log(`Deleted ${triggers.length} triggers`);
}

/**
 * List all current triggers
 * @returns {Array} Array of trigger info objects
 */
function listTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  const triggerInfo = triggers.map(t => ({
    handlerFunction: t.getHandlerFunction(),
    triggerType: t.getEventType().toString(),
    uniqueId: t.getUniqueId()
  }));

  Logger.log(`Current triggers (${triggers.length}):`);
  triggerInfo.forEach(info => {
    Logger.log(`  - ${info.handlerFunction} (${info.triggerType})`);
  });

  return triggerInfo;
}

/**
 * Delete triggers for a specific function
 * @param {string} functionName - Name of the function
 * @returns {number} Number of triggers deleted
 */
function deleteTriggersByFunction(functionName) {
  const triggers = ScriptApp.getProjectTriggers();
  let deletedCount = 0;

  triggers.forEach(t => {
    if (t.getHandlerFunction() === functionName) {
      ScriptApp.deleteTrigger(t);
      deletedCount++;
    }
  });

  Logger.log(`Deleted ${deletedCount} triggers for function: ${functionName}`);
  return deletedCount;
}
