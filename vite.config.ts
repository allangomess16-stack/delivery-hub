import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  build: {
    target: "es2022",
    // Source map completo fica apenas no servidor local de desenvolvimento.
    // APK e Hosting operacionais nao publicam o mapa do codigo-fonte.
    sourcemap: mode === "localserver",
  },
}));
