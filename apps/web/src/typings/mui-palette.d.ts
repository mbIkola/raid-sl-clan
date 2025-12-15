import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    backgrounds: {
      notFound?: string;
      landing?: string;
    }
  }

  interface PaletteOptions {
    backgrounds?: {
      notFound?: string;
      landing?: string;
    };
  }
}
