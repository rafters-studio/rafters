import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Live Tailwind v4: the @tailwindcss/vite plugin compiles utilities on the fly
// against the rafters @theme imported in src/styles/global.css. No frozen sheet.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
