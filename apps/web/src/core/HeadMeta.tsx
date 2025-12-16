import React from 'react';
import {Helmet, HelmetProvider} from 'react-helmet-async';
import {BRAND} from "./consts";


import favicon16 from '../assets/meta/favicon-16x16.png';
import favicon32 from '../assets/meta/favicon-32x32.png';
import appleTouchIcon from '../assets/meta/apple-touch-icon.png';
import siteWebmanifest from '../assets/meta/site.webmanifest';
import poster from '../assets/landing/poster0.jpeg';
import ruslanDisplayFont from '../assets/fonts/RuslanDisplay-Regular.ttf';

// Centralized head management. Use <HeadMeta /> inside App so all pages inherit base tags.
// Pages can add their own <Helmet> with <title> suffix via HeadTitle helper.

export const HeadProvider: React.FC<{ children: React.ReactNode }> = ({children}) => (
  <HelmetProvider>
    {children}
  </HelmetProvider>
);

export const HeadBase: React.FC = () => {
  return (
    <Helmet defaultTitle={BRAND} titleTemplate={`${BRAND}: %s`}>
      {/* Charset & viewport */}
      <meta charSet="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>

      {/* Favicons and touch icons */}
      <link rel="icon" type="image/png" sizes="32x32" href={favicon16}/>
      <link rel="icon" type="image/png" sizes="16x16" href={favicon32}/>
      <link rel="apple-touch-icon" sizes="180x180" href={appleTouchIcon}/>
      <link rel="manifest" href={siteWebmanifest}/>

      {/* OpenGraph/Twitter (optional baseline) */}
      <meta property="og:title" content={BRAND}/>
      <meta name="twitter:image" content={poster}/>
      <meta name="twitter:card" content="summary_large_image"/>
      <meta name="og:image" content={poster}/>

      {/* Gothic-like font with Cyrillic support: Ruslan Display (OFL) via jsDelivr */}
      <link
        href={ruslanDisplayFont}
        as="font"
        type="font/ttf"
        crossOrigin="anonymous"
        rel="preload"
      />
      <style>{`
        @font-face {
          font-family: 'Ruslan Display';
          src: url(${ruslanDisplayFont}) format('truetype');
          font-weight: 400;
          font-style: normal;
          font-display: swap;
          unicode-range: U+000-5FF, U+1E00-1EFF, U+0400-04FF; /* Latin & Cyrillic */
        }
      `}</style>
    </Helmet>
  );
};

export const HeadTitle: React.FC<{ title?: string }> = ({title}) => (
  <Helmet>{title ? <title>{title}</title> : null}</Helmet>
);

