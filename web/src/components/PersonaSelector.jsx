import React, { useState, useRef, useEffect } from 'react';
import { usePersona } from '../contexts/PersonaContext';
import { User, Plus, Edit2, Trash2 } from 'lucide-react';
import DropdownPortal from './DropdownPortal';

const PersonaSelector = () => {
  const { 
    personas, 
    activePersona, 
    setActivePersona,
    saveCustomPersona,
    deleteCustomPersona,
    isCustomPersona
  } = usePersona();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    icon: '🎭',
    systemPrompt: '',
    temperature: 0.7
  });

  useEffect(() => {
    if (!isOpen) return;

    // Calculate dropdown position
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        right: window.innerWidth - rect.right + window.scrollX
      });
    }

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsCreating(false);
        setEditingPersona(null);
      }
    };

    // Delay adding the listener to avoid catching the opening click
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCreate = () => {
    if (formData.name && formData.systemPrompt) {
      const id = formData.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
      saveCustomPersona({
        id,
        ...formData
      });
      setFormData({ name: '', icon: '🎭', systemPrompt: '', temperature: 0.7 });
      setIsCreating(false);
    }
  };

  const handleEdit = (persona) => {
    setEditingPersona(persona.id);
    setFormData({
      name: persona.name,
      icon: persona.icon,
      systemPrompt: persona.systemPrompt,
      temperature: persona.temperature
    });
  };

  const handleUpdate = () => {
    if (formData.name && formData.systemPrompt) {
      saveCustomPersona({
        id: editingPersona,
        ...formData
      });
      setEditingPersona(null);
      setFormData({ name: '', icon: '🎭', systemPrompt: '', temperature: 0.7 });
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
      >
        <span className="text-lg">{personas[activePersona]?.icon}</span>
        <span className="text-sm font-medium">{personas[activePersona]?.name}</span>
        <User className="w-4 h-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <DropdownPortal>
          <div 
            ref={dropdownRef}
            className="fixed w-80 rounded-lg bg-popover border border-border shadow-lg z-[9999] max-h-[500px] overflow-y-auto"
            style={{ 
              top: `${dropdownPosition.top + 8}px`, 
              right: `${dropdownPosition.right}px` 
            }}
          >
            <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Select Persona</span>
              <button
                onClick={() => setIsCreating(true)}
                className="p-1 rounded hover:bg-secondary transition-colors"
                title="Create custom persona"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Persona List */}
            {!isCreating && !editingPersona && (
              <div className="space-y-1">
                {Object.values(personas).map((persona) => (
                  <div
                    key={persona.id}
                    className={`flex items-center gap-2 p-2 rounded-md hover:bg-secondary transition-colors ${
                      activePersona === persona.id ? 'bg-secondary' : ''
                    }`}
                  >
                    <button
                      onClick={() => {
                        setActivePersona(persona.id);
                        setIsOpen(false);
                      }}
                      className="flex-1 flex items-center gap-2 text-left"
                    >
                      <span className="text-lg">{persona.icon}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">{persona.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {persona.systemPrompt}
                        </div>
                      </div>
                    </button>
                    {isCustomPersona(persona.id) && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(persona)}
                          className="p-1 rounded hover:bg-background transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteCustomPersona(persona.id)}
                          className="p-1 rounded hover:bg-destructive/20 transition-colors text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Create/Edit Form */}
            {(isCreating || editingPersona) && (
              <div className="space-y-3">
                <div className="text-sm font-medium mb-2 text-foreground">
                  {isCreating ? 'Create Custom Persona' : 'Edit Persona'}
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-12 px-2 py-1 rounded bg-background border border-input text-center"
                    placeholder="🎭"
                    maxLength={2}
                  />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="flex-1 px-2 py-1 rounded bg-background border border-input"
                    placeholder="Persona name"
                  />
                </div>

                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  className="w-full px-2 py-1 rounded bg-background border border-input resize-none"
                  placeholder="System prompt..."
                  rows={4}
                />

                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Temperature:</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-xs w-8">{formData.temperature}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setEditingPersona(null);
                      setFormData({ name: '', icon: '🎭', systemPrompt: '', temperature: 0.7 });
                    }}
                    className="flex-1 px-3 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={isCreating ? handleCreate : handleUpdate}
                    className="flex-1 px-3 py-1 rounded bg-primary hover:bg-primary/80 transition-colors text-sm text-primary-foreground"
                  >
                    {isCreating ? 'Create' : 'Update'}
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        </DropdownPortal>
      )}
    </div>
  );
};

export default PersonaSelector;