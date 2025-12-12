import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    backgrounds: {
      notFound?: string;
    }
  }

  interface PaletteOptions {
    backgrounds?: {
      notFound?: string;
    };
  }
}
