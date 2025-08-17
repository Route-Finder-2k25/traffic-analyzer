import React from 'react';

const WeatherCard = ({ weatherInfo }) => {
  if (!weatherInfo) return null;

  return (
    <div className="mt-6 bg-white p-4 rounded-lg shadow text-center">
      <h3 className="font-semibold text-lg mb-2">Weather at Destination</h3>
      <p className="text-gray-600">
        <img
          src={`http://openweathermap.org/img/wn/${weatherInfo.icon}@2x.png`}
          alt={weatherInfo.condition}
          className="inline-block w-10 h-10"
        />
        {weatherInfo.temp}°C - {weatherInfo.condition}
      </p>
    </div>
  );
};

export default WeatherCard;