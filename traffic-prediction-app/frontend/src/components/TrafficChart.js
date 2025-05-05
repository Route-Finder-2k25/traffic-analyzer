import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import * as tt from '@tomtom-international/web-sdk-services';
import * as ttmaps from '@tomtom-international/web-sdk-maps';
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

// Add this array at the top of your file, after the imports
const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal'
];

function TrafficChart() {
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedDestination, setSelectedDestination] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const mapElement = useRef(null);

  useEffect(() => {
    let map = null;
    
    if (mapElement.current) {
      map = ttmaps.map({
        key: TOMTOM_API_KEY,
        container: mapElement.current,
        center: [77.5946, 12.9716], // Default center (Bangalore)
        zoom: 12
      });
    }

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);

  const getTrafficData = async (source, destination, state) => {
    try {
      setLoading(true);
      setError("");
      setProgress(0);
      setChartData([]);

      const sourceWithState = `${source}, ${state}, India`;
      const destWithState = `${destination}, ${state}, India`;

      const sourceRes = await tt.services.fuzzySearch({
        key: TOMTOM_API_KEY,
        query: sourceWithState
      });
      const destRes = await tt.services.fuzzySearch({
        key: TOMTOM_API_KEY,
        query: destWithState
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

      setChartData(initialHourlyData);

      // Process each hour
      const currentDate = new Date();
      for (let i = 0; i < 24; i++) {
        try {
          const departAt = new Date(currentDate);
          departAt.setHours(i, 0, 0, 0);
          const formattedDate = departAt.toISOString();

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
          
          const weatherHour = weatherRes.data.list.find(item => 
            new Date(item.dt * 1000).getHours() === i
          );

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

          setProgress(Math.round(((i + 1) / 24) * 100));

          if (i < 23) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (err) {
          console.error(`Error fetching data for hour ${i}:`, err);
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

  const handleSubmit = async (e) => { // Update handleSubmit to include state
    e.preventDefault();
    if (!selectedSource || !selectedDestination || !selectedState) {
      setError("Please select state and enter both source and destination locations");
      return;
    }
    await getTrafficData(selectedSource, selectedDestination, selectedState);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50">
      <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
        Traffic Analysis Dashboard
      </h2>
      
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 mb-8 justify-center items-center">
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="w-64 p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Select State</option>
          {INDIAN_STATES.map(state => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>

        <input
          type="text"
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
          placeholder="Enter source location"
          className="w-64 p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />

        <input
          type="text"
          value={selectedDestination}
          onChange={(e) => setSelectedDestination(e.target.value)}
          placeholder="Enter destination"
          className="w-64 p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />

        <button 
          type="submit"
          disabled={loading || !selectedState}
          className={`px-6 py-2 text-white rounded-md transition-colors duration-200 ${
            loading || !selectedState
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
        <div className="w-full flex justify-center mb-6">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-6xl">
            <h3 className="text-xl font-semibold text-gray-700 mb-4 text-center">
              Hourly Travel Time Analysis
            </h3>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart 
                data={chartData}
                margin={{ top: 20, right: 0, left:0, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour"
                  tickFormatter={formatXAxis}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  minTickGap={25}
                  label={{ 
                    value: 'Time of Day', 
                    position: 'insideBottom',
                    offset:20,
                    className: 'text-sm'
                  }}
                />
                <YAxis 
                  label={{ 
                    value: 'Travel Time (minutes)', 
                    angle: -90, 
                    position: 'insideLeft',
                    offset: -10,
                    className: 'text-sm'
                  }}
                />
                <Tooltip content={CustomTooltip} />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                />
                <Bar 
                  dataKey="travel_time" 
                  name="Travel Time"
                  fill="#6366f1"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
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