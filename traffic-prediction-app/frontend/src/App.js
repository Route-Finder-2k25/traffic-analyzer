import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TrafficChart from './components/TrafficChart';
import Home from './components/home';
import BestRoute from './components/BestRoute';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/analyzer" element={<TrafficChart />} />
        <Route path="/bestPath" element={<BestRoute />} />
      </Routes>
    </Router>
  );
}

export default App;