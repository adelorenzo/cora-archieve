import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MarkdownRenderer = ({ content }) => {
  // Memoize the rendered content to prevent re-renders
  const renderedContent = useMemo(() => {
    if (!content || typeof content !== 'string') {
      return null;
    }

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml={true}
        components={{
          // Code blocks with proper handling
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';
            
            // Extract text content properly
            const codeString = String(children).replace(/\n$/, '');
            
            if (!inline && lang) {
              return (
                <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto mb-2 text-sm">
                  <code className={className} {...props}>
                    {codeString}
                  </code>
                </pre>
              );
            }
            
            return (
              <code className="bg-gray-100 text-pink-600 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                {codeString}
              </code>
            );
          },
          // Simple paragraph without custom logic
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          // Headers
          h1: ({ children }) => <h1 className="text-2xl font-bold mb-3 mt-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold mb-2 mt-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-2">{children}</h3>,
          // Lists
          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          // Links
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" 
               className="text-purple-600 hover:text-purple-800 underline">
              {children}
            </a>
          ),
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-purple-400 pl-4 py-1 mb-2 italic text-gray-600">
              {children}
            </blockquote>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    );
  }, [content]);

  return (
    <div className="markdown-render text-gray-800 leading-relaxed">
      {renderedContent}
    </div>
  );
};

export default MarkdownRenderer;