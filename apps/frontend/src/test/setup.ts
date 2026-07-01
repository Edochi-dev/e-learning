// Registra los matchers de jest-dom (toBeInTheDocument, toHaveTextContent, etc.)
// extendiendo el `expect` de Vitest. Se ejecuta una vez antes de cada archivo
// de test (configurado en vite.config.ts → test.setupFiles).
import '@testing-library/jest-dom/vitest';
