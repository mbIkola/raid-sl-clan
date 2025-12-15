import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NotFoundPage } from '../pages/notfound/notfound';
import { LandingPage } from '../pages/landing/landing';
import { About } from '../pages/about/about';
import { Dashboard } from '../pages/dashboard/dashboard';

export const Router: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};
