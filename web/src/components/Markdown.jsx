import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

const Markdown = ({ content, className = '' }) => {
  // Handle empty or invalid content
  if (!content) return null;
  
  return (
    <ReactMarkdown
      className={`markdown-content ${className}`}
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        // Custom renderers for markdown elements
        h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-4">{children}</h3>,
        h4: ({ children }) => <h4 className="text-base font-semibold mb-2 mt-3">{children}</h4>,
        p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-300 pl-4 py-2 mb-3 italic text-gray-700">
            {children}
          </blockquote>
        ),
        code: ({ inline, className, children }) => {
          if (inline) {
            return (
              <code className="px-1.5 py-0.5 bg-gray-100 text-pink-600 rounded text-sm font-mono">
                {children}
              </code>
            );
          }
          return (
            <code className={`${className} block`}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-3 text-sm">
            {children}
          </pre>
        ),
        a: ({ href, children }) => (
          <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-800 underline"
          >
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto mb-3">
            <table className="min-w-full divide-y divide-gray-200">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-gray-50">{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>
        ),
        tr: ({ children }) => <tr>{children}</tr>,
        th: ({ children }) => (
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
            {children}
          </td>
        ),
        hr: () => <hr className="my-4 border-gray-200" />,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default Markdown;