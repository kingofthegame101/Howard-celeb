/**
 * Celebrity Popularity Quantifier - Dashboard
 * Taiwan Edition v5.0 - User-Friendly Traditional Chinese Version
 *
 * Interactive HTML5 dashboard with 5 tabs:
 * - Tab 1: 排名 (Rankings)
 * - Tab 2: 最新動態 (News View)
 * - Tab 3: 評分 (Feedback)
 * - Tab 4: 來源評分 (Source Rating)
 * - Tab 5: 分析 (Analytics)
 *
 * Note: This file has been modularized. Backend data functions are in:
 * - dashboardBackend.gs: All get*(), save*(), batch functions, PDF export
 * - constants.gs: DASHBOARD_SHEET_ID and other shared constants
 */

// =====================================================
// WEB APP ENTRY POINT
// =====================================================

/**
 * Serve the HTML dashboard as a web app
 * Deploy as: Web app > Execute as me > Anyone can access
 */
function doGet() {
  return HtmlService.createHtmlOutput(getHtmlDashboard())
    .setTitle("名人聲量監測儀表板")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Show dashboard as modal dialog in Google Sheets
 * Run from: Sheet > Extensions > Apps Script > Run > showDashboard
 */
function showDashboard() {
  const html = HtmlService.createHtmlOutput(getHtmlDashboard())
    .setWidth(1200)
    .setHeight(800);

  SpreadsheetApp.getUi().showModelessDialog(html, '🎬 名人聲量監測儀表板');
}

// =====================================================
// HTML DASHBOARD TEMPLATE
// =====================================================

function getHtmlDashboard() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>名人聲量監測儀表板</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans TC', sans-serif;
      background: #f5f5f5;
      color: #333;
      padding: 20px;
      line-height: 1.8;
      font-size: 16px;
    }

    .container { max-width: 1200px; margin: 0 auto; }

    /* Header */
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px 30px;
      border-radius: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }

    .header h1 { font-size: 26px; font-weight: 700; }
    .header p { font-size: 14px; opacity: 0.9; margin-top: 5px; }

    .refresh-btn {
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.3);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 15px;
      transition: all 0.3s;
    }

    .refresh-btn:hover {
      background: rgba(255,255,255,0.3);
      transform: translateY(-1px);
    }

    .header-buttons {
      display: flex;
      gap: 12px;
    }

    .export-btn {
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.3);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 15px;
      transition: all 0.3s;
    }

    .export-btn:hover {
      background: rgba(255,255,255,0.3);
      transform: translateY(-1px);
    }

    .export-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      background: white;
      padding: 8px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .tab-btn {
      flex: 1;
      padding: 15px 20px;
      background: none;
      border: 2px solid transparent;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      color: #666;
      border-radius: 10px;
      transition: all 0.3s;
    }

    .tab-btn:hover {
      background: #f0f0f0;
      border-color: #ddd;
    }

    .tab-btn.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-color: transparent;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .tab-content {
      display: none;
      animation: fadeIn 0.3s ease;
    }

    .tab-content.active {
      display: block;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* TAB 1: RANKINGS TABLE */
    .rankings-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }

    .rankings-table th {
      background: #f8f9fa;
      padding: 18px 15px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
      color: #666;
      border-bottom: 2px solid #eee;
    }

    .rankings-table td {
      padding: 18px 15px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 15px;
    }

    .rankings-table tr:hover {
      background: #fafafa;
    }

    .rankings-table tr:last-child td {
      border-bottom: none;
    }

    .rank {
      font-weight: 700;
      font-size: 20px;
      color: #667eea;
    }

    .rank-1 { color: #ffd700; }
    .rank-2 { color: #c0c0c0; }
    .rank-3 { color: #cd7f32; }

    /* Endorsement badges */
    .endorsement-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
    }

    .endorsement-badge.ready {
      background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
      color: #155724;
      border: 1px solid #28a745;
    }

    .endorsement-badge.not-ready {
      background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
      color: #721c24;
      border: 1px solid #dc3545;
    }

    /* Risk alert banner */
    .risk-alert-banner {
      background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
      border: 2px solid #dc3545;
      border-radius: 12px;
      padding: 15px 20px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      animation: pulse-border 2s ease-in-out infinite;
    }

    .risk-alert-banner .alert-icon {
      font-size: 24px;
    }

    .risk-alert-banner .alert-text {
      flex: 1;
      font-weight: 600;
      color: #721c24;
    }

    .risk-alert-banner .alert-details {
      font-size: 13px;
      color: #856404;
    }

    @keyframes pulse-border {
      0%, 100% { border-color: #dc3545; }
      50% { border-color: #f5c6cb; }
    }

    .celebrity-name {
      font-weight: 600;
      font-size: 17px;
    }

    .score {
      font-weight: 700;
      font-size: 18px;
      color: #667eea;
    }

    .confidence {
      font-size: 14px;
      color: #888;
      background: #f0f0f0;
      padding: 6px 10px;
      border-radius: 6px;
    }

    .trend {
      font-size: 16px;
      font-weight: 600;
    }

    .trend.up { color: #28a745; }
    .trend.down { color: #dc3545; }
    .trend.stable { color: #6c757d; }

    /* TAB 2: NEWS VIEW */
    .news-container {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }

    .news-header {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #eee;
    }

    .news-header h2 {
      font-size: 22px;
      color: #333;
      margin-bottom: 5px;
    }

    .news-subtitle {
      font-size: 14px;
      color: #888;
    }

    .news-filters {
      display: flex;
      gap: 15px;
      margin-bottom: 25px;
    }

    .news-filters select {
      padding: 12px 16px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 15px;
      background: white;
      cursor: pointer;
      min-width: 160px;
    }

    .news-filters select:focus {
      outline: none;
      border-color: #667eea;
    }

    .news-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }

    .news-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #e9ecef;
      transition: all 0.3s ease;
    }

    .news-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.1);
      border-color: #667eea;
    }

    .news-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .news-celebrity-name {
      font-size: 16px;
      font-weight: 700;
      color: #333;
    }

    .news-platform-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 20px;
      background: #e9ecef;
      color: #666;
    }

    .news-platform-badge.instagram { background: #fce4ec; color: #c2185b; }
    .news-platform-badge.facebook { background: #e3f2fd; color: #1565c0; }
    .news-platform-badge.youtube { background: #ffebee; color: #c62828; }
    .news-platform-badge.tiktok { background: #e8eaf6; color: #3f51b5; }
    .news-platform-badge.news { background: #e8f5e9; color: #2e7d32; }

    .news-content {
      font-size: 15px;
      line-height: 1.7;
      color: #444;
      margin-bottom: 15px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .news-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid #e9ecef;
      font-size: 13px;
      color: #888;
    }

    .news-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
    }

    .news-link:hover {
      text-decoration: underline;
    }

    .news-celebrity-group {
      margin-bottom: 30px;
    }

    .news-celebrity-group-header {
      font-size: 20px;
      font-weight: 700;
      color: #333;
      padding: 15px 0;
      border-bottom: 3px solid #667eea;
      margin-bottom: 20px;
    }

    /* TAB 3: FLASHCARD FEEDBACK (SIMPLIFIED) */
    .flashcard-container {
      background: white;
      border-radius: 12px;
      padding: 35px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.08);
    }

    .flashcard {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border: 2px solid #dee2e6;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 25px;
    }

    .flashcard-meta {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 25px;
    }

    .meta-item {
      background: white;
      padding: 15px;
      border-radius: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .meta-label {
      font-size: 12px;
      color: #888;
      font-weight: 600;
      margin-bottom: 6px;
    }

    .meta-value {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .flashcard-content {
      background: white;
      padding: 25px;
      border-radius: 10px;
      margin-bottom: 20px;
      min-height: 150px;
      font-size: 17px;
      line-height: 2;
      border-left: 5px solid #667eea;
    }

    .feedback-buttons {
      display: flex;
      gap: 20px;
      margin: 30px 0;
    }

    .feedback-buttons button {
      flex: 1;
      padding: 25px 30px;
      border: none;
      border-radius: 16px;
      font-size: 22px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 100px;
    }

    .btn-icon {
      font-size: 32px;
    }

    .btn-good {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
    }

    .btn-good:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(40, 167, 69, 0.4);
    }

    .btn-bad {
      background: linear-gradient(135deg, #dc3545 0%, #e83e8c 100%);
      color: white;
    }

    .btn-bad:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(220, 53, 69, 0.4);
    }

    .btn-skip {
      background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);
      color: white;
    }

    .btn-skip:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(255, 193, 7, 0.4);
    }

    /* Feedback button - LOADING STATE */
    .feedback-buttons button {
      transition: all 0.15s ease;
    }

    .feedback-buttons button:disabled {
      pointer-events: none;
      opacity: 0.6;
    }

    /* When button is clicked - show loading spinner */
    .feedback-buttons button.is-loading {
      background: #555 !important;
      transform: scale(0.95);
      pointer-events: none;
    }

    .feedback-buttons button.is-loading .btn-icon {
      display: none !important;
    }

    .feedback-buttons button.is-loading span:last-child {
      visibility: hidden;
    }

    .feedback-buttons button.is-loading::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 32px;
      height: 32px;
      margin: -16px 0 0 -16px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: btnSpin 0.6s linear infinite;
    }

    .feedback-buttons button.is-loading::after {
      content: '處理中...';
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 14px;
      color: white;
    }

    @keyframes btnSpin {
      to { transform: rotate(360deg); }
    }

    /* SUCCESS state after loading */
    .feedback-buttons button.is-success {
      background: #00c853 !important;
    }

    .feedback-buttons button.is-success .btn-icon {
      display: none !important;
    }

    .feedback-buttons button.is-success span:last-child {
      visibility: hidden;
    }

    .feedback-buttons button.is-success::before {
      content: '✓';
      position: absolute;
      top: 35%;
      left: 50%;
      transform: translateX(-50%);
      font-size: 40px;
      animation: popCheck 0.3s ease;
    }

    .feedback-buttons button.is-success::after {
      content: '已記錄';
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 16px;
      font-weight: bold;
    }

    @keyframes popCheck {
      0% { transform: translateX(-50%) scale(0); }
      60% { transform: translateX(-50%) scale(1.3); }
      100% { transform: translateX(-50%) scale(1); }
    }

    .reason-input {
      width: 100%;
      padding: 15px 18px;
      border: 2px solid #e9ecef;
      border-radius: 10px;
      font-size: 15px;
      resize: vertical;
      min-height: 70px;
      transition: border-color 0.3s;
    }

    .reason-input:focus {
      outline: none;
      border-color: #667eea;
    }

    .nav-buttons {
      display: flex;
      gap: 15px;
      margin-top: 20px;
    }

    .nav-btn {
      flex: 1;
      padding: 15px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .nav-btn:hover {
      background: #5a6fd6;
    }

    .progress-container {
      margin-top: 30px;
      padding-top: 25px;
      border-top: 1px solid #eee;
    }

    .progress-bar {
      height: 14px;
      background: #e9ecef;
      border-radius: 7px;
      overflow: hidden;
      margin-bottom: 12px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      border-radius: 7px;
      transition: width 0.5s ease;
    }

    .progress-text {
      text-align: center;
      font-size: 16px;
      font-weight: 600;
      color: #667eea;
    }

    /* TAB 4: ANALYTICS */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 25px;
    }

    .metric-card {
      background: white;
      padding: 28px;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      transition: transform 0.3s;
    }

    .metric-card:hover {
      transform: translateY(-3px);
    }

    .metric-label {
      font-size: 14px;
      color: #888;
      font-weight: 600;
      margin-bottom: 10px;
    }

    .metric-value {
      font-size: 40px;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .metric-trend {
      font-size: 14px;
      color: #28a745;
      margin-top: 10px;
      font-weight: 500;
    }

    .alert {
      padding: 18px 22px;
      border-radius: 12px;
      margin-bottom: 15px;
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .alert.warning {
      background: #fff3cd;
      border: 1px solid #ffc107;
      color: #856404;
    }

    .alert.danger {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
    }

    .alert.success {
      background: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
    }

    /* Loading state */
    .loading {
      text-align: center;
      padding: 50px;
      color: #888;
      font-size: 16px;
    }

    .loading::after {
      content: '';
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid #667eea;
      border-radius: 50%;
      border-top-color: transparent;
      animation: spin 1s linear infinite;
      margin-left: 12px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #888;
    }

    .empty-state h3 {
      margin-bottom: 10px;
      color: #666;
      font-size: 18px;
    }

    /* Hidden elements */
    .hidden {
      display: none !important;
    }

    /* TAB 5: SOURCE RATING */
    .sources-container {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }

    .sources-header {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #eee;
    }

    .sources-header h2 {
      font-size: 22px;
      color: #333;
      margin-bottom: 5px;
    }

    .sources-subtitle {
      font-size: 14px;
      color: #888;
    }

    .sources-filters {
      display: flex;
      gap: 15px;
      margin-bottom: 25px;
      flex-wrap: wrap;
    }

    .sources-filters select {
      padding: 12px 16px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 15px;
      background: white;
      cursor: pointer;
      min-width: 160px;
    }

    .sources-filters select:focus {
      outline: none;
      border-color: #667eea;
    }

    .sources-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }

    .source-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      border: 2px solid #e9ecef;
      transition: all 0.3s ease;
    }

    .source-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.1);
      border-color: #667eea;
    }

    .source-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .source-name {
      font-size: 18px;
      font-weight: 700;
      color: #333;
      word-break: break-all;
    }

    .source-type-badge {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 12px;
      background: #e9ecef;
      color: #666;
      white-space: nowrap;
    }

    .source-type-badge.official { background: #d4edda; color: #155724; }
    .source-type-badge.fan { background: #cce5ff; color: #004085; }
    .source-type-badge.media { background: #fff3cd; color: #856404; }

    .source-platform {
      font-size: 13px;
      color: #888;
      margin-bottom: 15px;
    }

    .source-rating {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .star-btn {
      background: none;
      border: none;
      font-size: 28px;
      cursor: pointer;
      transition: all 0.2s;
      padding: 0;
      color: #ddd;
    }

    .star-btn:hover {
      transform: scale(1.2);
    }

    .star-btn.active {
      color: #ffc107;
    }

    .star-btn.hover {
      color: #ffdb4d;
    }

    .source-meta {
      font-size: 12px;
      color: #aaa;
      padding-top: 10px;
      border-top: 1px solid #e9ecef;
    }

    .source-save-indicator {
      display: inline-block;
      margin-left: 10px;
      font-size: 12px;
      color: #28a745;
      opacity: 0;
      transition: opacity 0.3s;
    }

    .source-save-indicator.show {
      opacity: 1;
    }

    /* Trend velocity styles (Fix 8) */
    .trend.fast-up {
      color: #155724;
      font-weight: 700;
      background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
      padding: 4px 8px;
      border-radius: 4px;
    }

    .trend.fast-down {
      color: #721c24;
      font-weight: 700;
      background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
      padding: 4px 8px;
      border-radius: 4px;
    }

    /* Celebrity Comparison Modal (Fix 6) */
    .comparison-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    }

    .comparison-overlay.active {
      opacity: 1;
      visibility: visible;
    }

    .comparison-modal {
      background: white;
      border-radius: 16px;
      padding: 30px;
      max-width: 800px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      animation: modalSlideIn 0.3s ease;
    }

    @keyframes modalSlideIn {
      from { transform: translateY(-30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .comparison-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 2px solid #eee;
    }

    .comparison-header h2 {
      font-size: 22px;
      color: #333;
    }

    .close-modal-btn {
      background: none;
      border: none;
      font-size: 28px;
      cursor: pointer;
      color: #999;
      transition: color 0.2s;
    }

    .close-modal-btn:hover {
      color: #333;
    }

    .comparison-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 25px;
    }

    .comparison-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      border: 2px solid #e9ecef;
    }

    .comparison-card-header {
      text-align: center;
      margin-bottom: 20px;
    }

    .comparison-card-header h3 {
      font-size: 20px;
      color: #333;
      margin-bottom: 5px;
    }

    .comparison-rank {
      font-size: 14px;
      color: #667eea;
      font-weight: 600;
    }

    .comparison-score-bar {
      background: #e9ecef;
      border-radius: 8px;
      height: 30px;
      margin: 15px 0;
      overflow: hidden;
      position: relative;
    }

    .comparison-score-fill {
      height: 100%;
      border-radius: 8px;
      transition: width 0.5s ease;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 10px;
      color: white;
      font-weight: 600;
      font-size: 14px;
    }

    .comparison-score-fill.positive {
      background: linear-gradient(90deg, #28a745, #20c997);
    }

    .comparison-score-fill.negative {
      background: linear-gradient(90deg, #dc3545, #e83e8c);
    }

    .comparison-stat {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e9ecef;
    }

    .comparison-stat:last-child {
      border-bottom: none;
    }

    .comparison-stat-label {
      color: #666;
      font-size: 14px;
    }

    .comparison-stat-value {
      font-weight: 600;
      color: #333;
    }

    .comparison-source-breakdown {
      margin-top: 15px;
    }

    .comparison-source-breakdown h4 {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
    }

    .source-bar-container {
      margin-bottom: 8px;
    }

    .source-bar-label {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }

    .source-bar {
      background: #e9ecef;
      border-radius: 4px;
      height: 8px;
      overflow: hidden;
    }

    .source-bar-fill {
      height: 100%;
      border-radius: 4px;
      background: #667eea;
    }

    .compare-checkbox {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .compare-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 15px 25px;
      border-radius: 30px;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      display: none;
      z-index: 100;
      transition: all 0.3s;
    }

    .compare-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
    }

    .compare-btn.visible {
      display: block;
    }

    /* Accuracy Chart Container (Fix 7) */
    .accuracy-chart-container {
      background: white;
      border-radius: 12px;
      padding: 25px;
      margin-top: 20px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }

    .accuracy-chart-container h3 {
      font-size: 18px;
      color: #333;
      margin-bottom: 15px;
    }

    #accuracyChart {
      width: 100%;
      height: 300px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>🎬 名人聲量監測儀表板</h1>
        <p>台灣市場分析 | 最後更新：<span id="lastUpdate">載入中...</span></p>
      </div>
      <div class="header-buttons">
        <button class="export-btn" onclick="exportToPdf()">📄 匯出 PDF</button>
        <button class="refresh-btn" onclick="location.reload()">🔄 重新整理</button>
      </div>
    </div>

    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('rankings')">📊 排名</button>
      <button class="tab-btn" onclick="switchTab('news')">📰 最新動態</button>
      <button class="tab-btn" onclick="switchTab('feedback')">⭐ 評分</button>
      <button class="tab-btn" onclick="switchTab('sources')">🎯 來源評分</button>
      <button class="tab-btn" onclick="switchTab('analytics')">📈 分析</button>
    </div>

    <!-- TAB 1: 排名 (RANKINGS) -->
    <div id="rankings" class="tab-content active">
      <div id="riskAlertContainer"></div>
      <table class="rankings-table">
        <thead>
          <tr>
            <th>比較</th>
            <th>排名</th>
            <th>名人</th>
            <th>綜合分數</th>
            <th>可信度</th>
            <th>趨勢</th>
            <th>代言狀態</th>
          </tr>
        </thead>
        <tbody id="rankingsBody">
          <tr><td colspan="7" class="loading">載入中...</td></tr>
        </tbody>
      </table>
      <button class="compare-btn" id="compareBtn" onclick="openComparison()">🔄 比較選中名人</button>
    </div>

    <!-- Comparison Modal (Fix 6) -->
    <div class="comparison-overlay" id="comparisonOverlay" onclick="closeComparisonOnOverlay(event)">
      <div class="comparison-modal" onclick="event.stopPropagation()">
        <div class="comparison-header">
          <h2>📊 名人比較</h2>
          <button class="close-modal-btn" onclick="closeComparison()">&times;</button>
        </div>
        <div class="comparison-cards" id="comparisonCards">
          <!-- Comparison content will be injected here -->
        </div>
      </div>
    </div>

    <!-- TAB 2: 最新動態 (NEWS VIEW - NEW) -->
    <div id="news" class="tab-content">
      <div class="news-container">
        <div class="news-header">
          <h2>📰 最新動態</h2>
          <p class="news-subtitle">近期名人相關新聞與社群貼文</p>
        </div>
        <div class="news-filters">
          <select id="celebrityFilter" onchange="filterNews()">
            <option value="all">全部名人</option>
          </select>
          <select id="platformFilter" onchange="filterNews()">
            <option value="all">全部平台</option>
            <option value="Instagram">Instagram</option>
            <option value="Facebook">Facebook</option>
            <option value="YouTube">YouTube</option>
            <option value="TikTok">TikTok</option>
            <option value="News">新聞</option>
          </select>
        </div>
        <div id="newsGrid" class="news-grid">
          <div class="loading">載入中...</div>
        </div>
      </div>
    </div>

    <!-- TAB 3: 評分 (FEEDBACK - SIMPLIFIED) -->
    <div id="feedback" class="tab-content">
      <div class="flashcard-container">
        <div class="flashcard">
          <div class="flashcard-meta">
            <div class="meta-item">
              <div class="meta-label">平台</div>
              <div class="meta-value" id="post-platform">-</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">名人</div>
              <div class="meta-value" id="post-celebrity">-</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">日期</div>
              <div class="meta-value" id="post-date">-</div>
            </div>
          </div>

          <div class="flashcard-content" id="post-content">
            點擊「下一則」開始審核貼文...
          </div>

          <!-- Hidden field for post ID (needed for backend) -->
          <input type="hidden" id="post-id" value="-">
        </div>

        <div class="feedback-buttons">
          <button class="btn-good" onclick="submitFeedback('Good', this)">
            <span class="btn-icon">👍</span>
            <span>好評</span>
          </button>
          <button class="btn-bad" onclick="submitFeedback('Bad', this)">
            <span class="btn-icon">👎</span>
            <span>負評</span>
          </button>
          <button class="btn-skip" onclick="submitFeedback('Skip', this)">
            <span class="btn-icon">➡️</span>
            <span>跳過</span>
          </button>
        </div>

        <textarea class="reason-input" id="badReason"
          placeholder="如果選擇「負評」，請說明原因（例如：諷刺未被識別、垃圾訊息、重複內容、不相關）..."></textarea>

        <div class="nav-buttons">
          <button class="nav-btn" onclick="loadPrevPost()">← 上一則</button>
          <button class="nav-btn" onclick="loadNextPost()">下一則 →</button>
        </div>

        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" id="progressFill" style="width: 0%"></div>
          </div>
          <div class="progress-text">
            已審核 <span id="reviewCount">0</span> / <span id="totalCount">0</span> 則
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 4: 分析 (ANALYTICS) -->
    <div id="analytics" class="tab-content">
      <div id="alertsContainer"></div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">模型準確度</div>
          <div class="metric-value" id="accuracy">-</div>
          <div class="metric-trend" id="accuracyTrend">-</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">訓練資料</div>
          <div class="metric-value" id="trainingData">-</div>
          <div class="metric-trend">已標記的貼文數</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">好評比例</div>
          <div class="metric-value" id="goodRatio">-</div>
          <div class="metric-trend">資料品質指標</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">上次執行</div>
          <div class="metric-value" id="lastRun">-</div>
          <div class="metric-trend" id="lastRunStatus">-</div>
        </div>
      </div>

      <!-- Accuracy Trend Chart (Fix 7) -->
      <div class="accuracy-chart-container">
        <h3>📈 準確度趨勢 (最近 7 次執行)</h3>
        <div id="accuracyChart"></div>
      </div>
    </div>

    <!-- TAB 5: 來源評分 (SOURCE RATING) -->
    <div id="sources" class="tab-content">
      <div class="sources-container">
        <div class="sources-header">
          <h2>🎯 來源評分</h2>
          <p class="sources-subtitle">為各個來源設定重要性分數 (1-5 星)，系統會自動記住您的設定</p>
        </div>
        <div class="sources-filters">
          <select id="sourcePlatformFilter" onchange="filterSources()">
            <option value="all">全部平台</option>
            <option value="Instagram">Instagram</option>
            <option value="Facebook">Facebook</option>
            <option value="YouTube">YouTube</option>
            <option value="TikTok">TikTok</option>
            <option value="News">新聞</option>
          </select>
          <select id="sourceTypeFilter" onchange="filterSources()">
            <option value="all">全部類型</option>
            <option value="官方">官方帳號</option>
            <option value="粉絲">粉絲帳號</option>
            <option value="媒體">媒體</option>
            <option value="其他">其他</option>
          </select>
        </div>
        <div id="sourcesGrid" class="sources-grid">
          <div class="loading">載入中...</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Google Charts Library (Fix 7) -->
  <script src="https://www.gstatic.com/charts/loader.js"></script>

  <script>
    // ==========================================
    // GLOBAL STATE WITH CACHING
    // ==========================================
    let currentPostIndex = 0;
    let posts = [];
    let currentTab = 'rankings';
    let selectedForComparison = [];  // Fix 6: Track selected celebrities
    let chartsLoaded = false;  // Fix 7: Track Google Charts loading

    // Unified data cache - loaded once, used everywhere
    let dataCache = {
      results: [],
      news: { posts: [], celebrities: [] },
      sources: [],
      analytics: null,
      accuracyHistory: [],  // Fix 7: Accuracy trend data
      progress: { reviewed: 0, total: 0 },
      timestamp: 0,
      loaded: false
    };
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    // Load Google Charts (Fix 7)
    google.charts.load('current', {'packages':['corechart']});
    google.charts.setOnLoadCallback(function() {
      chartsLoaded = true;
      if (dataCache.loaded && currentTab === 'analytics') {
        renderAccuracyChart(dataCache.accuracyHistory);
      }
    });

    // Batch queues for reducing API calls
    let feedbackBatch = [];
    let pendingSourceRatings = {};

    // Legacy aliases for compatibility
    let allNewsData = [];
    let allSourcesData = [];

    // XSS Prevention - escape HTML in user content
    function escapeHtml(text) {
      if (text === null || text === undefined) return '';
      const div = document.createElement('div');
      div.textContent = String(text);
      return div.innerHTML;
    }

    // ==========================================
    // UTILITY HELPERS
    // ==========================================
    function debounce(func, wait) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    }

    function isCacheValid() {
      return dataCache.loaded && (Date.now() - dataCache.timestamp < CACHE_TTL);
    }

    function showGlobalLoading(show) {
      document.getElementById('lastUpdate').textContent = show ? '載入中...' : new Date().toLocaleString('zh-TW');
    }

    // ==========================================
    // PRELOADING - Single API call loads ALL data
    // ==========================================
    function preloadAllData() {
      showGlobalLoading(true);
      google.script.run
        .withSuccessHandler(function(data) {
          // Store everything in cache
          dataCache = {
            results: data.results || [],
            news: data.news || { posts: [], celebrities: [] },
            sources: data.sources || [],
            analytics: data.analytics || null,
            accuracyHistory: data.accuracyHistory || [],  // Fix 7
            progress: data.progress || { reviewed: 0, total: 0 },
            config: data.config || { accuracyThreshold: 85 },  // Config from backend
            timestamp: Date.now(),
            loaded: true
          };

          // Update legacy aliases
          allNewsData = dataCache.news.posts;
          allSourcesData = dataCache.sources;
          posts = data.feedback ? data.feedback.posts || [] : [];

          showGlobalLoading(false);
          renderCurrentTab();
        })
        .withFailureHandler(function(error) {
          showGlobalLoading(false);
          console.error('Preload failed:', error);
          // Fallback to individual loads
          loadRankings();
        })
        .getAllDashboardData();
    }

    function renderCurrentTab() {
      renderTab(currentTab);
    }

    // ==========================================
    // TAB SWITCHING - Uses cached data (instant!)
    // ==========================================
    function switchTab(tabName) {
      // Flush pending saves when switching tabs
      flushPendingFeedback();
      flushPendingSourceRatings();

      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

      document.getElementById(tabName).classList.add('active');
      event.target.classList.add('active');
      currentTab = tabName;

      // Use cached data - instant render, no API calls!
      if (isCacheValid()) {
        renderTab(tabName);
      } else {
        preloadAllData();
      }
    }

    function renderTab(tabName) {
      if (tabName === 'rankings') renderRankings(dataCache.results);
      if (tabName === 'news') renderNewsFromCache();
      if (tabName === 'feedback') renderFeedbackFromCache();
      if (tabName === 'sources') renderSourcesFromCache();
      if (tabName === 'analytics') renderAnalytics(dataCache.analytics);
    }

    // ==========================================
    // TAB 1: 排名 (Rankings)
    // ==========================================
    function renderRankings(results) {
      const tbody = document.getElementById('rankingsBody');
      const riskContainer = document.getElementById('riskAlertContainer');

      if (!results || results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><h3>尚無排名資料</h3><p>請執行資料擷取流程</p></td></tr>';
        if (riskContainer) riskContainer.innerHTML = '';
        return;
      }

      // Check for risk flags and render alert banner (Fix 4)
      const riskyResults = results.filter(r => r.riskFlag === 'Yes');
      if (riskContainer) {
        if (riskyResults.length > 0) {
          const riskyNames = riskyResults.map(r => r.celebrity).join('、');
          riskContainer.innerHTML = \`
            <div class="risk-alert-banner">
              <span class="alert-icon">⚠️</span>
              <div>
                <div class="alert-text">聲量警告：偵測到負面趨勢</div>
                <div class="alert-details">以下名人近期聲量下跌超過 20%：\${escapeHtml(riskyNames)}</div>
              </div>
            </div>
          \`;
        } else {
          riskContainer.innerHTML = '';
        }
      }

      // Reset comparison selection
      selectedForComparison = [];
      updateCompareButton();

      tbody.innerHTML = results.map(r => {
        const rankClass = r.rank <= 3 ? 'rank-' + r.rank : '';
        const trend = r.trend || '→ 持平';

        // Fix 8: Handle trend velocity levels
        let trendClass = 'stable';
        let trendText = '→ 持平';
        if (trend.includes('🚀') || trend.includes('Fast Rising')) {
          trendClass = 'fast-up';
          trendText = '🚀 快速上升';
        } else if (trend.includes('📉') || trend.includes('Fast Falling')) {
          trendClass = 'fast-down';
          trendText = '📉 快速下降';
        } else if (trend.includes('↑') || trend.includes('Rising')) {
          trendClass = 'up';
          trendText = '↑ 上升';
        } else if (trend.includes('↓') || trend.includes('Falling')) {
          trendClass = 'down';
          trendText = '↓ 下降';
        }

        // Endorsement badge (Fix 2)
        const isReady = r.endorsement === 'Yes';
        const endorsementBadge = isReady
          ? '<span class="endorsement-badge ready">✓ 可代言</span>'
          : '<span class="endorsement-badge not-ready">✗ 待觀察</span>';

        return \`
          <tr>
            <td><input type="checkbox" class="compare-checkbox" data-celebrity="\${escapeHtml(r.celebrity)}" onchange="toggleComparison(this, \${r.rank - 1})"></td>
            <td><span class="rank \${rankClass}">#\${escapeHtml(r.rank)}</span></td>
            <td class="celebrity-name">\${escapeHtml(r.celebrity)}</td>
            <td class="score">\${typeof r.score === 'number' ? r.score.toFixed(2) : escapeHtml(r.score)}</td>
            <td><span class="confidence">\${escapeHtml(r.confidence)}%</span></td>
            <td class="trend \${trendClass}">\${escapeHtml(trendText)}</td>
            <td>\${endorsementBadge}</td>
          </tr>
        \`;
      }).join('');
    }

    // Fallback loader (used if preload fails)
    function loadRankings() {
      google.script.run
        .withSuccessHandler(function(results) {
          dataCache.results = results || [];
          renderRankings(dataCache.results);
        })
        .withFailureHandler(function(error) {
          document.getElementById('rankingsBody').innerHTML =
            '<tr><td colspan="5" class="empty-state"><h3>載入失敗</h3><p>' + escapeHtml(error.message) + '</p></td></tr>';
        })
        .getResults();
    }

    // ==========================================
    // TAB 2: 最新動態 (News View)
    // ==========================================
    function renderNewsFromCache() {
      allNewsData = dataCache.news.posts || [];
      populateCelebrityFilter(dataCache.news.celebrities || []);
      renderNewsCards(allNewsData);
    }

    // Fallback loader
    function loadNewsData() {
      document.getElementById('newsGrid').innerHTML = '<div class="loading">載入中...</div>';

      google.script.run
        .withSuccessHandler(function(data) {
          dataCache.news = data;
          allNewsData = data.posts || [];
          populateCelebrityFilter(data.celebrities || []);
          renderNewsCards(allNewsData);
        })
        .withFailureHandler(function(error) {
          document.getElementById('newsGrid').innerHTML =
            '<div class="empty-state"><h3>載入失敗</h3><p>' + escapeHtml(error.message) + '</p></div>';
        })
        .getNewsData();
    }

    function populateCelebrityFilter(celebrities) {
      const select = document.getElementById('celebrityFilter');
      select.innerHTML = '<option value="all">全部名人</option>';
      celebrities.forEach(c => {
        select.innerHTML += '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>';
      });
    }

    function filterNews() {
      const celebrity = document.getElementById('celebrityFilter').value;
      const platform = document.getElementById('platformFilter').value;

      let filtered = allNewsData;

      if (celebrity !== 'all') {
        filtered = filtered.filter(p => p.celebrity === celebrity);
      }
      if (platform !== 'all') {
        filtered = filtered.filter(p => p.platform === platform);
      }

      renderNewsCards(filtered);
    }

    function renderNewsCards(posts) {
      const grid = document.getElementById('newsGrid');

      if (!posts || posts.length === 0) {
        grid.innerHTML = '<div class="empty-state"><h3>目前無最新動態</h3><p>請稍後再查看</p></div>';
        return;
      }

      // Group by celebrity
      const grouped = {};
      posts.forEach(post => {
        if (!grouped[post.celebrity]) {
          grouped[post.celebrity] = [];
        }
        grouped[post.celebrity].push(post);
      });

      let html = '';

      Object.keys(grouped).forEach(celebrity => {
        html += '<div class="news-celebrity-group">';
        html += '<div class="news-celebrity-group-header">🎤 ' + escapeHtml(celebrity) + '</div>';
        html += '<div class="news-grid">';

        grouped[celebrity].slice(0, 6).forEach(post => {
          const platformClass = post.platform.toLowerCase().replace(' ', '');

          html += \`
            <div class="news-card">
              <div class="news-card-header">
                <span class="news-celebrity-name">\${escapeHtml(post.celebrity)}</span>
                <span class="news-platform-badge \${platformClass}">\${escapeHtml(post.platform)}</span>
              </div>
              <div class="news-content">\${escapeHtml(post.content)}</div>
              <div class="news-card-footer">
                <span>📅 \${escapeHtml(post.date)}</span>
                <a href="\${post.url}" target="_blank" class="news-link">查看原文 →</a>
              </div>
            </div>
          \`;
        });

        html += '</div></div>';
      });

      grid.innerHTML = html;
    }

    // ==========================================
    // TAB 3: 評分 (Feedback - Optimized with batching)
    // ==========================================
    function renderFeedbackFromCache() {
      updateProgress(dataCache.progress);
      if (posts.length > 0) {
        displayPost(0);
      } else {
        document.getElementById('post-content').textContent = '已審核完畢！🎉 感謝您的協助！';
      }
    }

    // Fallback loader
    function loadFeedbackData() {
      google.script.run
        .withSuccessHandler(function(data) {
          posts = data.posts || [];
          dataCache.progress = data.progress || { reviewed: 0, total: 0 };
          updateProgress(dataCache.progress);
          if (posts.length > 0) {
            displayPost(0);
          } else {
            document.getElementById('post-content').textContent = '已審核完畢！🎉 感謝您的協助！';
          }
        })
        .getFeedbackData();
    }

    function displayPost(index) {
      if (index < 0 || index >= posts.length) return;

      currentPostIndex = index;
      const post = posts[index];

      document.getElementById('post-platform').textContent = post.platform || '-';
      document.getElementById('post-celebrity').textContent = post.celebrity || '-';
      document.getElementById('post-date').textContent = post.date || '-';
      document.getElementById('post-id').value = post.id || '-';
      document.getElementById('post-content').textContent = post.content || '-';
      document.getElementById('badReason').value = '';
    }

    function loadNextPost() {
      if (currentPostIndex < posts.length - 1) {
        displayPost(currentPostIndex + 1);
      } else {
        // Flush any pending feedback before refreshing
        flushPendingFeedback();
        loadFeedbackData();
      }
    }

    function loadPrevPost() {
      if (currentPostIndex > 0) {
        displayPost(currentPostIndex - 1);
      }
    }

    // Feedback with clear loading indicator
    function submitFeedback(feedback, clickedBtn) {
      const postId = document.getElementById('post-id').value;
      const reason = feedback === 'Bad' ? document.getElementById('badReason').value : '';

      if (postId === '-') {
        alert('請先選擇貼文');
        return;
      }

      // === STEP 1: IMMEDIATE - Show loading spinner ===
      const buttons = document.querySelectorAll('.feedback-buttons button');
      buttons.forEach(btn => btn.disabled = true);
      clickedBtn.classList.add('is-loading');

      // Add to batch queue (background save)
      feedbackBatch.push({ postId, feedback, reason });

      // Update progress counter locally
      dataCache.progress.reviewed++;
      updateProgress(dataCache.progress);

      // Remove from local posts array
      posts.splice(currentPostIndex, 1);

      // === STEP 2: After 300ms - Show success checkmark ===
      setTimeout(function() {
        clickedBtn.classList.remove('is-loading');
        clickedBtn.classList.add('is-success');
      }, 300);

      // === STEP 3: After 600ms - Move to next post ===
      setTimeout(function() {
        clickedBtn.classList.remove('is-success');
        buttons.forEach(btn => btn.disabled = false);

        if (posts.length > 0) {
          displayPost(Math.min(currentPostIndex, posts.length - 1));
        } else {
          document.getElementById('post-content').textContent = '已審核完畢！🎉 感謝您的協助！';
        }
      }, 600);

      // Batch save in background
      if (feedbackBatch.length >= 5) {
        flushPendingFeedback();
      } else {
        debouncedFlushFeedback();
      }
    }

    // Debounced flush - saves after 3s of inactivity
    const debouncedFlushFeedback = debounce(flushPendingFeedback, 3000);

    function flushPendingFeedback() {
      if (feedbackBatch.length === 0) return;

      const batch = [...feedbackBatch];
      feedbackBatch = [];

      google.script.run
        .withSuccessHandler(function() {
          // Batch saved successfully
        })
        .withFailureHandler(function(error) {
          console.error('Batch save failed:', error);
          // Re-add failed items for retry
          feedbackBatch = batch.concat(feedbackBatch);
        })
        .saveFeedbackBatch(batch);
    }

    function updateProgress(progress) {
      if (!progress) return;
      document.getElementById('reviewCount').textContent = progress.reviewed || 0;
      document.getElementById('totalCount').textContent = progress.total || 0;
      const pct = progress.total > 0 ? (progress.reviewed / progress.total * 100) : 0;
      document.getElementById('progressFill').style.width = pct + '%';
    }

    // ==========================================
    // TAB 4: 分析 (Analytics)
    // ==========================================
    function renderAnalytics(analytics) {
      if (!analytics) {
        document.getElementById('accuracy').textContent = '-';
        return;
      }

      // Get threshold from analytics or config cache, default to 85
      const threshold = analytics.accuracyThreshold || (dataCache.config && dataCache.config.accuracyThreshold) || 85;

      document.getElementById('accuracy').textContent = (analytics.accuracy || 0) + '%';
      document.getElementById('accuracyTrend').textContent = analytics.accuracyTrend || '-';
      document.getElementById('trainingData').textContent = analytics.trainingData || 0;
      document.getElementById('goodRatio').textContent = (analytics.goodRatio || 0) + '%';
      document.getElementById('lastRun').textContent = analytics.lastRun || '-';
      document.getElementById('lastRunStatus').textContent = analytics.lastRunStatus || '-';

      // Show alerts in Chinese
      const alertsContainer = document.getElementById('alertsContainer');
      alertsContainer.innerHTML = '';

      if (analytics.accuracy < threshold) {
        alertsContainer.innerHTML += \`
          <div class="alert danger">
            ⚠️ 模型準確度 (\${analytics.accuracy}%) 低於門檻值 (\${threshold}%)。建議收集更多評分資料。
          </div>
        \`;
      }

      if (analytics.goodRatio < 75) {
        alertsContainer.innerHTML += \`
          <div class="alert warning">
            ⚠️ 好評比例 (\${analytics.goodRatio}%) 低於 75%。請檢查資料品質。
          </div>
        \`;
      }

      if (analytics.accuracy >= 90) {
        alertsContainer.innerHTML += \`
          <div class="alert success">
            ✓ 模型準確度優異 (\${analytics.accuracy}%)。系統運作正常。
          </div>
        \`;
      }

      // Fix 7: Render accuracy trend chart
      if (chartsLoaded && dataCache.accuracyHistory) {
        renderAccuracyChart(dataCache.accuracyHistory);
      }
    }

    // Fix 7: Render Accuracy Trend Chart
    function renderAccuracyChart(historyData) {
      if (!chartsLoaded || !historyData || historyData.length === 0) {
        document.getElementById('accuracyChart').innerHTML = '<div class="empty-state"><p>尚無歷史資料</p></div>';
        return;
      }

      // Get threshold from config cache, default to 85
      const threshold = (dataCache.config && dataCache.config.accuracyThreshold) || 85;

      // Prepare data for Google Charts
      const data = new google.visualization.DataTable();
      data.addColumn('string', '日期');
      data.addColumn('number', '準確度 (%)');
      data.addColumn('number', '門檻 (' + threshold + '%)');

      historyData.forEach(row => {
        data.addRow([row.date, row.accuracy, threshold]);
      });

      const options = {
        title: '',
        curveType: 'function',
        legend: { position: 'bottom' },
        hAxis: {
          title: '執行日期',
          textStyle: { fontSize: 12 }
        },
        vAxis: {
          title: '準確度 (%)',
          minValue: 0,
          maxValue: 100,
          gridlines: { count: 5 }
        },
        series: {
          0: { color: '#667eea', lineWidth: 3 },
          1: { color: '#dc3545', lineWidth: 2, lineDashStyle: [4, 4] }
        },
        chartArea: { width: '85%', height: '70%' },
        animation: {
          startup: true,
          duration: 500,
          easing: 'out'
        }
      };

      const chart = new google.visualization.LineChart(document.getElementById('accuracyChart'));
      chart.draw(data, options);
    }

    // Fallback loader
    function loadAnalytics() {
      google.script.run
        .withSuccessHandler(function(analytics) {
          dataCache.analytics = analytics;
          renderAnalytics(analytics);
        })
        .withFailureHandler(function(error) {
          console.error('載入分析資料失敗:', error);
        })
        .getAnalytics();
    }

    // ==========================================
    // TAB 5: 來源評分 (Source Rating - Optimized)
    // ==========================================
    function renderSourcesFromCache() {
      allSourcesData = dataCache.sources || [];
      renderSourceCards(allSourcesData);
    }

    // Fallback loader
    function loadSourcesData() {
      document.getElementById('sourcesGrid').innerHTML = '<div class="loading">載入中...</div>';

      google.script.run
        .withSuccessHandler(function(data) {
          dataCache.sources = data || [];
          allSourcesData = dataCache.sources;
          renderSourceCards(allSourcesData);
        })
        .withFailureHandler(function(error) {
          document.getElementById('sourcesGrid').innerHTML =
            '<div class="empty-state"><h3>載入失敗</h3><p>' + escapeHtml(error.message) + '</p></div>';
        })
        .getSourcesData();
    }

    function filterSources() {
      const platform = document.getElementById('sourcePlatformFilter').value;
      const type = document.getElementById('sourceTypeFilter').value;

      let filtered = allSourcesData;

      if (platform !== 'all') {
        filtered = filtered.filter(s => s.platform === platform);
      }
      if (type !== 'all') {
        filtered = filtered.filter(s => s.sourceType === type);
      }

      renderSourceCards(filtered);
    }

    function renderSourceCards(sources) {
      const grid = document.getElementById('sourcesGrid');

      if (!sources || sources.length === 0) {
        grid.innerHTML = '<div class="empty-state"><h3>目前無來源資料</h3><p>資料擷取後會自動新增來源</p></div>';
        return;
      }

      let html = '';

      sources.forEach((source, idx) => {
        const typeClass = source.sourceType === '官方' ? 'official' :
                          source.sourceType === '粉絲' ? 'fan' :
                          source.sourceType === '媒體' ? 'media' : '';

        const rating = source.rating || 3;
        const stars = renderStars(rating, idx);

        html += \`
          <div class="source-card" id="source-card-\${idx}">
            <div class="source-card-header">
              <span class="source-name">\${escapeHtml(source.name)}</span>
              <span class="source-type-badge \${typeClass}">\${escapeHtml(source.sourceType)}</span>
            </div>
            <div class="source-platform">📱 \${escapeHtml(source.platform)}</div>
            <div class="source-rating" id="rating-\${idx}">
              \${stars}
              <span class="source-save-indicator" id="save-indicator-\${idx}">✓ 已儲存</span>
            </div>
            <div class="source-meta">
              評分者：\${escapeHtml(source.ratedBy || 'auto')} |
              更新：\${escapeHtml(source.lastModified || '-')}
            </div>
          </div>
        \`;
      });

      grid.innerHTML = html;

      // Add hover effects for stars
      sources.forEach((source, idx) => {
        const starBtns = document.querySelectorAll('#rating-' + idx + ' .star-btn');
        starBtns.forEach((btn, starIdx) => {
          btn.addEventListener('mouseenter', function() {
            highlightStars(idx, starIdx + 1);
          });
          btn.addEventListener('mouseleave', function() {
            resetStars(idx, source.rating || 3);
          });
        });
      });
    }

    function renderStars(rating, idx) {
      let html = '';
      for (let i = 1; i <= 5; i++) {
        const activeClass = i <= rating ? 'active' : '';
        html += \`<button class="star-btn \${activeClass}" onclick="rateSource(\${idx}, \${i})">★</button>\`;
      }
      return html;
    }

    function highlightStars(idx, hoverRating) {
      const starBtns = document.querySelectorAll('#rating-' + idx + ' .star-btn');
      starBtns.forEach((btn, i) => {
        btn.classList.remove('active', 'hover');
        if (i < hoverRating) {
          btn.classList.add('hover');
        }
      });
    }

    function resetStars(idx, rating) {
      const starBtns = document.querySelectorAll('#rating-' + idx + ' .star-btn');
      starBtns.forEach((btn, i) => {
        btn.classList.remove('hover');
        if (i < rating) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    // OPTIMIZED: Debounced batch rating - collects ratings and saves in batch
    function rateSource(idx, rating) {
      const source = allSourcesData[idx];
      if (!source) return;

      // Update local state immediately
      source.rating = rating;
      resetStars(idx, rating);

      // Show pending indicator
      const indicator = document.getElementById('save-indicator-' + idx);
      indicator.textContent = '待儲存...';
      indicator.classList.add('show');

      // Add to pending batch (keyed to prevent duplicates)
      pendingSourceRatings[\`\${source.name}|\${source.platform}\`] = {
        name: source.name,
        platform: source.platform,
        rating: rating,
        idx: idx
      };

      // Debounce: save after 2s of inactivity
      debouncedFlushSourceRatings();
    }

    // Debounced flush for source ratings
    const debouncedFlushSourceRatings = debounce(flushPendingSourceRatings, 2000);

    function flushPendingSourceRatings() {
      const ratings = Object.values(pendingSourceRatings);
      if (ratings.length === 0) return;

      // Clear pending
      const toSave = [...ratings];
      pendingSourceRatings = {};

      // Update indicators to "saving"
      toSave.forEach(r => {
        const indicator = document.getElementById('save-indicator-' + r.idx);
        if (indicator) indicator.textContent = '儲存中...';
      });

      google.script.run
        .withSuccessHandler(function() {
          toSave.forEach(r => {
            const indicator = document.getElementById('save-indicator-' + r.idx);
            if (indicator) {
              indicator.textContent = '✓ 已儲存';
              setTimeout(() => indicator.classList.remove('show'), 2000);
            }

            // Update meta
            const source = allSourcesData[r.idx];
            if (source) {
              source.ratedBy = 'user';
              source.lastModified = new Date().toLocaleDateString('zh-TW');
              const card = document.getElementById('source-card-' + r.idx);
              if (card) {
                const meta = card.querySelector('.source-meta');
                if (meta) meta.innerHTML = \`評分者：user | 更新：\${source.lastModified}\`;
              }
            }
          });
          // Batch source ratings saved successfully
        })
        .withFailureHandler(function(error) {
          toSave.forEach(r => {
            const indicator = document.getElementById('save-indicator-' + r.idx);
            if (indicator) {
              indicator.textContent = '❌ 儲存失敗';
              setTimeout(() => indicator.classList.remove('show'), 3000);
            }
          });
          console.error('Batch source rating save failed:', error);
          // Re-add failed items
          toSave.forEach(r => {
            pendingSourceRatings[\`\${r.name}|\${r.platform}\`] = r;
          });
        })
        .saveSourceRatingsBatch(toSave);
    }

    // ==========================================
    // FIX 5: PDF EXPORT
    // ==========================================
    function exportToPdf() {
      const btn = document.querySelector('.export-btn');
      btn.disabled = true;
      btn.textContent = '📄 匯出中...';

      google.script.run
        .withSuccessHandler(function(result) {
          btn.disabled = false;
          btn.textContent = '📄 匯出 PDF';

          if (result.success) {
            // Open PDF download link
            const link = document.createElement('a');
            link.href = result.url;
            link.target = '_blank';
            link.click();
          } else {
            alert('PDF 匯出失敗：' + (result.error || '未知錯誤'));
          }
        })
        .withFailureHandler(function(error) {
          btn.disabled = false;
          btn.textContent = '📄 匯出 PDF';
          alert('PDF 匯出失敗：' + error.message);
        })
        .generatePdfReport();
    }

    // ==========================================
    // FIX 6: CELEBRITY COMPARISON
    // ==========================================
    function toggleComparison(checkbox, index) {
      const celebrity = checkbox.dataset.celebrity;

      if (checkbox.checked) {
        if (selectedForComparison.length >= 2) {
          // Uncheck oldest selection
          const oldestIndex = selectedForComparison[0].index;
          const oldCheckbox = document.querySelector(\`.compare-checkbox[data-celebrity="\${selectedForComparison[0].celebrity}"]\`);
          if (oldCheckbox) oldCheckbox.checked = false;
          selectedForComparison.shift();
        }
        selectedForComparison.push({ celebrity, index });
      } else {
        selectedForComparison = selectedForComparison.filter(s => s.celebrity !== celebrity);
      }

      updateCompareButton();
    }

    function updateCompareButton() {
      const btn = document.getElementById('compareBtn');
      if (selectedForComparison.length === 2) {
        btn.classList.add('visible');
        btn.textContent = \`🔄 比較 \${selectedForComparison[0].celebrity} vs \${selectedForComparison[1].celebrity}\`;
      } else {
        btn.classList.remove('visible');
      }
    }

    function openComparison() {
      if (selectedForComparison.length !== 2) return;

      const celeb1 = dataCache.results[selectedForComparison[0].index];
      const celeb2 = dataCache.results[selectedForComparison[1].index];

      if (!celeb1 || !celeb2) return;

      const cardsHtml = [celeb1, celeb2].map(c => {
        const score = typeof c.score === 'number' ? c.score : parseFloat(c.score) || 0;
        const scorePercent = Math.min(100, Math.max(0, (score + 1) * 50)); // -1 to 1 -> 0 to 100
        const isPositive = score >= 0;
        const breakdown = c.sourceBreakdown ? JSON.parse(c.sourceBreakdown || '{}') : {};

        let breakdownHtml = '';
        Object.entries(breakdown).forEach(([platform, val]) => {
          const pct = Math.min(100, Math.max(0, (parseFloat(val) + 1) * 50));
          breakdownHtml += \`
            <div class="source-bar-container">
              <div class="source-bar-label">
                <span>\${escapeHtml(platform)}</span>
                <span>\${parseFloat(val).toFixed(2)}</span>
              </div>
              <div class="source-bar">
                <div class="source-bar-fill" style="width: \${pct}%"></div>
              </div>
            </div>
          \`;
        });

        const trend = c.trend || '→ Stable';
        let trendText = '持平';
        if (trend.includes('🚀') || trend.includes('Fast Rising')) trendText = '🚀 快速上升';
        else if (trend.includes('📉') || trend.includes('Fast Falling')) trendText = '📉 快速下降';
        else if (trend.includes('↑') || trend.includes('Rising')) trendText = '↑ 上升';
        else if (trend.includes('↓') || trend.includes('Falling')) trendText = '↓ 下降';

        return \`
          <div class="comparison-card">
            <div class="comparison-card-header">
              <h3>\${escapeHtml(c.celebrity)}</h3>
              <span class="comparison-rank">排名 #\${c.rank}</span>
            </div>

            <div class="comparison-score-bar">
              <div class="comparison-score-fill \${isPositive ? 'positive' : 'negative'}" style="width: \${scorePercent}%">
                \${score.toFixed(2)}
              </div>
            </div>

            <div class="comparison-stat">
              <span class="comparison-stat-label">趨勢</span>
              <span class="comparison-stat-value">\${escapeHtml(trendText)}</span>
            </div>
            <div class="comparison-stat">
              <span class="comparison-stat-label">可信度</span>
              <span class="comparison-stat-value">\${c.confidence || 0}%</span>
            </div>
            <div class="comparison-stat">
              <span class="comparison-stat-label">代言狀態</span>
              <span class="comparison-stat-value">\${c.endorsement === 'Yes' ? '✓ 可代言' : '✗ 待觀察'}</span>
            </div>

            <div class="comparison-source-breakdown">
              <h4>📊 平台分析</h4>
              \${breakdownHtml || '<p style="color:#888;font-size:12px;">無平台資料</p>'}
            </div>
          </div>
        \`;
      }).join('');

      document.getElementById('comparisonCards').innerHTML = cardsHtml;
      document.getElementById('comparisonOverlay').classList.add('active');
    }

    function closeComparison() {
      document.getElementById('comparisonOverlay').classList.remove('active');
    }

    function closeComparisonOnOverlay(event) {
      if (event.target === document.getElementById('comparisonOverlay')) {
        closeComparison();
      }
    }

    // ==========================================
    // INITIALIZATION
    // ==========================================
    document.addEventListener('DOMContentLoaded', function() {
      // Load ALL data in one API call - then all tabs are instant!
      preloadAllData();
    });

    // Save pending data before user leaves
    window.addEventListener('beforeunload', function() {
      flushPendingFeedback();
      flushPendingSourceRatings();
    });
  </script>
</body>
</html>
  `;
}
