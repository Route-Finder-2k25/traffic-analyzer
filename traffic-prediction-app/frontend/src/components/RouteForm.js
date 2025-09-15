import React, { useState, useRef, useEffect } from 'react';

const RouteForm = ({
  selectedSource,
  setSelectedSource,
  selectedDestination,
  setSelectedDestination,
  waypointInput,
  setWaypointInput,
  waypoints,
  setWaypoints,
  selectedMode,
  setSelectedMode,
  parkingRadius,
  setParkingRadius,
  evRadius,
  setEvRadius,
  loading,
  loadingParkingInfo,
  loadingEvInfo,
  useCurrentLocation,
  setUseCurrentLocation,
  suggestions,
  isLoadingSuggestions,
  isGoogleLoaded,
  travelModes,
  onSubmit,
  onAddWaypoint,
  onGetCurrentLocation,
  onFindParking,
  onFindEvStations,
  onSuggestionSearch,
  onSuggestionSelect,
  clearSuggestions
}) => {
  const [activeSuggestionField, setActiveSuggestionField] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const sourceRef = useRef(null);
  const destinationRef = useRef(null);
  const waypointRef = useRef(null);

  // Handle input changes with debounced suggestions
  const handleInputChange = (value, field, setter) => {
    setter(value);
    if (value.length > 2) {
      setActiveSuggestionField(field);
      setShowSuggestions(true);
      onSuggestionSearch(value);
    } else {
      setShowSuggestions(false);
      clearSuggestions();
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    onSuggestionSelect(suggestion, activeSuggestionField);
    setShowSuggestions(false);
    setActiveSuggestionField(null);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sourceRef.current && !sourceRef.current.contains(event.target) &&
        destinationRef.current && !destinationRef.current.contains(event.target) &&
        waypointRef.current && !waypointRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
        setActiveSuggestionField(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const removeWaypoint = (index) => {
    const newWaypoints = waypoints.filter((_, i) => i !== index);
    setWaypoints(newWaypoints);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Main Input Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          {/* Source Input */}
          <div className="lg:col-span-4 relative" ref={sourceRef}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📍 From
            </label>
            <div className="relative">
              <input
                type="text"
                value={selectedSource}
                onChange={(e) => handleInputChange(e.target.value, 'source', setSelectedSource)}
                onFocus={() => {
                  if (selectedSource.length > 2) {
                    setActiveSuggestionField('source');
                    setShowSuggestions(true);
                  }
                }}
                placeholder="Enter starting location"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                disabled={loading}
              />
              <button
                type="button"
                onClick={onGetCurrentLocation}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 hover:text-blue-600 transition-colors duration-200"
                title="Use current location"
              >
                🎯
              </button>
            </div>
            
            {/* Source Suggestions */}
            {showSuggestions && activeSuggestionField === 'source' && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 border-b border-gray-100 last:border-b-0 flex items-center space-x-3"
                  >
                    <span className="text-gray-400">📍</span>
                    <span className="text-sm">{suggestion.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Destination Input */}
          <div className="lg:col-span-4 relative" ref={destinationRef}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🎯 To
            </label>
            <input
              type="text"
              value={selectedDestination}
              onChange={(e) => handleInputChange(e.target.value, 'destination', setSelectedDestination)}
              onFocus={() => {
                if (selectedDestination.length > 2) {
                  setActiveSuggestionField('destination');
                  setShowSuggestions(true);
                }
              }}
              placeholder="Enter destination"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white"
              disabled={loading}
            />
            
            {/* Destination Suggestions */}
            {showSuggestions && activeSuggestionField === 'destination' && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 border-b border-gray-100 last:border-b-0 flex items-center space-x-3"
                  >
                    <span className="text-gray-400">🎯</span>
                    <span className="text-sm">{suggestion.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Travel Mode Selection */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🚗 Mode
            </label>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white"
              disabled={loading}
            >
              {travelModes.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.icon} {mode.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search Button */}
          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={loading || !selectedSource || !selectedDestination}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Finding...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>🔍</span>
                  <span>Find Route</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Waypoints Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
            <div className="lg:col-span-2 relative" ref={waypointRef}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ➕ Add Stop (Optional)
              </label>
              <input
                type="text"
                value={waypointInput}
                onChange={(e) => handleInputChange(e.target.value, 'waypoint', setWaypointInput)}
                onFocus={() => {
                  if (waypointInput.length > 2) {
                    setActiveSuggestionField('waypoint');
                    setShowSuggestions(true);
                  }
                }}
                placeholder="Add intermediate stop"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-gray-50 hover:bg-white"
              />
              
              {/* Waypoint Suggestions */}
              {showSuggestions && activeSuggestionField === 'waypoint' && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-4 py-3 text-left hover:bg-green-50 hover:text-green-700 transition-colors duration-150 border-b border-gray-100 last:border-b-0 flex items-center space-x-3"
                    >
                      <span className="text-gray-400">📍</span>
                      <span className="text-sm">{suggestion.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <button
                type="button"
                onClick={() => waypointInput && onAddWaypoint(waypointInput)}
                disabled={!waypointInput.trim()}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 rounded-lg font-semibold shadow-lg hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Add Stop
              </button>
            </div>

            <div className="lg:col-span-1">
              <button
                type="button"
                onClick={onFindParking}
                disabled={!selectedDestination || loadingParkingInfo}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-lg font-semibold shadow-lg hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loadingParkingInfo ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Finding...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>🅿️</span>
                    <span>Parking</span>
                  </div>
                )}
              </button>
            </div>

            <div className="lg:col-span-1">
              <button
                type="button"
                onClick={onFindEvStations}
                disabled={(!!!selectedDestination && !!!waypoints?.length) || loadingEvInfo}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-3 rounded-lg font-semibold shadow-lg hover:from-emerald-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loadingEvInfo ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Finding...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>⚡</span>
                    <span>EV Stations</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Parking Radius Slider */}
          {selectedDestination && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
              <label className="block text-sm font-semibold text-purple-700 mb-3">
                🅿️ Parking Search Radius: {parkingRadius}m
              </label>
              <input
                type="range"
                min="500"
                max="2000"
                step="100"
                value={parkingRadius}
                onChange={(e) => setParkingRadius(parseInt(e.target.value))}
                className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-purple-600 mt-1">
                <span>500m</span>
                <span>1.25km</span>
                <span>2km</span>
              </div>
            </div>
          )}

          {/* Active Waypoints Display */}
          {waypoints.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <h4 className="text-sm font-semibold text-green-700 mb-3">🛣️ Route Stops:</h4>
              <div className="flex flex-wrap gap-2">
                {waypoints.map((waypoint, index) => (
                  <div
                    key={index}
                    className="bg-white px-4 py-2 rounded-full border border-green-300 text-sm text-green-700 flex items-center space-x-2 shadow-sm"
                  >
                    <span>📍</span>
                    <span>{waypoint.location.replace(', India', '')}</span>
                    <button
                      type="button"
                      onClick={() => removeWaypoint(index)}
                      className="ml-2 text-red-500 hover:text-red-700 font-bold transition-colors duration-200"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Current Location Toggle */}
        <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <input
            type="checkbox"
            id="useCurrentLocation"
            checked={useCurrentLocation}
            onChange={(e) => setUseCurrentLocation(e.target.checked)}
            className="h-5 w-5 text-blue-600 border-2 border-blue-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="useCurrentLocation" className="text-sm font-medium text-blue-700 cursor-pointer">
            🎯 Use my current location as starting point
          </label>
        </div>
      </form>

      {/* Loading Indicator */}
      {isLoadingSuggestions && (
        <div className="flex items-center justify-center space-x-2 mt-4 text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
          <span className="text-sm">Loading suggestions...</span>
        </div>
      )}
    </div>
  );
};

export default RouteForm;