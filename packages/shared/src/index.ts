export type User = {
  id: string;
  username: string;
};

// Detect production mode in both Node and Vite/browser environments without Node typings
export const isProd = (): boolean => {
  const g = globalThis as any;
  // Prefer Node's process.env if present
  const nodeEnv = g?.process?.env?.NODE_ENV as string | undefined;
  if (typeof nodeEnv === 'string') {
    return nodeEnv === 'production';
  }
  // Fallback to Vite-style import.meta.env
  const viteEnv = (import.meta as any)?.env as { MODE?: string; PROD?: boolean } | undefined;
  if (viteEnv) {
    return viteEnv.MODE === 'production' || !!viteEnv.PROD;
  }
  return false;
};
