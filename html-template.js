import fs from 'fs';

export function generateHTMLReport(stats, dateStr, reportPath) {
  const avg = (total, count) => count > 0 ? Math.round(total / count) : 0;
  
  const avgTokens = avg(stats.totalTokens, stats.totalConversations);
  const avgMessages = avg(stats.totalMessages, stats.totalConversations);
  const avgLines = avg(stats.totalLinesAdded + stats.totalLinesRemoved, stats.totalConversations);
  
  // Prepare chart data
  const isMultiDay = stats.isMultiDay;
  const timeLabels = stats.conversations.map(c => 
    isMultiDay ? `${c.date} ${c.time}` : `${c.time} ${c.name.substring(0, 20)}`
  );
  const tokenData = stats.conversations.map(c => c.tokens);
  const messageData = stats.conversations.map(c => c.messages);
  
  const activityTitle = isMultiDay ? 'Activity Over Period' : 'Activity During Day';
  const activityLabels = isMultiDay 
    ? Object.keys(stats.dailyDistribution).sort()
    : Array.from({length: 24}, (_, i) => i + ':00');
  const activityData = isMultiDay
    ? activityLabels.map(k => stats.dailyDistribution[k])
    : stats.hourlyDistribution;
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cursor Usage Report - ${dateStr}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 20px; 
      background: #f9fafb;
      color: #111827;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { color: #2563eb; margin-bottom: 8px; }
    h2 { 
      color: #111827; 
      margin: 40px 0 20px;
      font-size: 20px;
      font-weight: 600;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
    }
    .date { color: #6b7280; margin-bottom: 32px; font-size: 14px; }
    
    .stats-grid, .charts-grid {
      display: grid;
      gap: 16px;
      margin-bottom: 40px;
    }
    .stats-grid { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
    .charts-grid { grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
    
    .stat, .chart-container, .filters, table {
      background: white;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
    
    .stat { padding: 20px; }
    .stat-value { font-size: 32px; font-weight: 700; color: #2563eb; margin-bottom: 4px; }
    .stat-label { color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-sublabel { color: #9ca3af; font-size: 12px; margin-top: 4px; }
    
    .chart-container { padding: 24px; }
    .chart-title { font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 16px; }
    
    .filters {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .filter-group { display: flex; flex-direction: column; gap: 4px; }
    .filter-group label {
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .filter-group input, .filter-group select {
      padding: 8px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      font-size: 13px;
      background: white;
    }
    .filter-group input:focus, .filter-group select:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    
    table { width: 100%; border-collapse: collapse; overflow: hidden; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { 
      background: #f9fafb;
      font-weight: 600;
      font-size: 13px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      user-select: none;
      position: relative;
      padding-right: 28px;
    }
    th:hover { background: #f3f4f6; }
    th.sortable::after { content: '⇅'; position: absolute; right: 8px; opacity: 0.3; font-size: 14px; }
    th.sortable.asc::after { content: '↑'; opacity: 1; }
    th.sortable.desc::after { content: '↓'; opacity: 1; }
    td { font-size: 14px; }
    tr:last-child td { border-bottom: none; }
    tr:hover { background: #f9fafb; }
    small { font-size: 12px; color: #6b7280; }
    
    @media (max-width: 768px) {
      .charts-grid { grid-template-columns: 1fr; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Cursor Usage Report</h1>
    <div class="date">${dateStr}</div>
    <div class="date" style="font-size: 12px; margin-top: 4px;">Generated: ${stats.generatedAt}</div>
    
    <div class="stats-grid">
      <div class="stat">
        <div class="stat-value">${stats.totalConversations}</div>
        <div class="stat-label">Conversations</div>
      </div>
      <div class="stat">
        <div class="stat-value">${stats.totalMessages.toLocaleString()}</div>
        <div class="stat-label">Messages</div>
        <div class="stat-sublabel">Ø ${avgMessages} per conversation</div>
      </div>
      <div class="stat">
        <div class="stat-value">${stats.totalTokens.toLocaleString()}</div>
        <div class="stat-label">Context Tokens</div>
        <div class="stat-sublabel">Ø ${avgTokens.toLocaleString()} per conversation</div>
      </div>
      ${stats.totalApiCalls > 0 ? `
      <div class="stat">
        <div class="stat-value">${stats.totalApiTokens.totalTokens.toLocaleString()}</div>
        <div class="stat-label">API Tokens (Total)</div>
        <div class="stat-sublabel">$${stats.totalApiTokens.cost.toFixed(2)} total cost</div>
      </div>
      <div class="stat">
        <div class="stat-value">${stats.totalApiTokens.inputWithCache.toLocaleString()}</div>
        <div class="stat-label">Input (w/ Cache Write)</div>
      </div>
      <div class="stat">
        <div class="stat-value">${stats.totalApiTokens.cacheRead.toLocaleString()}</div>
        <div class="stat-label">Cache Read</div>
      </div>
      <div class="stat">
        <div class="stat-value">${stats.totalApiTokens.outputTokens.toLocaleString()}</div>
        <div class="stat-label">Output Tokens</div>
      </div>
      <div class="stat">
        <div class="stat-value">${stats.totalApiCalls}</div>
        <div class="stat-label">API Calls</div>
      </div>
      ` : ''}
      <div class="stat">
        <div class="stat-value">+${stats.totalLinesAdded.toLocaleString()}</div>
        <div class="stat-label">Lines Added</div>
      </div>
      <div class="stat">
        <div class="stat-value">-${stats.totalLinesRemoved.toLocaleString()}</div>
        <div class="stat-label">Lines Removed</div>
      </div>
      <div class="stat">
        <div class="stat-value">${stats.totalFilesChanged.toLocaleString()}</div>
        <div class="stat-label">Files Changed</div>
        <div class="stat-sublabel">Ø ${avgLines} lines per conversation</div>
      </div>
    </div>
    
    <h2>Usage Charts</h2>
    
    <div class="charts-grid">
      <div class="chart-container">
        <div class="chart-title">Tokens Over Time</div>
        <canvas id="tokensChart"></canvas>
      </div>
      <div class="chart-container">
        <div class="chart-title">Messages Over Time</div>
        <canvas id="messagesChart"></canvas>
      </div>
      <div class="chart-container">
        <div class="chart-title">${activityTitle}</div>
        <canvas id="activityChart"></canvas>
      </div>
      <div class="chart-container">
        <div class="chart-title">Distribution by Model</div>
        <canvas id="modelsChart"></canvas>
      </div>
      <div class="chart-container">
        <div class="chart-title">Distribution by Project</div>
        <canvas id="workspacesChart"></canvas>
      </div>
    </div>
    
    <h2>Conversation Details</h2>
    
    <div class="filters">
      <div class="filter-group">
        <label>Name</label>
        <input type="text" id="filterName" placeholder="Filter...">
      </div>
      <div class="filter-group">
        <label>Project</label>
        <select id="filterWorkspace">
          <option value="">All projects</option>
          ${[...new Set(stats.conversations.map(c => c.workspace))].sort().map(w => 
            `<option value="${w}">${w}</option>`
          ).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label>Model</label>
        <select id="filterModel">
          <option value="">All models</option>
          ${[...new Set(stats.conversations.map(c => c.model))].sort().map(m => 
            `<option value="${m}">${m}</option>`
          ).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label>Date From</label>
        <input type="date" id="filterDateFrom">
      </div>
      <div class="filter-group">
        <label>Date To</label>
        <input type="date" id="filterDateTo">
      </div>
    </div>
    
    <table id="conversationsTable">
      <thead>
        <tr>
          <th class="sortable" data-column="datetime" data-type="date">Date & Time</th>
          <th class="sortable" data-column="name" data-type="string">Name</th>
          <th class="sortable" data-column="workspace" data-type="string">Project</th>
          <th class="sortable" data-column="model" data-type="string">Model</th>
          <th class="sortable" data-column="messages" data-type="number">Messages</th>
          <th class="sortable" data-column="tokens" data-type="number">Context Tokens</th>
          ${stats.totalApiCalls > 0 ? `
          <th class="sortable" data-column="apiTokens" data-type="number">API Tokens</th>
          <th class="sortable" data-column="apiCost" data-type="number">Cost</th>
          <th class="sortable" data-column="apiCalls" data-type="number">API Calls</th>
          ` : ''}
          <th class="sortable" data-column="linesChanged" data-type="string">Changes</th>
          <th class="sortable" data-column="files" data-type="number">Files</th>
        </tr>
      </thead>
      <tbody id="conversationsBody">
         ${stats.conversations.map((c, idx) => `
           <tr data-index="${idx}">
             <td data-value="${c.timestamp}"><small>${c.datetime}</small></td>
             <td data-value="${c.name}">${c.name}</td>
             <td data-value="${c.workspace}">${c.workspace}</td>
             <td data-value="${c.model}"><small>${c.model}</small></td>
             <td data-value="${c.messages}">${c.messages}</td>
             <td data-value="${c.tokens}"><small>${c.tokens.toLocaleString()} / ${c.contextLimit.toLocaleString()}</small></td>
             ${stats.totalApiCalls > 0 ? `
             <td data-value="${c.apiTokens?.totalTokens || 0}"><small>${(c.apiTokens?.totalTokens || 0).toLocaleString()}</small></td>
             <td data-value="${c.apiTokens?.cost || 0}"><small>$${(c.apiTokens?.cost || 0).toFixed(2)}</small></td>
             <td data-value="${c.apiCallCount || 0}">${c.apiCallCount || 0}</td>
             ` : ''}
             <td data-value="${c.linesChanged}">${c.linesChanged}</td>
             <td data-value="${c.files}">${c.files}</td>
           </tr>
         `).join('')}
      </tbody>
    </table>
  </div>
  
  <script>
    const data = ${JSON.stringify({
      conversations: stats.conversations,
      timeLabels,
      tokenData,
      messageData,
      activityLabels,
      activityData,
      modelLabels: Object.keys(stats.modelUsage),
      modelCounts: Object.values(stats.modelUsage),
      workspaceLabels: Object.keys(stats.workspaceUsage),
      workspaceCounts: Object.values(stats.workspaceUsage),
      isMultiDay
    })};
    
    // Chart defaults
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
        x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } }
      }
    };
    
    // Create chart helper
    const createChart = (id, type, labels, dataset, options = {}) => {
      new Chart(document.getElementById(id), {
        type,
        data: { labels, datasets: [dataset] },
        options: { ...baseOptions, ...options }
      });
    };
    
    // Create charts
    createChart('tokensChart', 'bar', data.timeLabels, {
      label: 'Tokens',
      data: data.tokenData,
      backgroundColor: 'rgba(37, 99, 235, 0.8)',
      borderColor: 'rgb(37, 99, 235)',
      borderWidth: 1
    }, {
      scales: {
        ...baseOptions.scales,
        y: {
          ...baseOptions.scales.y,
          ticks: { callback: v => v.toLocaleString() }
        }
      }
    });
    
    createChart('messagesChart', 'line', data.timeLabels, {
      label: 'Messages',
      data: data.messageData,
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 2,
      fill: true,
      tension: 0.4
    });
    
    createChart('activityChart', 'bar', data.activityLabels, {
      label: 'Conversations',
      data: data.activityData,
      backgroundColor: 'rgba(34, 197, 94, 0.8)',
      borderColor: 'rgb(34, 197, 94)',
      borderWidth: 1
    }, {
      scales: {
        ...baseOptions.scales,
        x: {
          ...baseOptions.scales.x,
          ticks: {
            maxRotation: data.isMultiDay ? 90 : 0,
            minRotation: data.isMultiDay ? 45 : 0,
            font: { size: 10 }
          }
        }
      }
    });
    
    const pieColors = [
      'rgba(37, 99, 235, 0.8)', 'rgba(59, 130, 246, 0.8)',
      'rgba(96, 165, 250, 0.8)', 'rgba(147, 197, 253, 0.8)',
      'rgba(34, 197, 94, 0.8)', 'rgba(251, 146, 60, 0.8)',
      'rgba(168, 85, 247, 0.8)', 'rgba(236, 72, 153, 0.8)'
    ];
    
    new Chart(document.getElementById('modelsChart'), {
      type: 'doughnut',
      data: {
        labels: data.modelLabels,
        datasets: [{
          data: data.modelCounts,
          backgroundColor: pieColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: true, position: 'bottom' } }
      }
    });
    
    new Chart(document.getElementById('workspacesChart'), {
      type: 'pie',
      data: {
        labels: data.workspaceLabels,
        datasets: [{
          data: data.workspaceCounts,
          backgroundColor: pieColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: true, position: 'bottom' } }
      }
    });
    
    // Table sorting
    let sortState = { column: null, dir: 'asc' };
    
    document.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.column;
        const type = th.dataset.type;
        const colIdx = Array.from(th.parentElement.children).indexOf(th);
        
        sortState.dir = sortState.column === col ? (sortState.dir === 'asc' ? 'desc' : 'asc') : 'asc';
        sortState.column = col;
        
        document.querySelectorAll('th.sortable').forEach(h => h.classList.remove('asc', 'desc'));
        th.classList.add(sortState.dir);
        
        const tbody = document.getElementById('conversationsBody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        rows.sort((a, b) => {
          let aVal = a.children[colIdx].dataset.value;
          let bVal = b.children[colIdx].dataset.value;
          
          if (type === 'number' || type === 'date') {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
          }
          
          const result = aVal < bVal ? -1 : (aVal > bVal ? 1 : 0);
          return sortState.dir === 'asc' ? result : -result;
        });
        
        rows.forEach(row => tbody.appendChild(row));
      });
    });
    
    // Table filtering
    const applyFilters = () => {
      const filters = {
        name: document.getElementById('filterName').value.toLowerCase(),
        workspace: document.getElementById('filterWorkspace').value,
        model: document.getElementById('filterModel').value,
        dateFrom: document.getElementById('filterDateFrom').value,
        dateTo: document.getElementById('filterDateTo').value
      };
      
      const fromTs = filters.dateFrom ? new Date(filters.dateFrom).getTime() : 0;
      const toTs = filters.dateTo ? new Date(filters.dateTo + 'T23:59:59').getTime() : Infinity;
      
      document.querySelectorAll('#conversationsBody tr').forEach(row => {
        const idx = parseInt(row.dataset.index);
        const conv = data.conversations[idx];
        
        const show = (!filters.name || conv.name.toLowerCase().includes(filters.name)) &&
                     (!filters.workspace || conv.workspace === filters.workspace) &&
                     (!filters.model || conv.model === filters.model) &&
                     (conv.timestamp >= fromTs && conv.timestamp <= toTs);
        
        row.style.display = show ? '' : 'none';
      });
    };
    
    ['filterName', 'filterWorkspace', 'filterModel', 'filterDateFrom', 'filterDateTo'].forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', applyFilters);
    });
  </script>
</body>
</html>`;
  
  fs.writeFileSync(reportPath, html, 'utf-8');
}
