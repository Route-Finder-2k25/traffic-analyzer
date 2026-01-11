import React from 'react';

const TransitCards = ({ 
  directions, 
  selectedSource, 
  selectedDestination,
  onStartNavigation,
  onStopNavigation,
  isTracking,
  selectedRoute,
  locationPermission,
  onRequestLocationPermission
}) => {
  // Filter and extract transit details from routes
  const getTransitDetails = (route) => {
    if (!route.legs || !route.legs[0] || !route.legs[0].steps) {
      return [];
    }

    const transitSteps = route.legs[0].steps.filter(step => 
      step.travel_mode === 'TRANSIT' && step.transit_details
    );

    return transitSteps.map(step => {
      const transitDetails = step.transit_details;
      const line = transitDetails.line;
      
      return {
        type: line.vehicle?.type || 'UNKNOWN',
        name: line.name || line.short_name || 'Unknown Line',
        shortName: line.short_name || '',
        color: line.color || '#666666',
        textColor: line.text_color || '#FFFFFF',
        departureStop: transitDetails.departure_stop?.name || 'Unknown',
        arrivalStop: transitDetails.arrival_stop?.name || 'Unknown',
        departureTime: transitDetails.departure_time?.text || '',
        arrivalTime: transitDetails.arrival_time?.text || '',
        headsign: transitDetails.headsign || '',
        duration: step.duration?.text || '',
        distance: step.distance?.text || '',
        numStops: transitDetails.num_stops || 0,
        instructions: step.instructions || ''
      };
    });
  };

  // Filter routes to only show those with bus or train transit
  const getFilteredTransitRoutes = () => {
    if (!directions || directions.length === 0) return [];

    return directions.map((route, index) => {
      const transitDetails = getTransitDetails(route);
      
      // Only include routes that have bus or train transit
      const busTrainTransit = transitDetails.filter(detail => 
        detail.type === 'BUS' || 
        detail.type === 'SUBWAY' || 
        detail.type === 'RAIL' || 
        detail.type === 'TRAIN' ||
        detail.type === 'TRAM' ||
        detail.type === 'LIGHT_RAIL'
      );

      if (busTrainTransit.length > 0) {
        return {
          routeIndex: index,
          route,
          transitDetails: busTrainTransit,
          totalDuration: route.legs[0]?.duration?.text || '',
          totalDistance: route.legs[0]?.distance?.text || ''
        };
      }
      return null;
    }).filter(Boolean);
  };

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'BUS': return '🚌';
      case 'SUBWAY': return '🚇';
      case 'RAIL': 
      case 'TRAIN': return '🚆';
      case 'TRAM': return '🚊';
      case 'LIGHT_RAIL': return '🚈';
      default: return '🚌';
    }
  };

  const getVehicleTypeName = (type) => {
    switch (type) {
      case 'BUS': return 'Bus';
      case 'SUBWAY': return 'Subway';
      case 'RAIL': 
      case 'TRAIN': return 'Train';
      case 'TRAM': return 'Tram';
      case 'LIGHT_RAIL': return 'Light Rail';
      default: return 'Transit';
    }
  };

  const filteredRoutes = getFilteredTransitRoutes();

  if (filteredRoutes.length === 0) {
    return (
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center">
          <span className="text-yellow-600 text-xl mr-2">⚠️</span>
          <div>
            <h3 className="font-semibold text-yellow-800">No Bus or Train Routes Available</h3>
            <p className="text-yellow-700 text-sm mt-1">
              No public transit routes with buses or trains were found between {selectedSource} and {selectedDestination}.
              Try selecting a different travel mode or check if public transit is available in this area.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">🚌</span>
        Public Transit Routes (Buses & Trains)
      </h3>
      
      {filteredRoutes.map(({ routeIndex, route, transitDetails, totalDuration, totalDistance }) => (
        <div 
          key={routeIndex} 
          className="bg-white p-6 rounded-lg shadow-lg border border-gray-200"
        >
          {/* Route Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-semibold text-lg text-gray-800 mb-2">
                Route {routeIndex + 1}
                {routeIndex === 0 && ' (Recommended)'}
              </h4>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>📏 {totalDistance}</span>
                <span>⏱️ {totalDuration}</span>
                <span>🚏 {transitDetails.length} transit segment{transitDetails.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Transit Details */}
          <div className="space-y-3 mb-4">
            {transitDetails.map((detail, detailIndex) => (
              <div 
                key={detailIndex}
                className="bg-gray-50 p-4 rounded-lg border border-gray-200"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div 
                      className="w-12 h-8 rounded flex items-center justify-center text-white font-bold text-sm"
                      style={{ 
                        backgroundColor: detail.color,
                        color: detail.textColor 
                      }}
                    >
                      {detail.shortName || getVehicleIcon(detail.type)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">{getVehicleIcon(detail.type)}</span>
                      <span className="font-semibold text-gray-800">
                        {getVehicleTypeName(detail.type)}
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-700 font-medium">{detail.name}</span>
                    </div>
                    
                    {detail.headsign && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Direction:</span> {detail.headsign}
                      </p>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600">
                          <span className="font-medium">From:</span> {detail.departureStop}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-medium">Departure:</span> {detail.departureTime}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">
                          <span className="font-medium">To:</span> {detail.arrivalStop}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-medium">Arrival:</span> {detail.arrivalTime}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>⏱️ {detail.duration}</span>
                      <span>📏 {detail.distance}</span>
                      {detail.numStops > 0 && (
                        <span>🚏 {detail.numStops} stop{detail.numStops > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Button */}
          <div className="flex justify-end">
            {!isTracking ? (
              <button
                onClick={() => {
                  if (locationPermission === 'prompt') {
                    onRequestLocationPermission().then(hasPermission => {
                      if (hasPermission) {
                        onStartNavigation(routeIndex);
                      }
                    });
                  } else {
                    onStartNavigation(routeIndex);
                  }
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
              >
                Start Navigation
              </button>
            ) : selectedRoute === route && (
              <button
                onClick={onStopNavigation}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium"
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

export default TransitCards;