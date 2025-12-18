# Cursor Usage Analyzer

A powerful Node.js tool to analyze and visualize your Cursor AI editor usage. Extract conversation histories, track token usage, and generate beautiful HTML reports with interactive charts.

## Features

- 📊 **Comprehensive Analytics**: Track conversations, messages, tokens, code changes, and more
- 💰 **API Token Tracking**: Import CSV from Cursor dashboard to track actual API usage, costs, and billing
- 📈 **Interactive Charts**: Visualize usage patterns with Chart.js-powered graphs
- 🔍 **Smart Filtering**: Filter and sort conversations by project, model, date, and name
- 📁 **Full Export**: Export complete conversation histories as readable text files
- 🎯 **Project Detection**: Automatically resolves workspace names from Cursor's database
- 📅 **Flexible Date Ranges**: Analyze single days, months, or custom periods
- 🖥️ **Cross-Platform**: Works on Windows, macOS, and Linux

## Installation

### Option 1: Use with npx (Recommended)

No installation needed! Run directly from npm:

```bash
npx cursor-usage-analyzer
```

**First run**: npx will download and cache the package automatically. Subsequent runs use the cached version.

### Option 2: Clone Locally

```bash
# Clone the repository
git clone https://github.com/xaverric/cursor-usage-analyzer.git
cd cursor-usage-analyzer

# Install dependencies
npm install
```

## Quick Start

### Using npx

```bash
# Analyze today's usage
npx cursor-usage-analyzer

# Analyze yesterday
npx cursor-usage-analyzer --yesterday

# Analyze last month
npx cursor-usage-analyzer --last-month

# Analyze this month
npx cursor-usage-analyzer --this-month
```

### Using locally installed version

```bash
# Using npm scripts
npm run analyze
npm run yesterday
npm run last-month
npm run this-month
```

## Usage

### Command Line Arguments

All these work with both `npx cursor-usage-analyzer` and local `node analyze.js`:

```bash
# Today (default)
npx cursor-usage-analyzer

# Yesterday
npx cursor-usage-analyzer --yesterday

# Specific date
npx cursor-usage-analyzer --date 2025-12-01

# Date range
npx cursor-usage-analyzer --from 2025-11-01 --to 2025-11-30

# Last month
npx cursor-usage-analyzer --last-month

# This month
npx cursor-usage-analyzer --this-month

# Include API token usage from CSV export
npx cursor-usage-analyzer --csv path/to/team-usage-events.csv
```

### API Token Tracking (CSV Import)

For detailed API usage tracking including actual tokens sent to Claude's API and costs, you can import CSV data from the Cursor dashboard:

1. **Export CSV from Cursor**:
   - Go to [Cursor Dashboard](https://cursor.com/dashboard)
   - Navigate to Usage tab
   - Click "Export" to download your usage CSV

2. **Run analyzer with CSV**:
   ```bash
   npx cursor-usage-analyzer --csv ~/Downloads/team-usage-events-XXXXX-2025-12-18.csv
   ```

3. **What you get**:
   - **Input Tokens** (with/without cache write)
   - **Cache Read tokens**
   - **Output tokens**
   - **Total API tokens** (actual usage sent to Claude API)
   - **Cost per conversation** (in USD)
   - **API call count** per conversation

The tool automatically matches API calls to conversations based on timestamp and model, giving you complete visibility into your actual usage and costs.

### NPM Scripts (Local Installation Only)

If you cloned the repo locally, you can use these convenient shortcuts:

```bash
npm run analyze    # Today
npm run yesterday  # Yesterday
npm run last-month # Previous month
npm run this-month # Current month
```

## Output

The tool generates the following in `cursor-logs-export/`:

### 1. Text Files (`chats/`)
Individual conversation exports with full message history:
```
CONVERSATION #1
Name: Feature implementation
Workspace: my-project
Time: 12/8/2025, 2:30:45 PM
Model: claude-4.5-sonnet-thinking
Context Tokens: 15,234 / 200,000 (7.6%)
Changes: +245 -12 lines in 8 files
Messages: 23

API TOKEN USAGE (from dashboard export):
  API Calls: 3
  Input (w/ Cache Write): 12,456
  Input (w/o Cache Write): 1,234
  Cache Read: 45,678
  Output Tokens: 2,345
  Total API Tokens: 61,713
  Cost: $0.23
```

**Note**: API token data only appears when using `--csv` flag

### 2. HTML Report (`report.html`)

Interactive dashboard featuring:

**Summary Statistics**
- Total conversations, messages, and tokens
- Lines added/removed and files changed
- Averages per conversation

**Interactive Charts**
- Tokens over time (bar chart)
- Messages over time (line chart)
- Activity distribution (hourly/daily)
- Model usage (doughnut chart)
- Project distribution (pie chart)

**Filterable Table**
- Sort by any column (date, name, project, model, etc.)
- Filter by project, model, name, or date range
- View complete conversation metadata

### Opening the Report

After generation, open the HTML report with:

**macOS:**
```bash
open cursor-logs-export/report.html
```

**Windows:**
```cmd
start cursor-logs-export/report.html
```

**Linux:**
```bash
xdg-open cursor-logs-export/report.html
```

Or simply double-click `report.html` in your file explorer.

## Data Sources

### 1. Local SQLite Database (Required)

The analyzer reads from Cursor's local SQLite database at platform-specific locations:

**macOS:**
```
~/Library/Application Support/Cursor/User/globalStorage/state.vscdb
```

**Windows:**
```
%APPDATA%\Cursor\User\globalStorage\state.vscdb
```

**Linux:**
```
~/.config/Cursor/User/globalStorage/state.vscdb
```

From the database, it extracts:
- **Conversation metadata**: Names, timestamps, models
- **Message content**: Full chat history (user prompts & AI responses)
- **Code changes**: Lines added/removed, files modified
- **Context token usage**: Tokens in conversation context window
- **Project information**: Workspace paths and names

### 2. CSV Export (Optional, for API Token Tracking)

When you provide a CSV export from Cursor's dashboard using `--csv`:
- **API token usage**: Actual tokens sent to Claude API (input with/without cache, cache reads, output)
- **Cost tracking**: Exact costs in USD per conversation
- **API call details**: Number of API calls, model used, timestamps

The tool automatically matches CSV data to conversations based on timestamps and models, giving you a complete picture of both context usage and actual API consumption.

## Requirements

- **Node.js**: v14 or higher
- **Cursor Editor**: Must have conversations stored locally
- **OS**: Windows, macOS, or Linux

## Project Structure

```
cursor-usage-analyzer/
├── analyze.js          # Main extraction and analysis logic
├── html-template.js    # HTML report generation
├── package.json        # Dependencies and scripts
└── cursor-logs-export/ # Generated output (gitignored)
    ├── chats/          # Individual conversation text files
    └── report.html     # Interactive HTML dashboard
```

## Tips

### Analyze Specific Periods

```bash
# Q4 2024
npx cursor-usage-analyzer --from 2024-10-01 --to 2024-12-31

# Specific week
npx cursor-usage-analyzer --from 2025-12-01 --to 2025-12-07

# Single day
npx cursor-usage-analyzer --date 2025-11-15
```

### Understanding the Report

- **Context Tokens**: Tokens used in the conversation context (what the AI "sees")
- **Messages**: Individual chat messages (both user and assistant)
- **Changes**: Code modifications tracked by Cursor's composer
- **Unknown Projects**: Conversations where workspace couldn't be determined

### Performance

- Large date ranges (e.g., entire year) may take longer to process
- The tool processes thousands of messages efficiently
- HTML reports remain performant even with 100+ conversations

## Troubleshooting

### "Database not found"
Ensure Cursor has been used and conversations exist. Check the database path for your platform:

**macOS:**
```
~/Library/Application Support/Cursor/User/globalStorage/state.vscdb
```

**Windows:**
```
%APPDATA%\Cursor\User\globalStorage\state.vscdb
```
(Usually: `C:\Users\YourUsername\AppData\Roaming\Cursor\User\globalStorage\state.vscdb`)

**Linux:**
```
~/.config/Cursor/User/globalStorage/state.vscdb
```

### "No conversations found"
- Check the date range is correct
- Verify you have conversations in Cursor from that period
- Ensure Cursor isn't currently running (may lock database)

### Project shows as "unknown"
This happens when the analyzer can't determine the workspace from file paths. The conversation is still exported with all content intact.

## Privacy & Security

- All processing is **100% local** - no data leaves your machine
- The tool only reads Cursor's database (read-only access)
- Generated reports can be freely shared or kept private
- Sensitive conversation content is exported as-is (review before sharing)

## License

MIT

## Development

### Testing npx Locally

Before publishing to npm, you can test the npx functionality:

```bash
# In the project directory
npm link

# Now you can run from anywhere
cursor-usage-analyzer --yesterday
cursor-usage-analyzer --last-month

# Unlink when done testing
npm unlink -g cursor-usage-analyzer
```

### Publishing to npm

Once ready to publish (requires npm account):

```bash
# Login to npm
npm login

# Publish the package
npm publish

# Now anyone can use it
npx cursor-usage-analyzer
```

## Contributing

Feel free to open issues or submit pull requests for improvements!

---

**Made with ❤️ for Cursor users who love data**
