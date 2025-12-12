import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter, Routes, Route, Link} from 'react-router-dom';
import {PrimaryButton} from '@raid/ui';
import {CssBaseline, ThemeProvider, createTheme} from '@mui/material';
import {defaultTheme} from "./themes/default-theme";
import {NotFoundPage} from "./pages/notfound/notfound";
import {I18nextProvider} from "react-i18next";
import {i18nInstance} from "./i18n/i18n";


function Home() {
  return (
    <div>
      <h1>Web SPA</h1>
      <PrimaryButton onClick={() => alert('Click!')}>Click me</PrimaryButton>
      <nav>
        <Link to="/about">About</Link>
      </nav>
    </div>
  );
}

function About() {
  return <h2>About page</h2>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18nInstance}>
      <ThemeProvider theme={defaultTheme}>
        <CssBaseline/>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home/>}/>
            <Route path="/about" element={<About/>}/>
            <Route path="*" element={<NotFoundPage/>}/>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </I18nextProvider>
  </React.StrictMode>
);

