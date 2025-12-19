import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SimpleMarkdown = ({ content, className = '' }) => {
  // Handle empty or invalid content
  if (!content) return null;
  
  // Convert content to string if needed
  const textContent = typeof content === 'string' ? content : String(content);
  
  try {
    return (
      <div className={`markdown-content ${className}`}>
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          children={textContent}
          skipHtml={true}
        />
      </div>
    );
  } catch (error) {
    console.error('Markdown render error:', error);
    return <div className="whitespace-pre-wrap">{textContent}</div>;
  }
};

export default SimpleMarkdown;