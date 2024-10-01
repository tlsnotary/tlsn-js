import React, { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

import './app.css';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';

import { Notarization } from './components/notarize';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(<App />);

function App(): ReactElement {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<Notarization />} />
          <Route path="/verify" element={<></>} />
        </Routes>
      </div>
    </Router>
  );
}
