/**
 * Client-side File Parser Service
 * Extracts text from PDF, DOCX, XLSX, and other file formats
 * Runs entirely in the browser - no server required
 */

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Supported file types and their MIME types
 */
export const SUPPORTED_TYPES = {
  // Documents
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',

  // Spreadsheets
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'text/csv': 'csv',

  // Text
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/html': 'html',
  'application/json': 'json',
};

/**
 * Check if a file type is supported
 */
export function isSupported(file) {
  const mimeType = file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();

  return (
    SUPPORTED_TYPES[mimeType] ||
    ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'txt', 'md', 'html', 'json'].includes(extension)
  );
}

/**
 * Get file type from file object
 */
function getFileType(file) {
  const mimeType = file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();

  return SUPPORTED_TYPES[mimeType] || extension;
}

/**
 * Parse PDF file and extract text
 */
async function parsePDF(arrayBuffer) {
  try {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const textParts = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      textParts.push(pageText);
    }

    return {
      text: textParts.join('\n\n'),
      metadata: {
        pageCount: pdf.numPages,
        format: 'pdf'
      }
    };
  } catch (error) {
    console.error('[FileParser] PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

/**
 * Parse DOCX file and extract text
 */
async function parseDOCX(arrayBuffer) {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });

    return {
      text: result.value,
      metadata: {
        format: 'docx',
        messages: result.messages
      }
    };
  } catch (error) {
    console.error('[FileParser] DOCX parsing error:', error);
    throw new Error(`Failed to parse DOCX: ${error.message}`);
  }
}

/**
 * Parse Excel file (XLSX/XLS) and extract text
 */
async function parseExcel(arrayBuffer) {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const textParts = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      // Convert to CSV for text extraction
      const csv = XLSX.utils.sheet_to_csv(sheet);
      textParts.push(`## Sheet: ${sheetName}\n${csv}`);
    }

    return {
      text: textParts.join('\n\n'),
      metadata: {
        format: 'xlsx',
        sheetCount: workbook.SheetNames.length,
        sheetNames: workbook.SheetNames
      }
    };
  } catch (error) {
    console.error('[FileParser] Excel parsing error:', error);
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
}

/**
 * Parse CSV file
 */
async function parseCSV(text) {
  return {
    text: text,
    metadata: {
      format: 'csv'
    }
  };
}

/**
 * Parse HTML file and extract text
 */
async function parseHTML(text) {
  // Create a temporary DOM element to parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');

  // Remove script and style elements
  const scripts = doc.querySelectorAll('script, style, noscript');
  scripts.forEach(el => el.remove());

  // Get text content
  const extractedText = doc.body?.textContent || doc.textContent || '';

  return {
    text: extractedText.replace(/\s+/g, ' ').trim(),
    metadata: {
      format: 'html',
      title: doc.title || null
    }
  };
}

/**
 * Parse JSON file
 */
async function parseJSON(text) {
  try {
    const parsed = JSON.parse(text);
    return {
      text: JSON.stringify(parsed, null, 2),
      metadata: {
        format: 'json'
      }
    };
  } catch (error) {
    // Return as plain text if JSON parsing fails
    return {
      text: text,
      metadata: {
        format: 'json',
        parseError: true
      }
    };
  }
}

/**
 * Parse plain text / markdown
 */
async function parseText(text) {
  return {
    text: text,
    metadata: {
      format: 'text'
    }
  };
}

/**
 * Main parsing function - detects file type and parses accordingly
 */
export async function parseFile(file, progressCallback = null) {
  const fileType = getFileType(file);

  if (progressCallback) progressCallback(10);

  try {
    let result;

    switch (fileType) {
      case 'pdf': {
        const arrayBuffer = await file.arrayBuffer();
        if (progressCallback) progressCallback(30);
        result = await parsePDF(arrayBuffer);
        break;
      }

      case 'docx':
      case 'doc': {
        const arrayBuffer = await file.arrayBuffer();
        if (progressCallback) progressCallback(30);
        result = await parseDOCX(arrayBuffer);
        break;
      }

      case 'xlsx':
      case 'xls': {
        const arrayBuffer = await file.arrayBuffer();
        if (progressCallback) progressCallback(30);
        result = await parseExcel(arrayBuffer);
        break;
      }

      case 'csv': {
        const text = await file.text();
        if (progressCallback) progressCallback(30);
        result = await parseCSV(text);
        break;
      }

      case 'html': {
        const text = await file.text();
        if (progressCallback) progressCallback(30);
        result = await parseHTML(text);
        break;
      }

      case 'json': {
        const text = await file.text();
        if (progressCallback) progressCallback(30);
        result = await parseJSON(text);
        break;
      }

      case 'txt':
      case 'md':
      default: {
        const text = await file.text();
        if (progressCallback) progressCallback(30);
        result = await parseText(text);
        break;
      }
    }

    if (progressCallback) progressCallback(100);

    // Add file info to metadata
    result.metadata = {
      ...result.metadata,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      parsedAt: new Date().toISOString()
    };

    return result;
  } catch (error) {
    console.error('[FileParser] Error parsing file:', error);
    throw error;
  }
}

/**
 * Get list of supported file extensions
 */
export function getSupportedExtensions() {
  return ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'txt', 'md', 'html', 'json'];
}

/**
 * Get accept string for file input
 */
export function getAcceptString() {
  return '.pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.html,.json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/markdown,text/csv,text/html,application/json';
}

export default {
  parseFile,
  isSupported,
  getSupportedExtensions,
  getAcceptString,
  SUPPORTED_TYPES
};
