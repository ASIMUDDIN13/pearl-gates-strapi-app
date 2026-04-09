import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { LandingList } from './LandingList';
import { Builder } from './Builder';

export const App = () => (
  <Routes>
    <Route index element={<LandingList />} />
    <Route path="new" element={<Builder />} />
    <Route path=":documentId" element={<Builder />} />
  </Routes>
);
