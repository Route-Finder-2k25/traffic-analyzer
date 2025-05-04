import React, { useState } from "react";
import axios from "axios";
import * as tt from '@tomtom-international/web-sdk-services';
import { TOMTOM_API_KEY, WEATHER_API_KEY } from '../config';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

// Add this formatter function at the top of your component
const formatXAxis = (hour) => {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}${ampm}`;
};

function TrafficChart() {
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedDestination, setSelectedDestination] = useState("");
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0); // Add progress state
  const getTrafficData = async (source, destination) => {
    try {
      setLoading(true);
      setError("");
      setProgress(0);
      setChartData([]); // Clear existing data

      // Convert locations to coordinates using TomTom Search API
      const sourceRes = await tt.services.fuzzySearch({
        key: TOMTOM_API_KEY,
        query: source
      });
      const destRes = await tt.services.fuzzySearch({
        key: TOMTOM_API_KEY,
        query: destination
      });

      if (!sourceRes.results.length || !destRes.results.length) {
        throw new Error("Could not find coordinates for the specified locations");
      }

      const sourceLoc = sourceRes.results[0].position;
      const destLoc = destRes.results[0].position;

      // Get weather data
      const weatherRes = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${destLoc.lat}&lon=${destLoc.lng}&appid=${WEATHER_API_KEY}&units=metric`
      );

      // Initialize hourly data array with placeholders
      const initialHourlyData = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        travel_time: 0,
        traffic_delay: 0,
        traffic_length: 0,
        total_distance: 0,
        departure_time: 'Fetching...',
        arrival_time: 'Fetching...',
        weather: 'Fetching...',
        temperature: 'N/A',
        traffic_level: 'Fetching...'
      }));
      // Set initial state
      setChartData(initialHourlyData);
      console.log("Initial chart data set:", initialHourlyData);
      // Process each hour with increased delay
      const currentDate = new Date();
      for (let i = 0; i < 24; i++) {
        try {
          // Format date for TomTom API
          const departAt = new Date(currentDate);
          departAt.setHours(i, 0, 0, 0);
          const formattedDate = departAt.toISOString();
          // Make API request for this hour
          const routeRes = await axios.get(
            `https://api.tomtom.com/routing/1/calculateRoute/${sourceLoc.lat},${sourceLoc.lng}:${destLoc.lat},${destLoc.lng}/json`,
            {
              params: {
                key: TOMTOM_API_KEY,
                traffic: true,
                departAt: formattedDate
              }
            }
          );

          const route = routeRes.data.routes[0];
          const summary = route.summary;
          // console.log(`Route summary for hour ${i}:`, summary);
          // console.log(route)
          
          const weatherHour = weatherRes.data.list.find(item => 
            new Date(item.dt * 1000).getHours() === i
          );
          console.log('trafic length', summary.trafficLengthInMeters);
          // Update chart data for this hour
          setChartData(prevData => {
            const newData = [...prevData];
            newData[i] = {
              hour: i,
              travel_time: Math.round(summary.travelTimeInSeconds / 60),
              traffic_delay: Math.round(summary.trafficDelayInSeconds / 60),
              traffic_length: summary.trafficLengthInMeters,
              total_distance: summary.lengthInMeters,
              departure_time: new Date(summary.departureTime).toLocaleTimeString(),
              arrival_time: new Date(summary.arrivalTime).toLocaleTimeString(),
              weather: weatherHour ? weatherHour.weather[0].main : 'N/A',
              temperature: weatherHour ? Math.round(weatherHour.main.temp) : 'N/A',
              traffic_level: getTrafficLevel(summary.trafficDelayInSeconds)
            };
            return newData;
          });

          // Update progress
          setProgress(Math.round(((i + 1) / 24) * 100));

          // Add increased delay between requests
          if (i < 23) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          }
        } catch (err) {
          console.error(`Error fetching data for hour ${i}:`, err);
          // Leave the placeholder data for failed requests
        }
      }
    } catch (error) {
      setError(error.message);
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  const getTrafficLevel = (delay) => {
    if (delay < 300) return 'Low';
    if (delay < 600) return 'Medium';
    return 'High';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSource || !selectedDestination) {
      setError("Please enter both source and destination locations");
      return;
    }
    await getTrafficData(selectedSource, selectedDestination);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50">
      <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
        Traffic Analysis Dashboard
      </h2>
      
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 mb-8 justify-center items-center">
        <input
          type="text"
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
          placeholder="Enter source location (e.g., London)"
          className="w-64 p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />

        <input
          type="text"
          value={selectedDestination}
          onChange={(e) => setSelectedDestination(e.target.value)}
          placeholder="Enter destination (e.g., Manchester)"
          className="w-64 p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />

        <button 
          type="submit"
          disabled={loading}
          className={`px-6 py-2 text-white rounded-md transition-colors duration-200 ${
            loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
          }`}
        >
          {loading ? 'Analyzing...' : 'Analyze Traffic'}
        </button>
      </form>

      {loading && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-center text-sm text-gray-600 mt-2">
            Loading data: {progress}%
          </p>
        </div>
      )}

      {error && (
        <div className="text-red-600 text-center mb-4">
          {error}
        </div>
      )}

      {chartData.length > 0 && !error && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">
            Hourly Travel Time Analysis
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="hour"
                tickFormatter={formatXAxis}
                label={{ value: 'Time of Day', position: 'bottom', className: 'text-sm' }}
              />
              <YAxis 
                label={{ 
                  value: 'Travel Time (minutes)', 
                  angle: -90, 
                  position: 'insideLeft',
                  className: 'text-sm'
                }}
              />
              <Tooltip content={CustomTooltip} />
              <Legend />
              <Bar 
                dataKey="travel_time" 
                fill="#6366f1" 
                name="Travel Time"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const formattedHour = formatXAxis(data.hour);
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <p className="font-bold text-gray-800">Time: {formattedHour}</p>
      
        {data.travel_time > 0 ? (
          <>
            <p className="text-indigo-600">Travel Time: {data.travel_time} mins</p>
            <p className="text-gray-600">Traffic Delay: {data.traffic_delay} mins</p>
            <p className="text-gray-600">Traffic Length: {(data.traffic_length/1000).toFixed(3)} km</p>
            <p className="text-gray-600">Total Distance: {(data.total_distance / 1000).toFixed(2)} km</p>
            <p className="text-gray-600">Departure: {data.departure_time}</p>
            <p className="text-gray-600">Arrival: {data.arrival_time}</p>
            <p className="text-gray-600">Traffic Level: {data.traffic_level}</p>
          </>
        ) : (
          <p className="text-gray-600">No route data for this hour</p>
        )}
        <p className="text-gray-600">Weather: {data.weather}</p>
        <p className="text-gray-600">Temperature: {data.temperature}°C</p>
      </div>
    );
  }
  return null;
};

export default TrafficChart;