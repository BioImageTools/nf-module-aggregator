import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://bioimagetools.github.io',
  base: '/nf-module-aggregator/',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ['rokickik-dev.int.janelia.org'],
    },
  },
});
