import React, { useState } from 'react';
import { Bus, Train, Clock, MapPin, ArrowRight, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

const TransitResultsCard = ({ transitData, loadingTransit, transitError, onFetchTransit }) => {
  const [expandedRoute, setExpandedRoute] = useState(0);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'buses', 'trains'

  if (loadingTransit) {
    return (
      <div className="mt-6 p-8 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading transit options...</span>
        </div>
      </div>
    );
  }

  if (transitError) {
    return (
      <div className="mt-6 p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-red-800">{transitError}</div>
        </div>
      </div>
    );
  }

  if (!transitData || !transitData.routes || transitData.routes.length === 0) {
    return (
      <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-blue-800 text-center">
          Click "Get Transit Options" to see available bus and train routes
        </div>
      </div>
    );
  }

  // Categorize transit steps
  const categorizeTransitSteps = (steps) => {
    const buses = [];
    const trains = [];
    const walking = [];

    steps.forEach(step => {
      if (step.travel_mode === 'TRANSIT' && step.transit_details) {
        const vehicleType = step.transit_details.line?.vehicle?.type || '';
        const lineName = step.transit_details.line?.name || step.transit_details.line?.short_name || '';
        
        // Categorize by vehicle type
        if (vehicleType.includes('BUS') || lineName.toLowerCase().includes('bus') || lineName.toLowerCase().includes('ksrtc')) {
          buses.push(step);
        } else if (vehicleType.includes('TRAIN') || vehicleType.includes('RAIL') || vehicleType.includes('SUBWAY') || vehicleType.includes('METRO')) {
          trains.push(step);
        } else {
          // Default to bus if unclear
          buses.push(step);
        }
      } else if (step.travel_mode === 'WALKING') {
        walking.push(step);
      }
    });

    return { buses, trains, walking };
  };

  // Get icon for vehicle type
  const getVehicleIcon = (vehicleType) => {
    if (!vehicleType) return <Bus className="w-5 h-5" />;
    
    const type = vehicleType.toUpperCase();
    if (type.includes('TRAIN') || type.includes('RAIL') || type.includes('SUBWAY') || type.includes('METRO')) {
      return <Train className="w-5 h-5" />;
    }
    return <Bus className="w-5 h-5" />;
  };

  // Get color for vehicle type
  const getVehicleColor = (vehicleType) => {
    if (!vehicleType) return 'bg-blue-500';
    
    const type = vehicleType.toUpperCase();
    if (type.includes('TRAIN') || type.includes('RAIL') || type.includes('SUBWAY') || type.includes('METRO')) {
      return 'bg-purple-600';
    }
    return 'bg-blue-500';
  };

  // Filter routes based on active tab
  const getFilteredSteps = (steps) => {
    const categorized = categorizeTransitSteps(steps);
    
    if (activeTab === 'buses') {
      return [...categorized.buses, ...categorized.walking];
    } else if (activeTab === 'trains') {
      return [...categorized.trains, ...categorized.walking];
    }
    return steps; // 'all' tab
  };

  return (
    <div className="mt-6 bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
        <h3 className="text-2xl font-bold text-white mb-2">Transit Options</h3>
        <p className="text-blue-100">Choose from buses, trains, and combined routes</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Bus className="w-4 h-4" />
              <Train className="w-4 h-4" />
              <span>All Routes</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('buses')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'buses'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Bus className="w-4 h-4" />
              <span>Buses Only</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('trains')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'trains'
                ? 'bg-white text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Train className="w-4 h-4" />
              <span>Trains Only</span>
            </div>
          </button>
        </div>
      </div>

      {/* Routes List */}
      <div className="p-6 space-y-4">
        {transitData.routes.map((route, routeIndex) => {
          const leg = route.legs?.[0];
          if (!leg) return null;

          const steps = leg.steps || [];
          const filteredSteps = getFilteredSteps(steps);
          const categorized = categorizeTransitSteps(steps);
          
          // Skip if filtered steps only has walking
          if (activeTab !== 'all' && filteredSteps.every(s => s.travel_mode === 'WALKING')) {
            return null;
          }

          const isExpanded = expandedRoute === routeIndex;

          return (
            <div key={routeIndex} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              {/* Route Header */}
              <div
                onClick={() => setExpandedRoute(isExpanded ? -1 : routeIndex)}
                className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold text-gray-800">
                        Route {routeIndex + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        {categorized.buses.length > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            <Bus className="w-3 h-3" />
                            {categorized.buses.length} Bus{categorized.buses.length !== 1 ? 'es' : ''}
                          </span>
                        )}
                        {categorized.trains.length > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                            <Train className="w-3 h-3" />
                            {categorized.trains.length} Train{categorized.trains.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {leg.duration?.text || 'N/A'}
                      </span>
                      <span>{leg.distance?.text || 'N/A'}</span>
                      {leg.departure_time && (
                        <span>Departs: {leg.departure_time.text}</span>
                      )}
                      {leg.arrival_time && (
                        <span>Arrives: {leg.arrival_time.text}</span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Route Details */}
              {isExpanded && (
                <div className="p-4 space-y-3 bg-white">
                  {filteredSteps.map((step, stepIndex) => {
                    const isWalking = step.travel_mode === 'WALKING';
                    const transit = step.transit_details;

                    if (isWalking) {
                      return (
                        <div key={stepIndex} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">🚶</span>
                          </div>
                          <div className="flex-1">
                            <div
                              className="text-sm text-gray-700"
                              dangerouslySetInnerHTML={{ __html: step.html_instructions }}
                            />
                          </div>
                        </div>
                      );
                    }

                    if (!transit) return null;

                    const vehicleType = transit.line?.vehicle?.type || '';
                    const lineName = transit.line?.name || transit.line?.short_name || 'Transit';
                    const lineShortName = transit.line?.short_name || '';
                    const isTrain = vehicleType.toUpperCase().includes('TRAIN') || 
                                   vehicleType.toUpperCase().includes('RAIL') || 
                                   vehicleType.toUpperCase().includes('SUBWAY') ||
                                   vehicleType.toUpperCase().includes('METRO');

                    return (
                      <div key={stepIndex} className={`border-l-4 ${isTrain ? 'border-purple-500' : 'border-blue-500'} pl-4 py-3`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 ${getVehicleColor(vehicleType)} rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
                            {getVehicleIcon(vehicleType)}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-800 mb-1">
                              {lineShortName && <span className="mr-2 text-lg">{lineShortName}</span>}
                              {lineName}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-green-600" />
                                <span>From: <strong>{transit.departure_stop?.name || 'N/A'}</strong></span>
                                {transit.departure_time && (
                                  <span className="ml-2 text-gray-500">
                                    ({transit.departure_time.text})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-red-600" />
                                <span>To: <strong>{transit.arrival_stop?.name || 'N/A'}</strong></span>
                                {transit.arrival_time && (
                                  <span className="ml-2 text-gray-500">
                                    ({transit.arrival_time.text})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  isTrain 
                                    ? 'bg-purple-100 text-purple-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {vehicleType.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {transitData.routes.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No transit routes available for the selected filter
        </div>
      )}
    </div>
  );
};

export default TransitResultsCard;