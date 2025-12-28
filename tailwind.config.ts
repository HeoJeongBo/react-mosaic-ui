import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', './demo/**/*.{ts,tsx}', './example/**/*.{ts,tsx}'],
  prefix: 'rm-',
  important: false,
  theme: {
    extend: {
      colors: {
        mosaic: {
          border: 'var(--rm-border-color, #cbd5e1)',
          background: 'var(--rm-background, #ffffff)',
          window: 'var(--rm-window-bg, #f8fafc)',
          toolbar: 'var(--rm-toolbar-bg, #f1f5f9)',
          split: 'var(--rm-split-color, #94a3b8)',
          'split-hover': 'var(--rm-split-hover, #64748b)',
        },
      },
      zIndex: {
        mosaic: '1000',
        'mosaic-window': '1010',
        'mosaic-drag': '1020',
      },
      spacing: {
        'mosaic-split': 'var(--rm-split-size, 4px)',
        'mosaic-toolbar': 'var(--rm-toolbar-height, 40px)',
      },
    },
  },
};

export default config;
