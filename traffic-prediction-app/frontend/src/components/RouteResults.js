import React from 'react';

const RouteResults = ({
  directions,
  routeLabels,
  trafficInfo,
  weatherInfo,
  isTracking,
  selectedRoute,
  locationPermission,
  onStartNavigation,
  onStopNavigation,
  onRequestLocationPermission
}) => {
  const getTrafficColor = (level) => {
    switch (level) {
      case 'Low': return 'text-green-600';
      case 'Moderate': return 'text-yellow-600';
      case 'Heavy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!directions.length) return null;

  return (
    <div className="mt-6 space-y-4">
      {directions.map((route, index) => (
        <div key={index} 
          className={`bg-white p-4 rounded-lg shadow border-l-4 ${
            index === 0 
              ? 'border-indigo-600' 
              : index === 1 
                ? 'border-green-600' 
                : 'border-red-600'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg mb-2 flex items-center">
                <span className={`w-3 h-3 rounded-full mr-2 ${
                  index === 0 
                    ? 'bg-indigo-600' 
                    : index === 1 
                      ? 'bg-green-600' 
                      : 'bg-red-600'
                }`}></span>
                Route {index + 1}
                {index === 0 && ' (Recommended)'}
              </h3>
              <p>Distance: {route.legs[0].distance.text}</p>
              <p>Duration: {route.legs[0].duration.text}</p>
              
              {trafficInfo[index] && (
                <div className="mt-2">
                  <p className={`font-medium ${getTrafficColor(trafficInfo[index].trafficLevel)}`}>
                    Traffic: {trafficInfo[index].trafficLevel}
                    {trafficInfo[index].delayMinutes > 0 && 
                      ` (+${trafficInfo[index].delayMinutes} min delay)`
                    }
                  </p>
                </div>
              )}
              
              {routeLabels[index]?.viaPoints && (
                <p className="text-sm text-gray-600 mt-2">
                  Via: {routeLabels[index].viaPoints}
                </p>
              )}
            </div>
            
            {weatherInfo && (
              <div className="text-right">
                <img 
                  src={`http://openweathermap.org/img/w/${weatherInfo.icon}.png`}
                  alt="Weather icon"
                  className="inline-block"
                />
                <p className="text-sm font-medium">{weatherInfo.temp}°C</p>
                <p className="text-sm text-gray-600">{weatherInfo.condition}</p>
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            {!isTracking ? (
              <button
                onClick={() => {
                  if (locationPermission === 'prompt') {
                    onRequestLocationPermission().then(hasPermission => {
                      if (hasPermission) {
                        onStartNavigation(index);
                      }
                    });
                  } else {
                    onStartNavigation(index);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Start Navigation
              </button>
            ) : selectedRoute === route && (
              <button
                onClick={onStopNavigation}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Stop Navigation
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RouteResults;