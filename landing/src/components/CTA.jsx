import { motion } from 'framer-motion';
import { Rocket, Github, ExternalLink } from 'lucide-react';

export function CTA() {
  return (
    <section className="relative overflow-hidden" style={{ paddingTop: '10rem', paddingBottom: '8rem' }}>
      {/* Background Effects */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/2 left-1/2 w-[800px] h-[800px] rounded-full"
          style={{
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 60%)',
            filter: 'blur(80px)',
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.7, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <div style={{ position: 'relative', zIndex: 10, maxWidth: '56rem', margin: '0 auto', padding: '0 1.5rem', textAlign: 'center' }}>
        {/* CTA Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold" style={{ marginBottom: '1.5rem' }}>
            Ready to Try{' '}
            <span className="text-gradient">Cora AI</span>?
          </h2>
          <p className="text-lg" style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '42rem', margin: '0 auto 3rem auto' }}>
            Experience the future of browser-based AI. No installation required.
            Just click and start chatting.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.a
              href="https://cora-app.oe74.net"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary text-xl"
              style={{ padding: '1.25rem 2.5rem' }}
            >
              <Rocket className="w-6 h-6" />
              Launch Cora AI
              <ExternalLink className="w-5 h-5" style={{ opacity: 0.7 }} />
            </motion.a>

            <motion.a
              href="https://github.com/adelorenzo/cora-ai"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-secondary"
              style={{ padding: '1.25rem 2rem' }}
            >
              <Github className="w-5 h-5" />
              View on GitHub
            </motion.a>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="stats-grid"
          style={{ marginTop: '5rem' }}
        >
          {[
            { value: '100%', label: 'Private' },
            { value: '<1s', label: 'Response Time' },
            { value: '8+', label: 'Themes' },
            { value: '0', label: 'Data Sent' },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div className="stat-value text-gradient-brand">
                {stat.value}
              </div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
