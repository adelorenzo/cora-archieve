import React, { useState, useRef, useCallback } from 'react';
import { Upload, File, X, Eye, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import dbService from '../lib/database/db-service';
import ragService from '../lib/embeddings/rag-service';
import { cn } from '../lib/utils';

const SUPPORTED_TYPES = {
  'text/plain': { ext: 'txt', icon: File, color: 'bg-blue-500' },
  'text/markdown': { ext: 'md', icon: File, color: 'bg-green-500' },
  'application/pdf': { ext: 'pdf', icon: File, color: 'bg-red-500' }
};

const DocumentUpload = ({ onDocumentsChange, className }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [previewDoc, setPreviewDoc] = useState(null);
  const fileInputRef = useRef(null);

  // Load documents on mount
  React.useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      // Initialize database if not already initialized
      if (!dbService.initialized) {
        await dbService.initialize();
      }
      
      const docs = await dbService.searchDocuments({}, { limit: 100 });
      setDocuments(docs);
      onDocumentsChange?.(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (files) => {
    const validFiles = files.filter(file => 
      Object.keys(SUPPORTED_TYPES).includes(file.type) || file.name.endsWith('.txt') || file.name.endsWith('.md')
    );

    if (validFiles.length === 0) {
      alert('Please select supported file types: TXT, MD, PDF');
      return;
    }

    setUploading(true);

    try {
      // Initialize database if not already initialized
      if (!dbService.initialized) {
        await dbService.initialize();
      }
      
      for (const file of validFiles) {
        const fileId = `file_${Date.now()}_${file.name}`;
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

        // Read file content
        const content = await readFileContent(file);
        setUploadProgress(prev => ({ ...prev, [fileId]: 30 }));

        // Determine content type
        let contentType = file.type;
        if (!contentType) {
          if (file.name.endsWith('.txt')) contentType = 'text/plain';
          else if (file.name.endsWith('.md')) contentType = 'text/markdown';
        }

        // Create document record
        const doc = await dbService.createDocument({
          title: file.name.replace(/\.[^/.]+$/, ''),
          filename: file.name,
          content,
          contentType,
          size: file.size,
          status: 'pending',
          indexed: false,
          metadata: {
            uploadedAt: new Date(),
            originalSize: file.size
          }
        });

        setUploadProgress(prev => ({ ...prev, [fileId]: 60 }));

        // Auto-index the document if RAG is initialized
        try {
          if (ragService.initialized) {
            setUploadProgress(prev => ({ ...prev, [fileId]: 80 }));
            await ragService.indexDocument({
              content: content,
              metadata: {
                title: doc.title,
                filename: doc.filename,
                documentId: doc._id,
                type: contentType
              }
            });

            // Update document status to indexed
            await dbService.updateDocument(doc._id, {
              status: 'completed',
              indexed: true
            });
          } else {
            // Queue for indexing once RAG is ready
            console.log('[DocumentUpload] RAG not ready, document will be indexed when ready');
            await dbService.updateDocument(doc._id, {
              status: 'pending',
              indexed: false
            });
          }
        } catch (indexError) {
          console.warn('[DocumentUpload] Failed to index document:', indexError);
          await dbService.updateDocument(doc._id, {
            status: 'error',
            indexed: false,
            error: indexError.message
          });
        }

        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));

        // Remove progress after delay
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileId];
            return newProgress;
          });
        }, 2000);
      }

      // Reload documents
      await loadDocuments();
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      
      if (file.type === 'application/pdf') {
        // For PDF files, we would typically use a PDF.js library
        // For now, we'll just read as text and note it's a placeholder
        reader.readAsText(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const deleteDocument = async (docId) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await dbService.deleteDocument(docId);
      await loadDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert(`Delete failed: ${error.message}`);
    }
  };

  const previewDocument = (doc) => {
    setPreviewDoc(doc);
  };

  const getFileIcon = (contentType) => {
    const type = SUPPORTED_TYPES[contentType];
    return type ? type.icon : File;
  };

  const getFileColor = (contentType) => {
    const type = SUPPORTED_TYPES[contentType];
    return type ? type.color : 'bg-gray-500';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'processing': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Upload Area */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-colors",
          dragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
          uploading && "pointer-events-none opacity-50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
          onChange={handleChange}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center",
            dragActive ? "bg-primary text-primary-foreground" : "bg-secondary"
          )}>
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>
          
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {uploading ? 'Processing files...' : 'Upload Documents'}
            </p>
            <p className="text-sm text-muted-foreground">
              Drag and drop files here
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!uploading) fileInputRef.current?.click();
              }}
              disabled={uploading}
              className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Or click to browse files
            </button>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {Object.entries(uploadProgress).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Uploading...</h3>
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{fileId.split('_').pop()}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          ))}
        </div>
      )}

      {/* Document List */}
      {documents.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Uploaded Documents ({documents.length})</h3>
            <div className="text-sm text-muted-foreground">
              {documents.filter(d => d.indexed).length} indexed
            </div>
          </div>

          <div className="grid gap-3">
            {documents.map((doc) => {
              const FileIcon = getFileIcon(doc.contentType);
              
              return (
                <div
                  key={doc._id}
                  className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border hover:bg-secondary/50 transition-colors"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-white",
                    getFileColor(doc.contentType)
                  )}>
                    <FileIcon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{doc.title}</h4>
                      {doc.indexed && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                      {doc.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                      {doc.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-yellow-500 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>{formatFileSize(doc.size)}</span>
                      <span className={getStatusColor(doc.status)}>
                        {doc.status || 'pending'}
                      </span>
                      <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => previewDocument(doc)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteDocument(doc._id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50">
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewDoc(null)}
          />
          <div className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]">
            <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h2 className="text-xl font-semibold">{previewDoc.title}</h2>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>{formatFileSize(previewDoc.size)}</span>
                    <Badge variant={previewDoc.indexed ? 'default' : 'secondary'}>
                      {previewDoc.indexed ? 'Indexed' : 'Not Indexed'}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPreviewDoc(null)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <pre className="whitespace-pre-wrap text-sm font-mono bg-secondary/50 p-4 rounded-lg">
                  {previewDoc.content.length > 5000 
                    ? previewDoc.content.substring(0, 5000) + '\n\n... (truncated)'
                    : previewDoc.content
                  }
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;