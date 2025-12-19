/**
 * Export utilities for converting conversations to different formats
 */

/**
 * Export messages to Markdown format
 */
export function exportToMarkdown(messages, conversationTitle = 'Conversation') {
  let markdown = `# ${conversationTitle}\n\n`;
  markdown += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;

  messages.forEach(msg => {
    const role = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
    markdown += `## ${role}\n\n`;
    markdown += `${msg.content}\n\n`;
    markdown += `---\n\n`;
  });

  return markdown;
}

/**
 * Export messages to Plain Text format
 */
export function exportToPlainText(messages, conversationTitle = 'Conversation') {
  let text = `${conversationTitle}\n`;
  text += `${'='.repeat(conversationTitle.length)}\n\n`;
  text += `Exported on ${new Date().toLocaleString()}\n\n`;
  text += `${'-'.repeat(50)}\n\n`;

  messages.forEach(msg => {
    const role = msg.role === 'user' ? 'User' : 'Assistant';
    text += `[${role}]\n`;
    text += `${msg.content}\n\n`;
    text += `${'-'.repeat(50)}\n\n`;
  });

  return text;
}

/**
 * Export messages to CSV format
 */
export function exportToCSV(messages, conversationTitle = 'Conversation') {
  const headers = ['Timestamp', 'Role', 'Content'];
  const rows = [headers];

  const timestamp = new Date().toISOString();

  messages.forEach(msg => {
    const role = msg.role === 'user' ? 'User' : 'Assistant';
    // Escape quotes and wrap content in quotes for CSV
    const content = `"${msg.content.replace(/"/g, '""')}"`;
    rows.push([timestamp, role, content]);
  });

  // Convert to CSV string
  return rows.map(row => row.join(',')).join('\n');
}

/**
 * Trigger file download in browser
 */
export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export conversation with format selection
 */
export function exportConversation(messages, format, title = 'Cora Chat') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  let content, filename, mimeType;

  switch (format) {
    case 'markdown':
      content = exportToMarkdown(messages, title);
      filename = `${title.replace(/\s+/g, '_')}_${timestamp}.md`;
      mimeType = 'text/markdown';
      break;

    case 'text':
      content = exportToPlainText(messages, title);
      filename = `${title.replace(/\s+/g, '_')}_${timestamp}.txt`;
      mimeType = 'text/plain';
      break;

    case 'csv':
      content = exportToCSV(messages, title);
      filename = `${title.replace(/\s+/g, '_')}_${timestamp}.csv`;
      mimeType = 'text/csv';
      break;

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  downloadFile(content, filename, mimeType);
}