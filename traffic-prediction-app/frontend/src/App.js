import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TrafficChart from './components/TrafficChart';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TrafficChart />} />
      </Routes>
    </Router>
  );
}

export default App;