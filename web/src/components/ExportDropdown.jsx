import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FileText, FileCode, Table } from 'lucide-react';
import { exportConversation } from '../lib/export-utils';

const ExportDropdown = ({ isOpen, onClose, messages, title }) => {
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  console.log('[ExportDropdown] isOpen:', isOpen, 'messages:', messages?.length);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      // Don't close if clicking the export button itself
      const exportButton = document.querySelector('[aria-label="Export conversation"]');
      if (exportButton && exportButton.contains(event.target)) {
        return;
      }

      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    // Use click event instead of mousedown to avoid conflicts with button onClick
    // Add a small delay to ensure the dropdown is fully rendered
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      // Position the dropdown relative to the export button
      const button = document.querySelector('[aria-label="Export conversation"]');
      if (button) {
        const rect = button.getBoundingClientRect();
        dropdownRef.current.style.position = 'fixed';
        dropdownRef.current.style.top = `${rect.bottom + 8}px`;
        dropdownRef.current.style.right = `${window.innerWidth - rect.right}px`;
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const content = (
    <div
      ref={dropdownRef}
      className="w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
      style={{ zIndex: 10000 }}
    >
      <div className="py-1">
        <button
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left transition-colors"
          onClick={() => {
            exportConversation(messages, 'markdown', title);
            onClose();
          }}
        >
          <FileText className="h-4 w-4" />
          Export as Markdown
        </button>
        <button
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left transition-colors"
          onClick={() => {
            exportConversation(messages, 'text', title);
            onClose();
          }}
        >
          <FileCode className="h-4 w-4" />
          Export as Plain Text
        </button>
        <button
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left transition-colors"
          onClick={() => {
            exportConversation(messages, 'csv', title);
            onClose();
          }}
        >
          <Table className="h-4 w-4" />
          Export as CSV
        </button>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};

export default ExportDropdown;