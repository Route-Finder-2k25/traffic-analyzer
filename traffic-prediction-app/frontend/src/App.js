import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import TrafficChart from "./components/TrafficChart";
import Home from "./components/home";
import BestRoute from "./components/BestRoute";
import TrafficPrediction from "./components/TrafficPrediction";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/analyzer" element={<TrafficChart />} />
        <Route path="/bestPath" element={<BestRoute />} />
        <Route path="/traffic-prediction" element={<TrafficPrediction />} />
      </Routes>
    </Router>
  );
}

export default App;
