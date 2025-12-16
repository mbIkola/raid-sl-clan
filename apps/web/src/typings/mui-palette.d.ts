import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    backgrounds: {
      notFound?: string;
      landing?: string;
    },
  }

  interface PaletteOptions {
    backgrounds?: {
      notFound?: string;
      landing?: string;
    };
  }

  interface Theme {
    customShadows: {
      text: {
        subtle: string;
        medium: string;
        strong: string;
      };
    };
  }
  interface ThemeOptions {
    customShadows?: {
      text?: {
        subtle?: string;
        medium?: string;
        strong?: string;
      };
    };
  }
}
