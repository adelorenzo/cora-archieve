import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Search, Archive, Star, Trash2, Download, Upload, MoreHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import conversationManager from '../lib/conversation-manager';
import { cn } from '../lib/utils';

const ConversationSwitcher = ({ onConversationChange, className }) => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
    
    // Listen for conversation changes
    const handleChange = (data) => {
      setConversations(data.conversations);
      setActiveConversation(data.activeConversation);
    };
    
    conversationManager.addListener(handleChange);
    return () => conversationManager.removeListener(handleChange);
  }, []);

  const loadConversations = () => {
    const convs = showArchived 
      ? conversationManager.getArchivedConversations()
      : conversationManager.getAllConversations();
    setConversations(convs);
    setActiveConversation(conversationManager.getActiveConversation());
  };

  // Update conversations when showArchived changes
  useEffect(() => {
    loadConversations();
  }, [showArchived]);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = conversationManager.searchConversations(searchQuery, {
        includeArchived: showArchived,
        searchMessages: true,
        searchTitles: true
      });
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, showArchived]);

  const createNewConversation = () => {
    const conversation = conversationManager.createConversation('New Chat');
    onConversationChange?.(conversation);
    setSearchQuery('');
  };

  const switchToConversation = (conversation) => {
    conversationManager.switchToConversation(conversation.id);
    onConversationChange?.(conversation);
    setSearchQuery('');
  };

  const toggleArchiveConversation = (conversationId, archived) => {
    conversationManager.updateConversation(conversationId, { archived: !archived });
    loadConversations();
  };

  const toggleStarConversation = (conversationId, starred) => {
    conversationManager.updateConversation(conversationId, { starred: !starred });
    loadConversations();
  };

  const deleteConversation = (conversationId) => {
    if (confirm('Are you sure you want to delete this conversation?')) {
      const deleted = conversationManager.deleteConversation(conversationId);
      if (deleted) {
        loadConversations();
        // If this was the active conversation, onConversationChange will be called
        // by the conversation manager listener
      }
    }
  };

  const exportConversation = (conversationId, format = 'json') => {
    const exported = conversationManager.exportConversation(conversationId, format);
    if (exported) {
      const conversation = conversationManager.getConversation(conversationId);
      const filename = `${conversation.title.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`;
      
      const blob = new Blob([exported], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const displayConversations = searchResults.length > 0 
    ? searchResults.map(result => result.conversation)
    : conversations;

  const formatTime = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getConversationPreview = (conversation) => {
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (!lastMessage) return 'No messages yet';
    
    const content = lastMessage.content || '';
    const preview = content.length > 60 ? content.substring(0, 60) + '...' : content;
    return preview || 'No messages yet';
  };

  return (
    <>
      <div className={cn("flex flex-col h-full bg-card border-r border-border", className)}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-foreground">Conversations</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={createNewConversation}
                className="text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowManager(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          
          {/* Filter toggle */}
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant={!showArchived ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowArchived(false)}
              className="text-xs"
            >
              Active
            </Button>
            <Button
              variant={showArchived ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowArchived(true)}
              className="text-xs"
            >
              Archived
            </Button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {displayConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {searchQuery ? 'No conversations found' : showArchived ? 'No archived conversations' : 'No conversations yet'}
            </div>
          ) : (
            <div className="p-2">
              {displayConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                    "hover:bg-accent/50",
                    activeConversation?.id === conversation.id && "bg-accent"
                  )}
                  onClick={() => switchToConversation(conversation)}
                >
                  <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sm text-foreground truncate">
                        {conversation.title}
                      </h3>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {conversation.starred && (
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStarConversation(conversation.id, conversation.starred);
                              }}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              {conversation.starred ? 'Unstar' : 'Star'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleArchiveConversation(conversation.id, conversation.archived);
                              }}
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              {conversation.archived ? 'Unarchive' : 'Archive'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                exportConversation(conversation.id, 'markdown');
                              }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Export
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteConversation(conversation.id);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground truncate mb-1">
                      {getConversationPreview(conversation)}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(conversation.updatedAt)}
                      </span>
                      <div className="flex items-center gap-1">
                        {conversation.messages.length > 0 && (
                          <Badge variant="secondary" className="text-xs h-5">
                            {conversation.messages.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Conversation Manager Dialog */}
      <Dialog open={showManager} onOpenChange={setShowManager}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Conversations</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const exported = conversationManager.exportAll('json');
                  const blob = new Blob([exported], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `conversations_${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        try {
                          const data = JSON.parse(e.target.result);
                          if (data.conversations) {
                            data.conversations.forEach(conv => {
                              conversationManager.importConversation(conv);
                            });
                            loadConversations();
                          }
                        } catch (error) {
                          alert('Failed to import conversations');
                        }
                      };
                      reader.readAsText(file);
                    }
                  };
                  input.click();
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </div>
            
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('Are you sure you want to delete ALL conversations? This cannot be undone.')) {
                  conversationManager.clearAll();
                  loadConversations();
                  setShowManager(false);
                }
              }}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Conversations
            </Button>
            
            <div className="text-sm text-muted-foreground">
              <div>Total: {conversations.length} conversations</div>
              <div>Storage: {(conversationManager.getStats().storageSize / 1024).toFixed(1)} KB</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ConversationSwitcher;