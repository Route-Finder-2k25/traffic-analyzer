import React from 'react';

const WeatherCard = ({ weatherInfo }) => {
  if (!weatherInfo) return null;

  return (
    <div className="mt-6 overflow-hidden rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-indigo-100 shadow">
      <div className="p-5 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg text-indigo-800 mb-1">Weather at Destination</h3>
          <div className="text-sm text-indigo-700/80 flex items-center gap-2">
            <span className="text-xl font-semibold text-indigo-900">{weatherInfo.temp}°C</span>
            <span className="truncate">{weatherInfo.condition}</span>
          </div>
        </div>
        <img
          src={`http://openweathermap.org/img/wn/${weatherInfo.icon}@2x.png`}
          alt={weatherInfo.condition}
          className="h-12 w-12 drop-shadow-sm"
        />
      </div>
    </div>
  );
};

export default WeatherCard;