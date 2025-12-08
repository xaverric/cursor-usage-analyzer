# Cursor Usage Analyzer

A powerful Node.js tool to analyze and visualize your Cursor AI editor usage. Extract conversation histories, track token usage, and generate beautiful HTML reports with interactive charts.

## Features

- 📊 **Comprehensive Analytics**: Track conversations, messages, tokens, code changes, and more
- 📈 **Interactive Charts**: Visualize usage patterns with Chart.js-powered graphs
- 🔍 **Smart Filtering**: Filter and sort conversations by project, model, date, and name
- 📁 **Full Export**: Export complete conversation histories as readable text files
- 🎯 **Project Detection**: Automatically resolves workspace names from Cursor's database
- 📅 **Flexible Date Ranges**: Analyze single days, months, or custom periods

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
```

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
Tokens: 15,234 / 200,000 (7.6%)
Changes: +245 -12 lines in 8 files
Messages: 23
```

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

## Data Source

The analyzer reads from Cursor's local SQLite database:
```
~/Library/Application Support/Cursor/User/globalStorage/state.vscdb
```

It extracts:
- **Conversation metadata**: Names, timestamps, models
- **Message content**: Full chat history (user prompts & AI responses)
- **Code changes**: Lines added/removed, files modified
- **Token usage**: Context tokens used and limits
- **Project information**: Workspace paths and names

## Requirements

- **Node.js**: v14 or higher
- **Cursor Editor**: Must have conversations stored locally
- **OS**: macOS (paths are macOS-specific)

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
Ensure Cursor has been used and conversations exist. Database path:
```
~/Library/Application Support/Cursor/User/globalStorage/state.vscdb
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
