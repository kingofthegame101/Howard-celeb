/**
 * Celebrity Insight - API Module
 * Handles communication with Google Apps Script backend
 */

const API = {
  // Base URL for the deployed Apps Script web app
  // Replace this with your deployed web app URL
  baseUrl: null,

  // Cache for data
  cache: {
    results: null,
    news: null,
    sources: null,
    analytics: null,
    timestamp: 0
  },

  // Cache TTL (5 minutes)
  CACHE_TTL: 5 * 60 * 1000,

  /**
   * Initialize API with the deployed web app URL
   * @param {string} url - The deployed Apps Script web app URL
   */
  init(url) {
    this.baseUrl = url;
  },

  /**
   * Check if cache is valid
   */
  isCacheValid() {
    return this.cache.timestamp && (Date.now() - this.cache.timestamp < this.CACHE_TTL);
  },

  /**
   * Make API request to Apps Script backend
   * @param {string} action - The action to perform
   * @param {Object} params - Additional parameters
   */
  async request(action, params = {}) {
    if (!this.baseUrl) {
      // If no URL set, try to use mock data for development
      console.warn('API URL not set, using mock data');
      return this.getMockData(action);
    }

    const url = new URL(this.baseUrl);
    url.searchParams.set('action', action);
    Object.keys(params).forEach(key => {
      url.searchParams.set(key, params[key]);
    });

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      // Return mock data as fallback
      return this.getMockData(action);
    }
  },

  /**
   * Get all dashboard data (optimized single call)
   */
  async getAllData() {
    if (this.isCacheValid()) {
      return this.cache;
    }

    const data = await this.request('getAllDashboardData');

    this.cache = {
      results: data.results || [],
      news: data.news || { posts: [], celebrities: [] },
      sources: data.sources || [],
      analytics: data.analytics || null,
      progress: data.progress || { reviewed: 0, total: 0 },
      timestamp: Date.now()
    };

    return this.cache;
  },

  /**
   * Get celebrity rankings
   */
  async getResults() {
    if (this.isCacheValid() && this.cache.results) {
      return this.cache.results;
    }
    const data = await this.request('getResults');
    this.cache.results = data;
    return data;
  },

  /**
   * Get news data
   */
  async getNewsData() {
    if (this.isCacheValid() && this.cache.news) {
      return this.cache.news;
    }
    const data = await this.request('getNewsData');
    this.cache.news = data;
    return data;
  },

  /**
   * Get sources data
   */
  async getSourcesData() {
    if (this.isCacheValid() && this.cache.sources) {
      return this.cache.sources;
    }
    const data = await this.request('getSourcesData');
    this.cache.sources = data;
    return data;
  },

  /**
   * Get analytics data
   */
  async getAnalytics() {
    if (this.isCacheValid() && this.cache.analytics) {
      return this.cache.analytics;
    }
    const data = await this.request('getAnalytics');
    this.cache.analytics = data;
    return data;
  },

  /**
   * Compare two celebrities
   */
  async compareCelebrities(celeb1, celeb2) {
    return this.request('compareCelebrities', { celebrity1: celeb1, celebrity2: celeb2 });
  },

  /**
   * Clear cache and force refresh
   */
  clearCache() {
    this.cache = {
      results: null,
      news: null,
      sources: null,
      analytics: null,
      timestamp: 0
    };
  },

  /**
   * Mock data for development/demo
   */
  getMockData(action) {
    const mockResults = [
      {
        rank: 1,
        celebrity: "Seraphina Rose",
        score: 98.2,
        confidence: 94,
        trend: "Rising",
        sourceBreakdown: '{"Instagram": 0.42, "TikTok": 0.31, "YouTube": 0.15, "News": 0.12}',
        topSource: "Instagram",
        riskFlag: "No",
        endorsement: "Yes",
        topContributingSource: "Instagram Official",
        lastUpdated: new Date().toLocaleDateString()
      },
      {
        rank: 2,
        celebrity: "Marcus Thorne",
        score: 94.7,
        confidence: 82,
        trend: "Stable",
        sourceBreakdown: '{"YouTube": 0.45, "Instagram": 0.25, "News": 0.20, "TikTok": 0.10}',
        topSource: "YouTube",
        riskFlag: "No",
        endorsement: "Yes",
        topContributingSource: "YouTube Channel",
        lastUpdated: new Date().toLocaleDateString()
      },
      {
        rank: 3,
        celebrity: "Elena Valis",
        score: 92.1,
        confidence: 88,
        trend: "Rising",
        sourceBreakdown: '{"News": 0.40, "Instagram": 0.30, "YouTube": 0.20, "Facebook": 0.10}',
        topSource: "News",
        riskFlag: "No",
        endorsement: "Yes",
        topContributingSource: "Tech News",
        lastUpdated: new Date().toLocaleDateString()
      },
      {
        rank: 4,
        celebrity: "Kai Sato",
        score: 88.5,
        confidence: 76,
        trend: "Falling",
        sourceBreakdown: '{"TikTok": 0.50, "YouTube": 0.30, "Instagram": 0.15, "News": 0.05}',
        topSource: "TikTok",
        riskFlag: "Yes",
        endorsement: "No",
        topContributingSource: "TikTok Gaming",
        lastUpdated: new Date().toLocaleDateString()
      },
      {
        rank: 5,
        celebrity: "Luna Park",
        score: 85.3,
        confidence: 79,
        trend: "Rising",
        sourceBreakdown: '{"Instagram": 0.55, "TikTok": 0.25, "YouTube": 0.15, "News": 0.05}',
        topSource: "Instagram",
        riskFlag: "No",
        endorsement: "Yes",
        topContributingSource: "Instagram Fashion",
        lastUpdated: new Date().toLocaleDateString()
      }
    ];

    const mockNews = {
      posts: [
        {
          celebrity: "Seraphina Rose",
          platform: "Instagram",
          content: "Behind the scenes of the new music video shoot! Can't wait for you all to see it...",
          date: new Date().toLocaleDateString(),
          url: "#"
        },
        {
          celebrity: "Marcus Thorne",
          platform: "YouTube",
          content: "New documentary premiering next week. This project has been two years in the making...",
          date: new Date().toLocaleDateString(),
          url: "#"
        }
      ],
      celebrities: ["Seraphina Rose", "Marcus Thorne", "Elena Valis", "Kai Sato", "Luna Park"]
    };

    const mockSources = [
      { name: "@seraphina_official", sourceType: "Official", platform: "Instagram", rating: 5, ratedBy: "auto", lastModified: "-" },
      { name: "TechNews Daily", sourceType: "Media", platform: "News", rating: 4, ratedBy: "auto", lastModified: "-" },
      { name: "@marcus_fans", sourceType: "Fan", platform: "Instagram", rating: 3, ratedBy: "auto", lastModified: "-" }
    ];

    const mockAnalytics = {
      accuracy: 87.5,
      accuracyThreshold: 85,
      accuracyTrend: "Good Performance",
      trainingData: 1250,
      goodRatio: 78,
      lastRun: new Date().toLocaleDateString(),
      lastRunStatus: "Success"
    };

    switch (action) {
      case 'getAllDashboardData':
        return {
          results: mockResults,
          news: mockNews,
          sources: mockSources,
          analytics: mockAnalytics,
          progress: { reviewed: 850, total: 1250 }
        };
      case 'getResults':
        return mockResults;
      case 'getNewsData':
        return mockNews;
      case 'getSourcesData':
        return mockSources;
      case 'getAnalytics':
        return mockAnalytics;
      default:
        return {};
    }
  }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
