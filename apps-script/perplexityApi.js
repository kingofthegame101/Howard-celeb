/**
 * Celebrity Popularity Quantifier - SerpAPI Integration
 * Taiwan Edition v5.0
 *
 * SerpAPI integration for fetching social media data via Google Search & Google News
 */

// =====================================================
// DOMAIN TO PLATFORM MAPPING
// =====================================================

const DOMAIN_TO_PLATFORM = {
  "instagram.com": "Instagram",
  "www.instagram.com": "Instagram",
  "facebook.com": "Facebook",
  "www.facebook.com": "Facebook",
  "m.facebook.com": "Facebook",
  "tiktok.com": "TikTok",
  "www.tiktok.com": "TikTok",
  "youtube.com": "YouTube",
  "www.youtube.com": "YouTube",
  "m.youtube.com": "YouTube",
  "youtu.be": "YouTube"
};

// =====================================================
// API QUERY
// =====================================================

/**
 * Query SerpAPI for celebrity social media data
 * Makes 2 calls: Google Search (social media sites) + Google News
 * @param {string} celebrity - Celebrity name in Traditional Chinese
 * @param {string} apiKey - SerpAPI API key
 * @param {number} retryCount - Current retry attempt (internal use)
 * @returns {Array} Array of post objects
 */
function querySerpAPI(celebrity, apiKey, retryCount = 0) {
  if (retryCount >= MAX_API_RETRIES) {
    throw new Error(`API rate limit exceeded after ${MAX_API_RETRIES} retries`);
  }

  try {
    // Call 1: Google Search for social media posts
    const socialParams = buildSerpApiSearchParams(celebrity, "google", apiKey);
    const socialResults = fetchSerpApi(socialParams, retryCount, celebrity, apiKey);

    // Call 2: Google News
    const newsParams = buildSerpApiSearchParams(celebrity, "google_news", apiKey);
    const newsResults = fetchSerpApi(newsParams, retryCount, celebrity, apiKey);

    // Transform results into post objects
    const socialPosts = (socialResults.organic_results || [])
      .map(result => transformSerpResult(result, "google"))
      .filter(post => post !== null);

    const newsPosts = (newsResults.news_results || [])
      .map(result => transformSerpResult(result, "google_news"))
      .filter(post => post !== null);

    const allPosts = [...socialPosts, ...newsPosts];

    // Enrich content with OG descriptions
    for (let i = 0; i < allPosts.length; i++) {
      if (allPosts[i].post_url && allPosts[i].post_url !== "#") {
        try {
          const ogDesc = fetchOgDescription(allPosts[i].post_url);
          if (ogDesc && ogDesc.length > allPosts[i].content.length) {
            allPosts[i].content = ogDesc;
          }
        } catch (e) {
          // OG fetch failed, keep original snippet content
        }
      }
    }

    Logger.log(`SerpAPI returned ${socialPosts.length} social + ${newsPosts.length} news results for ${celebrity}`);
    return allPosts;

  } catch (e) {
    throw new Error(`SerpAPI call failed: ${e.message}`);
  }
}

// =====================================================
// SERPAPI HTTP FETCH
// =====================================================

/**
 * Execute a SerpAPI request with error handling and retry
 * @param {Object} params - URL query parameters
 * @param {number} retryCount - Current retry attempt
 * @param {string} celebrity - Celebrity name for logging
 * @param {string} apiKey - API key for retry calls
 * @returns {Object} Parsed JSON response
 */
function fetchSerpApi(params, retryCount, celebrity, apiKey) {
  const queryString = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const url = `${SERPAPI_BASE_URL}?${queryString}`;

  const options = {
    method: "get",
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();

  if (responseCode === 401) {
    throw new Error("Invalid API key - check SERPAPI_API_KEY in Script Properties");
  }

  if (responseCode === 429) {
    const waitTime = Math.pow(2, retryCount) * 2000;
    Logger.log(`Rate limited, waiting ${waitTime/1000}s (retry ${retryCount + 1}/${MAX_API_RETRIES})...`);
    Utilities.sleep(waitTime);
    return fetchSerpApi(params, retryCount + 1, celebrity, apiKey);
  }

  if (responseCode !== 200) {
    throw new Error(`SerpAPI error: ${responseCode} - ${response.getContentText().substring(0, 200)}`);
  }

  try {
    return JSON.parse(response.getContentText());
  } catch (parseError) {
    throw new Error(`Failed to parse SerpAPI response as JSON: ${parseError.message}`);
  }
}

// =====================================================
// SEARCH PARAMS BUILDER
// =====================================================

/**
 * Build SerpAPI search parameters
 * @param {string} celebrity - Celebrity name
 * @param {string} engine - "google" or "google_news"
 * @param {string} apiKey - SerpAPI key
 * @returns {Object} Query parameters
 */
function buildSerpApiSearchParams(celebrity, engine, apiKey) {
  if (engine === "google_news") {
    return {
      engine: "google_news",
      q: celebrity,
      gl: "tw",
      hl: "zh-TW",
      api_key: apiKey
    };
  }

  return {
    engine: "google",
    q: `"${celebrity}" ${SERPAPI_SOCIAL_SITES}`,
    gl: "tw",
    hl: "zh-TW",
    num: "10",
    api_key: apiKey
  };
}

// =====================================================
// RESULT TRANSFORMATION
// =====================================================

/**
 * Transform a SerpAPI result into a post object
 * @param {Object} result - Single search result from SerpAPI
 * @param {string} engine - "google" or "google_news"
 * @returns {Object|null} Post object or null if not a social media result
 */
function transformSerpResult(result, engine) {
  const today = Utilities.formatDate(new Date(), 'GMT+8', "yyyy-MM-dd'T'HH:mm:ssXXX");

  if (engine === "google_news") {
    const sourceName = (result.source && result.source.name) || extractDomain(result.link) || "Unknown";
    return {
      platform: "News",
      account_name: sourceName,
      account_type: "media",
      content: [result.title, result.snippet].filter(Boolean).join(" - "),
      post_timestamp: parseResultDate(result.date) || today,
      post_url: result.link || "#"
    };
  }

  // Google organic - detect platform from URL
  const platform = detectPlatformFromUrl(result.link);
  if (!platform) return null; // Discard non-social results

  return {
    platform: platform,
    account_name: extractAccountName(result.link, result.title, platform),
    account_type: "unknown",
    content: result.snippet || result.title || "",
    post_timestamp: parseResultDate(result.date) || today,
    post_url: result.link || "#"
  };
}

// =====================================================
// PLATFORM DETECTION
// =====================================================

/**
 * Detect social media platform from URL domain
 * @param {string} url - Full URL
 * @returns {string|null} Platform name or null if not a known social platform
 */
function detectPlatformFromUrl(url) {
  if (!url) return null;

  try {
    // Extract hostname from URL
    const match = url.match(/^https?:\/\/([^\/\?#]+)/);
    if (!match) return null;

    const hostname = match[1].toLowerCase();

    // Direct lookup
    if (DOMAIN_TO_PLATFORM[hostname]) {
      return DOMAIN_TO_PLATFORM[hostname];
    }

    // Check if hostname ends with a known domain
    for (const [domain, platform] of Object.entries(DOMAIN_TO_PLATFORM)) {
      if (hostname.endsWith("." + domain) || hostname === domain) {
        return platform;
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}

// =====================================================
// ACCOUNT NAME EXTRACTION
// =====================================================

/**
 * Extract account name from URL and title
 * @param {string} url - Post URL
 * @param {string} title - Search result title
 * @param {string} platform - Detected platform name
 * @returns {string} Account name
 */
function extractAccountName(url, title, platform) {
  if (!url) return title || "Unknown";

  try {
    const path = url.replace(/^https?:\/\/[^\/]+/, "");

    switch (platform) {
      case "Instagram": {
        // Pattern: /username/ or /username/p/... or /username/reel/...
        const igMatch = path.match(/^\/([^\/\?#]+)/);
        if (igMatch && !["p", "reel", "reels", "explore", "stories", "tv"].includes(igMatch[1])) {
          return "@" + igMatch[1];
        }
        // Try to get from /p/xxx/ pattern - account is often in title
        const titleMatch = title && title.match(/^([^|•\-–]+)/);
        if (titleMatch) return titleMatch[1].trim();
        break;
      }

      case "YouTube": {
        // Pattern: /@channelname or /c/channelname or /channel/...
        const ytMatch = path.match(/^\/@([^\/\?#]+)/) ||
                         path.match(/^\/c\/([^\/\?#]+)/) ||
                         path.match(/^\/channel\/([^\/\?#]+)/);
        if (ytMatch) return "@" + ytMatch[1];
        // Fallback: extract from title (usually "Video Title - Channel Name")
        const ytTitle = title && title.match(/[-–]\s*(.+?)(?:\s*[-–].*)?$/);
        if (ytTitle) return ytTitle[1].trim();
        break;
      }

      case "TikTok": {
        // Pattern: /@username/video/...
        const ttMatch = path.match(/^\/@([^\/\?#]+)/);
        if (ttMatch) return "@" + ttMatch[1];
        break;
      }

      case "Facebook": {
        // Pattern: /pagename/posts/... or /profile.php?id=... or /pagename
        const fbMatch = path.match(/^\/([^\/\?#]+)/);
        if (fbMatch && !["watch", "events", "groups", "marketplace", "gaming", "profile.php"].includes(fbMatch[1])) {
          return fbMatch[1];
        }
        break;
      }

      case "News": {
        return extractDomain(url) || "Unknown";
      }
    }
  } catch (e) {
    // Fall through to fallback
  }

  // Fallback: use title or domain
  if (title) {
    const titleClean = title.split(/[-|•–]/)[0].trim();
    if (titleClean.length > 0 && titleClean.length < 50) return titleClean;
  }

  return extractDomain(url) || "Unknown";
}

// =====================================================
// DATE PARSING
// =====================================================

/**
 * Parse SerpAPI date formats into ISO 8601 with +08:00
 * Handles relative dates ("3 days ago", "3 天前") and absolute dates
 * @param {string} dateStr - Date string from SerpAPI
 * @returns {string|null} ISO 8601 date string or null if unparseable
 */
function parseResultDate(dateStr) {
  if (!dateStr) return null;

  const now = new Date();
  const str = dateStr.trim();

  // Already ISO format
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
    if (str.includes("T")) return str;
    return str + "T00:00:00+08:00";
  }

  // English relative dates: "X hours/days/weeks/months ago"
  const enRelative = str.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
  if (enRelative) {
    return applyRelativeOffset(now, parseInt(enRelative[1]), enRelative[2].toLowerCase());
  }

  // Chinese relative dates: "X 天前", "X 小時前", etc.
  const zhRelative = str.match(/(\d+)\s*(秒|分鐘|小時|天|週|個月|年)前/);
  if (zhRelative) {
    const unitMap = {
      "秒": "second", "分鐘": "minute", "小時": "hour",
      "天": "day", "週": "week", "個月": "month", "年": "year"
    };
    return applyRelativeOffset(now, parseInt(zhRelative[1]), unitMap[zhRelative[2]]);
  }

  // English absolute dates: "Jan 15, 2026", "January 15, 2026"
  const enAbsolute = str.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (enAbsolute) {
    const months = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const monthNum = months[enAbsolute[1].substring(0, 3).toLowerCase()];
    if (monthNum !== undefined) {
      const d = new Date(parseInt(enAbsolute[3]), monthNum, parseInt(enAbsolute[2]));
      return formatDateISO(d);
    }
  }

  // "MM/DD/YYYY" or "DD/MM/YYYY" - assume MM/DD/YYYY
  const slashDate = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDate) {
    const d = new Date(parseInt(slashDate[3]), parseInt(slashDate[1]) - 1, parseInt(slashDate[2]));
    return formatDateISO(d);
  }

  return null;
}

/**
 * Apply a relative time offset and return ISO date string
 * @param {Date} now - Current date
 * @param {number} amount - Number of units to subtract
 * @param {string} unit - Time unit (second, minute, hour, day, week, month, year)
 * @returns {string} ISO 8601 date string
 */
function applyRelativeOffset(now, amount, unit) {
  const d = new Date(now.getTime());

  switch (unit) {
    case "second": d.setSeconds(d.getSeconds() - amount); break;
    case "minute": d.setMinutes(d.getMinutes() - amount); break;
    case "hour":   d.setHours(d.getHours() - amount); break;
    case "day":    d.setDate(d.getDate() - amount); break;
    case "week":   d.setDate(d.getDate() - (amount * 7)); break;
    case "month":  d.setMonth(d.getMonth() - amount); break;
    case "year":   d.setFullYear(d.getFullYear() - amount); break;
  }

  return formatDateISO(d);
}

/**
 * Format a Date as ISO 8601 with +08:00 timezone
 * @param {Date} d - Date to format
 * @returns {string} ISO 8601 string
 */
function formatDateISO(d) {
  // Adjust to UTC+8
  const utc8 = new Date(d.getTime() + (8 * 60 * 60 * 1000));
  const year = utc8.getUTCFullYear();
  const month = String(utc8.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc8.getUTCDate()).padStart(2, "0");
  const hours = String(utc8.getUTCHours()).padStart(2, "0");
  const minutes = String(utc8.getUTCMinutes()).padStart(2, "0");
  const seconds = String(utc8.getUTCSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`;
}

// =====================================================
// OG DESCRIPTION FETCHER
// =====================================================

/**
 * Fetch Open Graph description from a URL for richer content
 * @param {string} url - Page URL
 * @returns {string|null} OG description or null if not found
 */
function fetchOgDescription(url) {
  if (!url || url === "#") return null;

  try {
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
      }
    });

    if (response.getResponseCode() !== 200) return null;

    const html = response.getContentText();

    // Try og:description first
    const ogMatch = html.match(/<meta\s+(?:property|name)=["']og:description["']\s+content=["']([^"']+)["']/i) ||
                     html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:description["']/i);
    if (ogMatch && ogMatch[1].length > 10) {
      return ogMatch[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    }

    // Fallback: meta description
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
                       html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
    if (descMatch && descMatch[1].length > 10) {
      return descMatch[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    }

    return null;
  } catch (e) {
    return null;
  }
}

// =====================================================
// UTILITY
// =====================================================

/**
 * Extract clean domain from URL
 * @param {string} url - Full URL
 * @returns {string|null} Domain name or null
 */
function extractDomain(url) {
  if (!url) return null;
  const match = url.match(/^https?:\/\/(?:www\.)?([^\/\?#]+)/);
  return match ? match[1] : null;
}

// =====================================================
// RESPONSE VALIDATION
// =====================================================

/**
 * Validate SerpAPI response posts
 * @param {Array} posts - Array of post objects
 * @param {string} celebrity - Celebrity name for logging
 * @returns {Array} Validated posts
 */
function validateSerpApiResponse(posts, celebrity) {
  if (!Array.isArray(posts)) {
    Logger.log(`Warning: posts is not an array for ${celebrity}`);
    return [];
  }

  const requiredFields = ["platform", "account_name", "content", "post_timestamp", "post_url"];

  return posts.filter(post => {
    // Check required fields
    if (!requiredFields.every(field => field in post)) {
      Logger.log(`Skipping post: missing required field for ${celebrity}`);
      return false;
    }

    // Validate platform
    if (!VALID_PLATFORMS.includes(post.platform)) {
      Logger.log(`Skipping post: invalid platform ${post.platform}`);
      return false;
    }

    // Validate timestamp format (basic check)
    if (!post.post_timestamp || !post.post_timestamp.match(/\d{4}-\d{2}-\d{2}/)) {
      Logger.log(`Skipping post: invalid timestamp format`);
      return false;
    }

    // Validate content exists
    if (!post.content || post.content.trim().length === 0) {
      Logger.log(`Skipping post: empty content`);
      return false;
    }

    return true;
  });
}
