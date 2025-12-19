import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Cpu, Globe, Database, Shield, Zap, BookOpen } from 'lucide-react';

function AboutModal({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" onClose={onClose}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src="/icon-192.png" alt="Cora" className="w-6 h-6 rounded" />
            About Cora
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">
            Cora is a privacy-focused AI assistant that processes your conversations
            directly in your browser using WebGPU or WASM technology.
          </p>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              What runs locally
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2 ml-6">
              <li className="flex items-start gap-2">
                <Cpu className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span><strong>AI Chat</strong> — LLM inference runs in your browser using WebGPU (GPU) or WASM (CPU)</span>
              </li>
              <li className="flex items-start gap-2">
                <BookOpen className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span><strong>Document Library (RAG)</strong> — Embeddings and semantic search run locally using transformers.js</span>
              </li>
              <li className="flex items-start gap-2">
                <Database className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span><strong>Your Data</strong> — Conversations, documents, and settings stored in browser's IndexedDB</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Globe className="h-4 w-4 text-amber-500" />
              What requires internet
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2 ml-6">
              <li className="flex items-start gap-2">
                <Zap className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                <span><strong>Initial Download</strong> — AI models are downloaded from CDN on first use (then cached locally)</span>
              </li>
              <li className="flex items-start gap-2">
                <Globe className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                <span><strong>Web Search</strong> — Optional feature that queries external search services for current information</span>
              </li>
            </ul>
          </div>

          <div className="pt-3 border-t border-border">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">
                WebGPU / WASM
              </Badge>
              <Badge variant="secondary" className="text-xs">
                No API Keys
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Local RAG
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Privacy First
              </Badge>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Once models are cached, chat and document search work fully offline.
            Web search is the only feature requiring an active internet connection.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AboutModal;
