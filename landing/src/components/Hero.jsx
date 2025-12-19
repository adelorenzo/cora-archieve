import { motion } from 'framer-motion';
import { Sparkles, Zap, Brain } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute inset-0 bg-noise pointer-events-none" />

      {/* Gradient Orbs */}
      <motion.div
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.25) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, -40, 0],
          y: [0, -20, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Floating Particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            left: `${20 + i * 15}%`,
            top: `${30 + (i % 3) * 20}%`,
            opacity: 0.4,
            backgroundColor: '#A78BFA',
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.3,
          }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* App Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          style={{ marginBottom: '3rem' }}
        >
          <img
            src="/cora.png"
            alt="Cora AI Logo"
            style={{
              width: '120px',
              height: '120px',
              margin: '0 auto',
              borderRadius: '1.5rem',
              boxShadow: '0 0 60px rgba(139, 92, 246, 0.4)',
            }}
          />
        </motion.div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="badge"
          style={{ marginBottom: '3rem' }}
        >
          <Sparkles className="w-4 h-4" style={{ color: '#A78BFA' }} />
          <span className="font-mono text-sm" style={{ color: '#A78BFA' }}>WebGPU-Powered AI</span>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight"
          style={{ marginBottom: '2rem' }}
        >
          <span className="text-gradient">Cora</span>
          <span style={{ color: 'rgba(255,255,255,0.9)' }}> AI</span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-xl sm:text-2xl md:text-3xl font-light max-w-3xl mx-auto"
          style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem' }}
        >
          Your Personal AI Assistant
        </motion.p>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-base sm:text-lg max-w-2xl mx-auto"
          style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '4rem' }}
        >
          Runs entirely in your browser. No servers. No data collection.
          <br className="hidden sm:block" />
          Powered by WebGPU for blazing-fast inference.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center"
          style={{ gap: '1.25rem', marginBottom: '5rem' }}
        >
          <a
            href="https://cora-app.oe74.net"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            <Zap className="w-5 h-5" />
            Launch Cora AI
          </a>

          <a
            href="#features"
            className="btn-secondary"
          >
            Learn More
          </a>
        </motion.div>

        {/* Tech Stack Pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          {[
            { icon: Brain, label: 'WebLLM' },
            { icon: Zap, label: 'WebGPU' },
            { icon: Sparkles, label: 'WASM Fallback' },
          ].map((tech, i) => (
            <motion.div
              key={tech.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 + i * 0.1 }}
              className="tech-pill"
            >
              <tech.icon className="w-4 h-4" style={{ color: '#A78BFA' }} />
              <span className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{tech.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 rounded-full flex items-start justify-center p-2"
          style={{ border: '2px solid rgba(255,255,255,0.2)' }}
        >
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5], y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: '#A78BFA' }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
