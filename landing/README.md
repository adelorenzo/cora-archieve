# Cora AI Landing Page

A modern, responsive landing page for [Cora AI](https://cora-app.oe74.net) - a privacy-first, browser-based AI assistant powered by WebGPU.

## Features

- Modern dark theme with gradient accents
- Fully responsive design (mobile to 4K)
- Smooth animations with Framer Motion
- Custom typography (Syne + Space Grotesk + JetBrains Mono)
- Feature showcase with 8 highlighted capabilities
- Call-to-action section with stats
- Links to live app and GitHub repository

## Tech Stack

- **React** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS v4** - Utility-first CSS
- **Framer Motion** - Animations
- **Lucide React** - Icons

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
landing/
├── public/
│   ├── cora.png          # App logo
│   └── favicon.svg       # Favicon
├── src/
│   ├── components/
│   │   ├── Hero.jsx      # Hero section with logo and CTA
│   │   ├── Features.jsx  # Feature grid (8 features)
│   │   ├── CTA.jsx       # Call-to-action with stats
│   │   └── Footer.jsx    # Footer with links
│   ├── App.jsx           # Main app component
│   ├── index.css         # Global styles and Tailwind
│   └── main.jsx          # Entry point
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## Customization

### Colors

Edit the CSS custom properties in `src/index.css`:

```css
:root {
  --color-brand: #8B5CF6;
  --color-brand-light: #A78BFA;
  --color-cyan: #06B6D4;
  --color-surface: #0A0A0F;
}
```

### Fonts

The landing page uses three font families:
- **Syne** - Display headings
- **Space Grotesk** - Body text
- **JetBrains Mono** - Code/technical text

## License

MIT License - see [LICENSE](../LICENSE) for details.

## Links

- [Live App](https://cora-app.oe74.net)
- [Main Repository](https://github.com/adelorenzo/cora-ai)
