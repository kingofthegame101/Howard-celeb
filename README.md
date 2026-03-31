# Celebrity Insight Dashboard

A beautiful, modern celebrity fame tracking dashboard with real-time rankings, analytics, and social media integration.

## Features

- **Fame Leaderboard**: Real-time celebrity rankings with fame scores and credibility metrics
- **Celebrity Profiles**: Detailed profile pages with fame velocity charts and source breakdowns
- **Market Intelligence**: News feed and social media activity tracking
- **Source Analysis**: Track which platforms contribute most to celebrity fame
- **Responsive Design**: Works beautifully on desktop and mobile

## Tech Stack

- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Backend**: Google Apps Script
- **Data Storage**: Google Sheets
- **Fonts**: Manrope (headlines), Inter (body)
- **Icons**: Material Symbols Outlined

## Project Structure

```
Howard-celeb/
├── index.html          # Main ranking page
├── detail.html         # Celebrity detail page
├── js/
│   ├── api.js          # API communication module
│   ├── main.js         # Main page logic
│   └── detail.js       # Detail page logic
├── apps-script/        # Google Apps Script backend
│   ├── api.js          # HTTP endpoint handler
│   ├── dashboard.js    # Dashboard HTML generator
│   ├── dashboardBackend.js  # Backend data functions
│   ├── config.js       # Configuration loader
│   ├── constants.js    # Shared constants
│   └── ...             # Other backend modules
└── README.md
```

## Setup

### 1. Deploy the Apps Script Backend

1. Open the [Google Apps Script project](https://script.google.com/home/projects/1PFAmAJlstjjXB4wt8o3VdksP4kcimzY0u58PPN-Jl01cQ0w0CjQl5Pvr/edit)
2. Click **Deploy** > **New deployment**
3. Select **Web app** as the type
4. Set:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy** and copy the web app URL

### 2. Configure the Frontend

1. Open `js/api.js`
2. Update the `baseUrl` in the `API.init()` call with your deployed web app URL:

```javascript
API.init('https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec');
```

### 3. Run Locally

Simply open `index.html` in your browser. The app will use mock data if no API URL is configured.

### 4. Deploy to GitHub Pages (Optional)

1. Go to your repository settings
2. Navigate to **Pages**
3. Select **main** branch as source
4. Your site will be available at `https://yourusername.github.io/Howard-celeb/`

## API Endpoints

The Apps Script backend supports the following API actions:

| Action | Method | Description |
|--------|--------|-------------|
| `getAllDashboardData` | GET | Get all dashboard data in one call |
| `getResults` | GET | Get celebrity rankings |
| `getNewsData` | GET | Get news and social posts |
| `getSourcesData` | GET | Get source configurations |
| `getAnalytics` | GET | Get model analytics |
| `compareCelebrities` | GET | Compare two celebrities |
| `saveFeedback` | POST | Save post feedback |
| `saveSourceRating` | POST | Save source rating |
| `generatePdfReport` | POST | Generate PDF report |

## Usage

### Viewing Rankings

The main page displays all tracked celebrities with:
- Fame Score (0-100)
- Credibility percentage
- Trend direction (Rising/Stable/Falling)
- Top contributing source

### Viewing Celebrity Details

Click any celebrity row to view their detailed profile:
- Fame velocity chart
- Source breakdown
- Recent news and social activity
- Profile details and endorsement status

### Filtering and Sorting

Use the platform filter dropdown to filter by source platform (Instagram, YouTube, etc.)
Click the Sort button to toggle between ascending/descending score order.

## Development

### Mock Data

The frontend includes mock data for development. When no API URL is configured, the app automatically uses mock data allowing you to develop and test the UI without a backend connection.

### Customization

- **Colors**: Edit the Tailwind config in the `<script>` tag of HTML files
- **Fonts**: Update the Google Fonts link and Tailwind fontFamily config
- **Data**: Modify mock data in `js/api.js` for testing

## Credits

- UI/UX Design: Provided design system
- Backend: Google Apps Script celebrity popularity quantifier
- Icons: Google Material Symbols
