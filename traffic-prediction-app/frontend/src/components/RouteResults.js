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
  onRequestLocationPermission,
  transitData,
  onFetchTransit,
  loadingTransit,
  transitError
}) => {
  const getTrafficColor = (level) => {
    switch (level) {
      case 'Low': return 'text-green-600';
      case 'Moderate': return 'text-yellow-600';
      case 'Heavy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const transitRoute = transitData?.routes?.[0];
  const transitLeg = transitRoute?.legs?.[0];
  const transitSteps = transitLeg?.steps || [];

  if (!directions.length && !transitRoute) return null;

  return (
    <div className="mt-6 space-y-4">
      {/* Transit Summary */}
      {/* The transit trigger moved to the RouteForm */}

      {transitError && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3">{transitError}</div>
      )}

      {transitRoute && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-blue-800">Public Transit (Bus/Train)</h3>
            <div className="text-sm text-blue-800">
              <span className="mr-4">📏 {transitLeg?.distance?.text}</span>
              <span className="mr-4">⏱️ {transitLeg?.duration?.text}</span>
              {transitLeg?.departure_time?.text && (
                <span className="mr-2">🕘 {transitLeg.departure_time.text}</span>
              )}
              {transitLeg?.arrival_time?.text && (
                <span>🏁 {transitLeg.arrival_time.text}</span>
              )}
            </div>
          </div>
          {/* Transit Steps */}
          <div className="mt-3 space-y-2">
            {transitSteps.map((step, i) => {
              const isTransit = step.travel_mode === 'TRANSIT';
              const td = step.transit_details;
              return (
                <div key={i} className={`p-3 rounded-lg border ${isTransit ? 'border-blue-300 bg-white' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-gray-800">
                      {isTransit ? (
                        <>
                          <span className="font-medium">
                            {td?.line?.short_name || td?.line?.name || 'Transit'}
                          </span>
                          <span className="ml-2 text-gray-600">
                            ({td?.vehicle?.type || 'Transit'})
                          </span>
                          <span className="ml-2">→ {td?.arrival_stop?.name || ''}</span>
                        </>
                      ) : (
                        <span>{step.html_instructions?.replace(/<[^>]*>?/gm, '')}</span>
                      )}
                    </div>
                    <div className="text-gray-600">
                      {isTransit && (
                        <span>
                          {td?.departure_time?.text ? `Dep ${td.departure_time.text}` : ''}
                          {td?.arrival_time?.text ? ` · Arr ${td.arrival_time.text}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  {isTransit && (
                    <div className="mt-1 text-xs text-gray-600">
                      From {td?.departure_stop?.name || '—'} to {td?.arrival_stop?.name || '—'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {directions.map((route, index) => (
        <div
          key={index}
          className={`relative overflow-hidden rounded-xl border bg-white/90 backdrop-blur shadow-md transition hover:shadow-lg ${
            index === 0
              ? 'border-indigo-200'
              : index === 1
              ? 'border-emerald-200'
              : 'border-rose-200'
          }`}
        >
          <div className={`absolute inset-x-0 top-0 h-1 ${
            index === 0 ? 'bg-indigo-500' : index === 1 ? 'bg-emerald-500' : 'bg-rose-500'
          }`} />

          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`h-2.5 w-2.5 rounded-full ${
                    index === 0 ? 'bg-indigo-600' : index === 1 ? 'bg-emerald-600' : 'bg-rose-600'
                  }`} />
                  <h3 className="font-semibold text-lg truncate">
                    Route {index + 1}
                    {index === 0 && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Recommended
                      </span>
                    )}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-700">
                  <span className="flex items-center gap-1">
                    <span>📏</span> {route.legs[0].distance.text}
                  </span>
                  <span className="flex items-center gap-1">
                    <span>⏱️</span> {route.legs[0].duration.text}
                  </span>
                  {trafficInfo[index] && (
                    <span className={`flex items-center gap-1 font-medium ${getTrafficColor(trafficInfo[index].trafficLevel)}`}>
                      <span>🚦</span> {trafficInfo[index].trafficLevel}
                      {trafficInfo[index].delayMinutes > 0 && ` (+${trafficInfo[index].delayMinutes}m)`}
                    </span>
                  )}
                </div>

                {routeLabels[index]?.viaPoints && (
                  <p className="mt-2 text-xs text-gray-500 line-clamp-1">Via: {routeLabels[index].viaPoints}</p>
                )}
              </div>

              {weatherInfo && (
                <div className="text-right shrink-0">
                  <img
                    src={`http://openweathermap.org/img/w/${weatherInfo.icon}.png`}
                    alt="Weather icon"
                    className="inline-block h-8 w-8"
                  />
                  <div className="text-sm font-medium">{weatherInfo.temp}°C</div>
                  <div className="text-xs text-gray-600">{weatherInfo.condition}</div>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
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
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    index === 0 ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500' :
                    index === 1 ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500' :
                                  'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
                  }`}
                >
                  <span>▶</span>
                  <span>Start Navigation</span>
                </button>
              ) : selectedRoute === route && (
                <button
                  onClick={onStopNavigation}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                >
                  <span>■</span>
                  <span>Stop</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RouteResults;