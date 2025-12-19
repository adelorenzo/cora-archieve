import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentUpload from '../DocumentUpload';

// Mock the database services
jest.mock('../../lib/database/db-service', () => ({
  searchDocuments: jest.fn(() => Promise.resolve([])),
  createDocument: jest.fn(() => Promise.resolve({ _id: 'test-id', title: 'test.txt' })),
  deleteDocument: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../lib/embeddings/rag-service', () => ({
  queueForIndexing: jest.fn(),
}));

describe('DocumentUpload', () => {
  const mockOnDocumentsChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders upload area with correct text', () => {
    render(<DocumentUpload onDocumentsChange={mockOnDocumentsChange} />);
    
    expect(screen.getByText('Upload Documents')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop or click to select TXT, MD, or PDF files')).toBeInTheDocument();
  });

  test('shows drag active state when dragging over', () => {
    render(<DocumentUpload onDocumentsChange={mockOnDocumentsChange} />);
    
    const uploadArea = screen.getByText('Upload Documents').closest('div').parentElement;
    
    fireEvent.dragEnter(uploadArea);
    expect(uploadArea).toHaveClass('border-primary');
  });

  test('handles file input change', () => {
    render(<DocumentUpload onDocumentsChange={mockOnDocumentsChange} />);
    
    const fileInput = screen.getByRole('button', { name: /upload documents/i })
      .parentElement.querySelector('input[type="file"]');
    
    expect(fileInput).toHaveAttribute('accept', '.txt,.md,.pdf,text/plain,text/markdown,application/pdf');
    expect(fileInput).toHaveAttribute('multiple');
  });

  test('opens file picker when upload area is clicked', () => {
    render(<DocumentUpload onDocumentsChange={mockOnDocumentsChange} />);
    
    const uploadArea = screen.getByText('Upload Documents').closest('div');
    const fileInput = uploadArea.querySelector('input[type="file"]');
    
    const clickSpy = jest.spyOn(fileInput, 'click');
    fireEvent.click(uploadArea);
    
    expect(clickSpy).toHaveBeenCalled();
  });

  test('displays empty state when no documents', async () => {
    render(<DocumentUpload onDocumentsChange={mockOnDocumentsChange} />);
    
    await waitFor(() => {
      expect(mockOnDocumentsChange).toHaveBeenCalledWith([]);
    });
  });
});