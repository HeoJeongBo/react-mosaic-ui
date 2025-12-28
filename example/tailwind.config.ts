import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  prefix: 'rm-',
  theme: {
    extend: {},
  },
};

export default config;
