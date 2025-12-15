import React from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { defaultTheme } from './themes/default-theme';
import { I18nextProvider } from 'react-i18next';
import { i18nInstance } from './i18n/i18n';
import { Router } from './core/Router';

export const App: React.FC = () => {
  return (
    <React.StrictMode>
      <I18nextProvider i18n={i18nInstance}>
        <ThemeProvider theme={defaultTheme}>
          <CssBaseline />
          <Router />
        </ThemeProvider>
      </I18nextProvider>
    </React.StrictMode>
  );
};

