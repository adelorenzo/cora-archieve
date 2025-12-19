import React, { createContext, useContext, useState, useEffect } from 'react';
import settingsService from '../lib/settings-service';

const defaultPersonas = {
  assistant: {
    id: 'assistant',
    name: 'Assistant',
    icon: '🤖',
    systemPrompt: 'You are a helpful AI assistant. Be concise, accurate, and friendly in your responses.',
    temperature: 0.7
  },
  coder: {
    id: 'coder',
    name: 'Coder',
    icon: '💻',
    systemPrompt: 'You are an expert programmer. Provide clear, well-commented code with explanations. Focus on best practices, efficiency, and clean code principles. When debugging, think step-by-step.',
    temperature: 0.3
  },
  teacher: {
    id: 'teacher',
    name: 'Teacher',
    icon: '👩‍🏫',
    systemPrompt: 'You are a patient and knowledgeable teacher. Explain concepts clearly, use examples, and adapt your explanations to the learner\'s level. Encourage questions and provide step-by-step guidance.',
    temperature: 0.5
  },
  creative: {
    id: 'creative',
    name: 'Creative Writer',
    icon: '✍️',
    systemPrompt: 'You are a creative writer with a vivid imagination. Help with storytelling, creative writing, brainstorming ideas, and crafting engaging narratives. Be descriptive and original.',
    temperature: 0.9
  },
  analyst: {
    id: 'analyst',
    name: 'Analyst',
    icon: '📊',
    systemPrompt: 'You are a data analyst and strategic thinker. Provide detailed analysis, identify patterns, and offer data-driven insights. Be thorough, objective, and structured in your responses.',
    temperature: 0.4
  }
};

const PersonaContext = createContext();

export const usePersona = () => {
  const context = useContext(PersonaContext);
  if (!context) {
    throw new Error('usePersona must be used within a PersonaProvider');
  }
  return context;
};

export const PersonaProvider = ({ children }) => {
  const [personas, setPersonas] = useState(() => {
    const customPersonas = settingsService.getCustomPersonas();
    const personasMap = {};
    customPersonas.forEach(p => {
      personasMap[p.id] = p;
    });
    return { ...defaultPersonas, ...personasMap };
  });

  const [activePersona, setActivePersonaState] = useState(() => {
    const saved = settingsService.getPersona();
    return saved?.id || 'assistant';
  });

  const setActivePersona = (personaId) => {
    setActivePersonaState(personaId);
    const personaData = personas[personaId];
    if (personaData) {
      settingsService.setPersona(personaData);
    }
  };

  const saveCustomPersona = (persona) => {
    const personaWithId = {
      ...persona,
      id: persona.id || `custom-${Date.now()}`,
      createdAt: Date.now()
    };
    
    const newPersonas = {
      ...personas,
      [personaWithId.id]: personaWithId
    };
    setPersonas(newPersonas);
    
    // Save to settings service
    if (!defaultPersonas[personaWithId.id]) {
      settingsService.addCustomPersona(personaWithId);
    }
  };

  const deleteCustomPersona = (personaId) => {
    if (defaultPersonas[personaId]) {
      return; // Can't delete default personas
    }
    
    const newPersonas = { ...personas };
    delete newPersonas[personaId];
    setPersonas(newPersonas);
    
    // Remove from settings service
    settingsService.removeCustomPersona(personaId);
    
    // Switch to assistant if deleting active persona
    if (activePersona === personaId) {
      setActivePersona('assistant');
    }
  };

  const value = {
    personas,
    activePersona,
    setActivePersona,
    activePersonaData: personas[activePersona],
    saveCustomPersona,
    deleteCustomPersona,
    isCustomPersona: (id) => !defaultPersonas[id]
  };

  return (
    <PersonaContext.Provider value={value}>
      {children}
    </PersonaContext.Provider>
  );
};