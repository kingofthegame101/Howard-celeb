/**
 * Celebrity Popularity Quantifier - Constants
 * Taiwan Edition v5.0
 *
 * Shared constants used across all modules
 */

// =====================================================
// API CONFIGURATION
// =====================================================
const SERPAPI_BASE_URL = "https://serpapi.com/search.json";
const SERPAPI_SOCIAL_SITES = "site:instagram.com OR site:facebook.com OR site:tiktok.com OR site:youtube.com";
const MAX_API_RETRIES = 3;

// =====================================================
// SHEET CONFIGURATION
// =====================================================
const SHEET_ID = "1sgKkhqP0_WAzdBfBbH2oWLAav-WlGkbCyayLguaHG6Q";
const DASHBOARD_SHEET_ID = SHEET_ID; // Same sheet for dashboard

// =====================================================
// SHEET NAMES (繁體中文)
// =====================================================
const SHEET_NAMES = {
  RAW_DATA: "原始資料",
  CONFIG: "設定",
  SOURCE_WEIGHTS: "來源權重",
  RESULTS: "結果",
  FEEDBACK_HISTORY: "回饋歷史",
  MODEL_METRICS: "模型指標",
  SOURCE_CONFIG: "來源設定"
};

// =====================================================
// TIMING CONFIGURATION
// =====================================================
const TIMEZONE = "Asia/Taipei";
const MAX_EXECUTION_TIME_MS = 5 * 60 * 1000; // 5 minutes (buffer before 6-min limit)
const API_RATE_LIMIT_MS = 1500; // Rate limit between API calls (ms)

// =====================================================
// DATA VALIDATION
// =====================================================
const VALID_PLATFORMS = ["Instagram", "Facebook", "TikTok", "YouTube", "News"];
const DEFAULT_CELEBRITIES = ["蔡依林", "王心凌", "柯震東", "林俊傑", "五月天"];

// =====================================================
// FEEDBACK VALIDATION (繁體中文)
// =====================================================
const VALID_FEEDBACK_VALUES = ["好評", "負評", "跳過", ""];

// =====================================================
// TREND INDICATORS
// =====================================================
const TREND_EMOJIS = ["🚀", "↑", "→", "↓", "📉"];

// =====================================================
// COLUMN SCHEMAS (繁體中文)
// =====================================================
const RAW_DATA_HEADERS = [
  "收集時間", "名人", "平台", "帳號名稱",
  "貼文內容", "貼文網址", "發布時間",
  "帳號類型", "回饋", "回饋備註", "情感分數", "處理日期"
];

const RESULTS_HEADERS = [
  "排名", "名人", "平均情感分數", "分析貼文數",
  "情感標準差", "加權聲量分數", "可信度分數",
  "分數區間", "模型準確度", "趨勢方向", "來源分析",
  "主要來源", "好評比例", "風險標記", "可代言",
  "最大貢獻來源", "分數變化分析", "最後更新", "分析備註"
];

const MODEL_METRICS_HEADERS = [
  "執行日期", "執行編號", "處理貼文數", "好評貼文", "負評貼文",
  "跳過貼文", "訓練準確度", "訓練精確度", "訓練召回率",
  "訓練F1分數", "模型狀態", "名人數量", "已排名名人",
  "流程狀態", "錯誤記錄"
];

const CONFIG_HEADERS = ["設定名稱", "值", "說明", "最後更新"];

const SOURCE_WEIGHTS_HEADERS = ["來源", "權重分數", "理由", "最後修改"];

const SOURCE_CONFIG_HEADERS = [
  "來源名稱", "來源類型", "平台", "重要性分數", "評分者", "最後修改"
];

const FEEDBACK_HISTORY_HEADERS = [
  "貼文編號", "貼文內容", "Kaggle預測情感", "人工回饋",
  "回饋原因", "回饋日期", "回饋輪次"
];

// =====================================================
// DEFAULT PLATFORM WEIGHTS (繁體中文)
// =====================================================
const DEFAULT_PLATFORM_WEIGHTS = [
  ["TikTok", 10, "最高觸及率；病毒式傳播潛力"],
  ["Instagram", 9, "視覺互動；年輕族群"],
  ["YouTube", 8, "長篇內容；深度互動"],
  ["Facebook", 7, "廣泛觸及；年長族群"],
  ["News", 6, "可信度；媒體報導"]
];

// =====================================================
// PLATFORM NAME NORMALIZATION
// =====================================================
const PLATFORM_NAME_MAP = {
  "instagram": "Instagram",
  "facebook": "Facebook",
  "tiktok": "TikTok",
  "youtube": "YouTube",
  "news": "News"
};
