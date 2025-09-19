import React, { useState, useRef } from 'react';
import { Upload, File, X, Loader2, FileText, FileSpreadsheet, FileImage, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import ragService from '../lib/rag-service';

const DocumentUpload = ({ onDocumentsChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const fileInputRef = useRef(null);

  // Load documents and stats on mount
  React.useEffect(() => {
    loadDocuments();
    loadStats();
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await ragService.getDocuments();
      setDocuments(docs);
      if (onDocumentsChange) {
        onDocumentsChange(docs);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  const loadStats = async () => {
    try {
      const stats = await ragService.getStats();
      setStats(stats);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(((i + 0.5) / files.length) * 100);

        // Process based on file type
        if (file.type === 'text/plain' ||
            file.type === 'text/markdown' ||
            file.type === 'application/pdf' ||
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {

          await ragService.processFile(file);
        } else {
          // For other file types, read as text if possible
          const content = await file.text();
          await ragService.processDocument(content, file.name, {
            filename: file.name,
            content_type: file.type,
            size: file.size
          });
        }

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      // Reload documents and stats
      await loadDocuments();
      await loadStats();

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err.message || 'Failed to process files');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleTextUpload = async () => {
    const text = prompt('Paste or type your text content:');
    if (!text) return;

    const title = prompt('Enter a title for this document:') || 'Untitled Document';

    setUploading(true);
    setError(null);

    try {
      await ragService.processDocument(text, title);
      await loadDocuments();
      await loadStats();
    } catch (err) {
      setError(err.message || 'Failed to process text');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await ragService.deleteDocument(docId);
      await loadDocuments();
      await loadStats();
    } catch (err) {
      setError(err.message || 'Failed to delete document');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete ALL documents? This cannot be undone.')) return;

    try {
      await ragService.clearAll();
      await loadDocuments();
      await loadStats();
    } catch (err) {
      setError(err.message || 'Failed to clear documents');
    }
  };

  const getFileIcon = (doc) => {
    const type = doc.metadata?.content_type || '';
    if (type.includes('pdf')) return <FileText className="w-4 h-4" />;
    if (type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet className="w-4 h-4" />;
    if (type.includes('image')) return <FileImage className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="icon"
        title="Manage Documents"
      >
        <Upload className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Document Management</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Upload documents to enhance AI responses with your knowledge base
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="bg-secondary/50 rounded p-2">
                  <div className="font-medium">Documents</div>
                  <div className="text-2xl">{stats.documents}</div>
                </div>
                <div className="bg-secondary/50 rounded p-2">
                  <div className="font-medium">Chunks</div>
                  <div className="text-2xl">{stats.chunks}</div>
                </div>
                <div className="bg-secondary/50 rounded p-2">
                  <div className="font-medium">Storage</div>
                  <div className="text-2xl">{formatFileSize(stats.storage_size)}</div>
                </div>
              </div>
            )}

            {/* Upload Controls */}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept=".txt,.md,.pdf,.docx,.xlsx"
                disabled={uploading}
              />

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Files
                  </>
                )}
              </Button>

              <Button
                onClick={handleTextUpload}
                variant="outline"
                disabled={uploading}
              >
                <FileText className="mr-2 h-4 w-4" />
                Add Text
              </Button>

              {documents.length > 0 && (
                <Button
                  onClick={handleClearAll}
                  variant="destructive"
                  disabled={uploading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Upload Progress */}
            {uploading && (
              <Progress value={uploadProgress} className="w-full" />
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Documents List */}
            <div className="space-y-2">
              <div className="font-medium text-sm">
                Uploaded Documents ({documents.length})
              </div>

              {documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No documents uploaded yet
                </div>
              ) : (
                <div className="space-y-1">
                  {documents.map((doc) => (
                    <div
                      key={doc._id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-secondary/50 group"
                    >
                      {getFileIcon(doc)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {doc.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {doc.chunks} chunks • {new Date(doc.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDeleteDocument(doc._id)}
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="text-xs text-muted-foreground">
              Supported formats: PDF, Word, Excel, Text, Markdown
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DocumentUpload;