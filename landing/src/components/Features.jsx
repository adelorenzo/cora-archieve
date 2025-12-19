import { motion } from 'framer-motion';
import {
  Shield,
  Zap,
  Brain,
  FileText,
  Palette,
  MessageSquare,
  Cpu,
  Cloud,
} from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'All processing happens locally in your browser. Your data never leaves your device.',
    gradient: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
  },
  {
    icon: Zap,
    title: 'WebGPU Powered',
    description: 'Leverages your GPU for lightning-fast AI inference with native browser performance.',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
  },
  {
    icon: Brain,
    title: 'Advanced Models',
    description: 'Choose from multiple LLM models including Llama, Qwen, and more via WebLLM.',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
  },
  {
    icon: FileText,
    title: 'RAG Support',
    description: 'Upload documents and ask questions with semantic search and context injection.',
    gradient: 'linear-gradient(135deg, #F97316 0%, #F59E0B 100%)',
  },
  {
    icon: Palette,
    title: 'Beautiful Themes',
    description: '8 stunning themes from light to dark, ocean to forest. Make it yours.',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)',
  },
  {
    icon: MessageSquare,
    title: 'AI Personas',
    description: 'Switch between personas: Coder, Teacher, Creative Writer, Analyst, and more.',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
  },
  {
    icon: Cpu,
    title: 'WASM Fallback',
    description: 'No WebGPU? No problem. Automatic fallback to WebAssembly ensures compatibility.',
    gradient: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
  },
  {
    icon: Cloud,
    title: 'Works Offline',
    description: 'Once loaded, Cora AI works completely offline. True PWA experience.',
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%)',
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-grid" style={{ opacity: 0.5 }} />
      <div
        className="absolute top-0 left-1/2 w-full max-w-4xl h-px section-divider"
        style={{ transform: 'translateX(-50%)' }}
      />

      <div style={{ position: 'relative', zIndex: 10, maxWidth: '80rem', margin: '0 auto', padding: '0 1.5rem' }}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={{ textAlign: 'center', marginBottom: '5rem' }}
        >
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold" style={{ marginBottom: '1.5rem' }}>
            <span className="text-gradient-brand">Powerful</span>
            <span style={{ color: 'white' }}> Features</span>
          </h2>
          <p className="text-lg" style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '42rem', margin: '0 auto' }}>
            Everything you need for a complete AI assistant experience,
            all running locally in your browser.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="features-grid">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="feature-card group"
            >
              {/* Icon */}
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-xl"
                style={{ background: feature.gradient, marginBottom: '1rem' }}
              >
                <feature.icon className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <h3 className="font-display text-xl font-semibold text-white" style={{ marginBottom: '0.5rem' }}>
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
