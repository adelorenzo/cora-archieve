import React from 'react';

const SimpleMarkdownRenderer = ({ content }) => {
  if (!content || typeof content !== 'string') {
    return null;
  }

  // Simple markdown parsing without external dependencies
  const renderContent = () => {
    const lines = content.split('\n');
    const elements = [];
    let inCodeBlock = false;
    let codeBlockContent = [];
    let codeBlockLang = '';

    lines.forEach((line, index) => {
      // Code block handling
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockLang = line.slice(3).trim();
          codeBlockContent = [];
        } else {
          inCodeBlock = false;
          elements.push(
            <pre
              key={`code-${index}`}
              className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto mb-2 text-sm"
            >
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          );
          codeBlockContent = [];
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Inline code
      let processedLine = line;
      const inlineCodeRegex = /`([^`]+)`/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = inlineCodeRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.slice(lastIndex, match.index));
        }
        parts.push(
          <code key={`inline-${index}-${match.index}`} className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
            {match[1]}
          </code>
        );
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < line.length) {
        parts.push(line.slice(lastIndex));
      }

      processedLine = parts.length > 0 ? parts : line;

      // Headers
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${index}`} className="text-lg font-semibold mt-2 mb-1">
            {line.slice(4)}
          </h3>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${index}`} className="text-xl font-bold mt-3 mb-2">
            {line.slice(3)}
          </h2>
        );
      } else if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${index}`} className="text-2xl font-bold mt-3 mb-2">
            {line.slice(2)}
          </h1>
        );
      }
      // Bold text
      else if (line.includes('**')) {
        const boldParts = line.split(/\*\*(.*?)\*\*/g);
        elements.push(
          <p key={`p-${index}`} className="mb-2">
            {boldParts.map((part, i) =>
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </p>
        );
      }
      // Lists
      else if (line.match(/^[-*+]\s/)) {
        elements.push(
          <li key={`li-${index}`} className="ml-4 list-disc">
            {Array.isArray(processedLine) ? processedLine : line.slice(2)}
          </li>
        );
      }
      else if (line.match(/^\d+\.\s/)) {
        elements.push(
          <li key={`oli-${index}`} className="ml-4 list-decimal">
            {Array.isArray(processedLine) ? processedLine : line.replace(/^\d+\.\s/, '')}
          </li>
        );
      }
      // Regular paragraph
      else if (line.trim()) {
        elements.push(
          <p key={`p-${index}`} className="mb-2 break-words">
            {Array.isArray(processedLine) ? processedLine : line}
          </p>
        );
      }
    });

    // Handle unclosed code block
    if (inCodeBlock && codeBlockContent.length > 0) {
      elements.push(
        <pre key="code-unclosed" className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto mb-2 text-sm">
          <code>{codeBlockContent.join('\n')}</code>
        </pre>
      );
    }

    return elements;
  };

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {renderContent()}
    </div>
  );
};

export default SimpleMarkdownRenderer;