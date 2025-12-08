#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import Database from 'better-sqlite3';
import { generateHTMLReport } from './html-template.js';

// Constants
const CURSOR_GLOBAL_STORAGE = path.join(os.homedir(), 'Library/Application Support/Cursor/User/globalStorage');
const CURSOR_WORKSPACE_STORAGE = path.join(os.homedir(), 'Library/Application Support/Cursor/User/workspaceStorage');
const OUTPUT_DIR = path.join(process.cwd(), 'cursor-logs-export');
const CHATS_DIR = path.join(OUTPUT_DIR, 'chats');
const REPORT_PATH = path.join(OUTPUT_DIR, 'report.html');

// Helpers
const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const setDayBounds = (date, start = true) => {
  const d = new Date(date);
  d.setHours(start ? 0 : 23, start ? 0 : 59, start ? 0 : 59, start ? 0 : 999);
  return d;
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let startDate, endDate, dateStr;
  
  if (args.includes('--last-month')) {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    dateStr = `${formatDate(startDate)}_${formatDate(endDate)}`;
  } else if (args.includes('--this-month')) {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date();
    dateStr = `${formatDate(startDate)}_${formatDate(endDate)}`;
  } else if (args.includes('--from') && args.includes('--to')) {
    const fromIdx = args.indexOf('--from');
    const toIdx = args.indexOf('--to');
    startDate = new Date(args[fromIdx + 1]);
    endDate = new Date(args[toIdx + 1]);
    dateStr = `${args[fromIdx + 1]}_${args[toIdx + 1]}`;
  } else if (args.includes('--yesterday')) {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 1);
    endDate = new Date(startDate);
    dateStr = formatDate(startDate);
  } else if (args.includes('--date')) {
    const dateIdx = args.indexOf('--date');
    startDate = new Date(args[dateIdx + 1]);
    endDate = new Date(startDate);
    dateStr = formatDate(startDate);
  } else {
    startDate = endDate = new Date();
    dateStr = formatDate(startDate);
  }
  
  return {
    startOfDay: setDayBounds(startDate, true).getTime(),
    endOfDay: setDayBounds(endDate, false).getTime(),
    dateStr
  };
}

// Extract text from various bubble formats
function extractTextFromBubble(bubble) {
  if (bubble.text?.trim()) return bubble.text;
  
  if (bubble.richText) {
    try {
      const richData = JSON.parse(bubble.richText);
      if (richData.root?.children) {
        return extractRichText(richData.root.children);
      }
    } catch (e) {}
  }
  
  let text = '';
  if (bubble.codeBlocks?.length) {
    text = bubble.codeBlocks
      .filter(cb => cb.content)
      .map(cb => `\n\`\`\`${cb.language || ''}\n${cb.content}\n\`\`\``)
      .join('');
  }
  
  return text;
}

function extractRichText(children) {
  return children.map(child => {
    if (child.type === 'text' && child.text) return child.text;
    if (child.type === 'code' && child.children) return '\n```\n' + extractRichText(child.children) + '\n```\n';
    if (child.children?.length) return extractRichText(child.children);
    return '';
  }).join('');
}

// Read workspace name from workspace.json
function readWorkspaceJson(workspaceId) {
  try {
    const jsonPath = path.join(CURSOR_WORKSPACE_STORAGE, workspaceId, 'workspace.json');
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      if (data.folder) {
        return path.basename(data.folder.replace('file://', ''));
      }
    }
  } catch (e) {}
  return null;
}

// Find workspace name from file path
function findWorkspaceFromPath(filePath) {
  try {
    const entries = fs.readdirSync(CURSOR_WORKSPACE_STORAGE);
    let bestMatch = null;
    let bestLen = 0;
    
    for (const entry of entries) {
      const name = readWorkspaceJson(entry);
      if (!name) continue;
      
      try {
        const jsonPath = path.join(CURSOR_WORKSPACE_STORAGE, entry, 'workspace.json');
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        const wsPath = data.folder?.replace('file://', '');
        
        if (wsPath && filePath.startsWith(wsPath) && wsPath.length > bestLen) {
          bestMatch = name;
          bestLen = wsPath.length;
        }
      } catch (e) {}
    }
    
    if (bestMatch) return bestMatch;
  } catch (e) {}
  
  const parts = filePath.split('/');
  return parts[parts.length - 2] || 'unknown';
}

// Determine workspace name from multiple sources
function resolveWorkspace(composerData, headers, db, composerId) {
  // Try workspaceId first
  if (composerData.workspaceId) {
    const name = readWorkspaceJson(composerData.workspaceId);
    if (name) return name;
  }
  
  // Try file paths from various sources
  const fileSources = [
    composerData.newlyCreatedFiles?.[0]?.uri?.path,
    Object.keys(composerData.codeBlockData || {})[0]?.replace('file://', ''),
    composerData.addedFiles?.[0]?.replace('file://', ''),
    composerData.allAttachedFileCodeChunksUris?.[0]?.replace('file://', '')
  ];
  
  for (const filePath of fileSources) {
    if (filePath) {
      const name = findWorkspaceFromPath(filePath);
      if (name !== 'unknown') return name;
    }
  }
  
  // Last resort: messageRequestContext
  if (headers?.length > 0) {
    try {
      const contextKey = `messageRequestContext:${composerId}:${headers[0].bubbleId}`;
      const row = db.prepare("SELECT value FROM cursorDiskKV WHERE key = ?").get(contextKey);
      if (row) {
        const context = JSON.parse(row.value);
        if (context.projectLayouts?.length > 0) {
          const layout = JSON.parse(context.projectLayouts[0]);
          const absPath = layout.listDirV2Result?.directoryTreeRoot?.absPath;
          if (absPath) return findWorkspaceFromPath(absPath);
        }
      }
    } catch (e) {}
  }
  
  return 'unknown';
}

// Extract conversations from database
function extractConversations(startTime, endTime) {
  const dbPath = path.join(CURSOR_GLOBAL_STORAGE, 'state.vscdb');
  
  if (!fs.existsSync(dbPath)) {
    console.log('Database not found');
    return [];
  }
  
  try {
    const db = new Database(dbPath, { readonly: true });
    
    // Load all bubbles
    const bubbleMap = {};
    const bubbleRows = db.prepare("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'bubbleId:%'").all();
    
    for (const row of bubbleRows) {
      try {
        const bubbleId = row.key.split(':')[2];
        const bubble = JSON.parse(row.value);
        if (bubble) bubbleMap[bubbleId] = bubble;
      } catch (e) {}
    }
    
    // Load composers
    const composerRows = db.prepare(
      "SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%' AND value LIKE '%fullConversationHeadersOnly%'"
    ).all();
    
    const conversations = [];
    
    for (const row of composerRows) {
      try {
        const composerId = row.key.split(':')[1];
        const composer = JSON.parse(row.value);
        const timestamp = composer.lastUpdatedAt || composer.createdAt || Date.now();
        
        if (timestamp < startTime || timestamp > endTime) continue;
        
        const headers = composer.fullConversationHeadersOnly || [];
        if (headers.length === 0) continue;
        
        // Extract messages
        const messages = headers
          .map(h => {
            const bubble = bubbleMap[h.bubbleId];
            if (!bubble) return null;
            
            const text = extractTextFromBubble(bubble);
            if (!text?.trim()) return null;
            
            return {
              role: h.type === 1 ? 'user' : 'assistant',
              text: text.trim(),
              timestamp: bubble.timestamp || Date.now()
            };
          })
          .filter(Boolean);
        
        if (messages.length === 0) continue;
        
        conversations.push({
          composerId,
          name: composer.name || 'Untitled Chat',
          timestamp,
          messages,
          messageCount: messages.length,
          workspace: resolveWorkspace(composer, headers, db, composerId),
          model: composer.modelConfig?.modelName || 'unknown',
          contextTokensUsed: composer.contextTokensUsed || 0,
          contextTokenLimit: composer.contextTokenLimit || 0,
          totalLinesAdded: composer.totalLinesAdded || 0,
          totalLinesRemoved: composer.totalLinesRemoved || 0,
          filesChangedCount: composer.filesChangedCount || 0
        });
      } catch (e) {
        // Silently skip invalid composers
      }
    }
    
    db.close();
    return conversations;
  } catch (error) {
    console.error('Database error:', error.message);
    return [];
  }
}

// Export conversation to text file
function exportConversation(conv, index, dateStr) {
  const timestamp = new Date(conv.timestamp);
  const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '-');
  const workspaceShort = conv.workspace.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${dateStr}_${timeStr}_${workspaceShort}_conv${index}.txt`;
  
  const percentUsed = (conv.contextTokensUsed / conv.contextTokenLimit * 100).toFixed(1);
  
  const lines = [
    '='.repeat(80),
    `CONVERSATION #${index}`,
    `Name: ${conv.name}`,
    `Workspace: ${conv.workspace}`,
    `Time: ${timestamp.toLocaleString('en-US')}`,
    `Model: ${conv.model}`,
    `Tokens: ${conv.contextTokensUsed.toLocaleString()} / ${conv.contextTokenLimit.toLocaleString()} (${percentUsed}%)`,
    `Changes: +${conv.totalLinesAdded} -${conv.totalLinesRemoved} lines in ${conv.filesChangedCount} files`,
    `Messages: ${conv.messageCount}`,
    `Composer ID: ${conv.composerId}`,
    '='.repeat(80),
    ''
  ];
  
  for (const msg of conv.messages) {
    const msgTime = new Date(msg.timestamp).toLocaleTimeString('en-US');
    const role = msg.role.toUpperCase();
    
    lines.push(
      '',
      '-'.repeat(80),
      `[${role}] ${msgTime}`,
      '-'.repeat(80),
      msg.text
    );
  }
  
  lines.push('', '='.repeat(80), 'End of conversation', '='.repeat(80));
  
  fs.writeFileSync(path.join(CHATS_DIR, filename), lines.join('\n'), 'utf-8');
  return filename;
}

// Generate statistics
function generateStats(conversations, startOfDay, endOfDay) {
  const daysDiff = Math.ceil((endOfDay - startOfDay) / (1000 * 60 * 60 * 24));
  
  const stats = {
    totalConversations: conversations.length,
    totalMessages: 0,
    totalTokens: 0,
    totalLinesAdded: 0,
    totalLinesRemoved: 0,
    totalFilesChanged: 0,
    modelUsage: {},
    workspaceUsage: {},
    hourlyDistribution: Array(24).fill(0),
    dailyDistribution: {},
    isMultiDay: daysDiff > 1,
    conversations: [],
    generatedAt: new Date().toLocaleString('en-US')
  };
  
  for (const conv of conversations) {
    const ts = new Date(conv.timestamp);
    
    stats.totalMessages += conv.messageCount;
    stats.totalTokens += conv.contextTokensUsed;
    stats.totalLinesAdded += conv.totalLinesAdded;
    stats.totalLinesRemoved += conv.totalLinesRemoved;
    stats.totalFilesChanged += conv.filesChangedCount;
    
    stats.modelUsage[conv.model] = (stats.modelUsage[conv.model] || 0) + 1;
    stats.workspaceUsage[conv.workspace] = (stats.workspaceUsage[conv.workspace] || 0) + 1;
    stats.hourlyDistribution[ts.getHours()]++;
    
    const dateKey = ts.toLocaleDateString('en-US');
    stats.dailyDistribution[dateKey] = (stats.dailyDistribution[dateKey] || 0) + 1;
    
    const firstUserMsg = conv.messages.find(m => m.role === 'user');
    const preview = firstUserMsg?.text.substring(0, 100) + (firstUserMsg?.text.length > 100 ? '...' : '') || '(no user message)';
    
    stats.conversations.push({
      timestamp: conv.timestamp,
      time: ts.toLocaleTimeString('en-US'),
      date: ts.toLocaleDateString('en-US'),
      datetime: ts.toLocaleString('en-US'),
      name: conv.name,
      workspace: conv.workspace,
      model: conv.model,
      messages: conv.messageCount,
      tokens: conv.contextTokensUsed,
      contextLimit: conv.contextTokenLimit,
      linesChanged: `+${conv.totalLinesAdded}/-${conv.totalLinesRemoved}`,
      files: conv.filesChangedCount,
      preview
    });
  }
  
  stats.conversations.sort((a, b) => a.timestamp - b.timestamp);
  
  return stats;
}

// Main
async function main() {
  console.log('Cursor Usage Analyzer v2\n');
  
  const { startOfDay, endOfDay, dateStr } = parseArgs();
  
  console.log(`Analyzing: ${dateStr}`);
  console.log(`Period: ${new Date(startOfDay).toLocaleString('en-US')} - ${new Date(endOfDay).toLocaleString('en-US')}\n`);
  
  // Prepare output folders
  if (fs.existsSync(OUTPUT_DIR)) fs.rmSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(CHATS_DIR, { recursive: true });
  
  console.log('Extracting conversations...');
  
  const conversations = extractConversations(startOfDay, endOfDay);
  
  console.log(`Found ${conversations.length} conversations\n`);
  
  if (conversations.length === 0) {
    console.log('No conversations found in specified period');
    return;
  }
  
  console.log('Exporting conversations...');
  conversations.forEach((conv, i) => {
    exportConversation(conv, i + 1, dateStr);
  });
  
  console.log('Generating statistics...');
  const stats = generateStats(conversations, startOfDay, endOfDay);
  
  console.log('Generating HTML report...');
  try {
    generateHTMLReport(stats, dateStr, REPORT_PATH);
  } catch (e) {
    console.error('Error generating report:', e.message);
    console.error(e.stack);
    return;
  }
  
  console.log('\nDone!\n');
  console.log(`Export folder: ${OUTPUT_DIR}`);
  console.log(`Conversations: ${conversations.length}`);
  console.log(`Report: ${REPORT_PATH}`);
}

main().catch(console.error);
