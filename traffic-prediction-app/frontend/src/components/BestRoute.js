import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, LoadScript, DirectionsService, DirectionsRenderer, Marker, InfoWindow } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '../config';
import axios from 'axios';
import { WEATHER_API_KEY } from '../config';
import './BestRoute.css';

const BestRoute = () => {
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedDestination, setSelectedDestination] = useState("");
  const [directions, setDirections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [waypoints, setWaypoints] = useState([]);
  const [waypointInput, setWaypointInput] = useState("");
  const [routeLabels, setRouteLabels] = useState([]);
  const [selectedMode, setSelectedMode] = useState('DRIVING');
  const [trafficInfo, setTrafficInfo] = useState([]);
  const [weatherInfo, setWeatherInfo] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [locationPermission, setLocationPermission] = useState('prompt');
  const [heading, setHeading] = useState(0);
  const [arrowIcon, setArrowIcon] = useState(null);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  
  // New parking-related state
  const [parkingSpots, setParkingSpots] = useState([]);
  const [showParkingInfo, setShowParkingInfo] = useState(false);
  const [loadingParkingInfo, setLoadingParkingInfo] = useState(false);
  const [selectedParkingSpot, setSelectedParkingSpot] = useState(null);
  const [parkingRadius, setParkingRadius] = useState(500); // 500 meters default
  
  const watchIdRef = useRef(null);
  const simulationIntervalRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [nextInstruction, setNextInstruction] = useState('');
  const [distanceToNext, setDistanceToNext] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [followMode, setFollowMode] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    if (window.google?.maps?.Symbol) {
      setArrowIcon({
        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: '#4F46E5',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        rotation: 0
      });
    }
  }, [isGoogleLoaded]);

  // Function to find parking spots near destination
  const findParkingSpots = useCallback(async () => {
    if (!selectedDestination || !isGoogleLoaded || !window.google?.maps?.places) {
      setError("Please select a destination first and ensure Google Maps is loaded");
      return;
    }

    setLoadingParkingInfo(true);
    setParkingSpots([]);

    try {
      // First, geocode the destination to get coordinates
      const geocoder = new window.google.maps.Geocoder();
      const geocodeResult = await new Promise((resolve, reject) => {
        geocoder.geocode({ address: selectedDestination }, (results, status) => {
          if (status === 'OK' && results[0]) {
            resolve(results[0]);
          } else {
            reject(new Error('Could not geocode destination'));
          }
        });
      });

      const destinationLocation = geocodeResult.geometry.location;

      // Create PlacesService if not exists
      if (!placesService.current && mapRef.current) {
        placesService.current = new window.google.maps.places.PlacesService(mapRef.current);
      }

      if (!placesService.current) {
        throw new Error('Places service not available');
      }

      // Search for parking spots
      const request = {
        location: destinationLocation,
        radius: parkingRadius,
        type: 'parking'
      };

      const searchResults = await new Promise((resolve, reject) => {
        placesService.current.nearbySearch(request, (results, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            resolve(results || []);
          } else {
            reject(new Error(`Places search failed: ${status}`));
          }
        });
      });

      // Get detailed information for each parking spot
      const detailedParkingSpots = await Promise.all(
        searchResults.slice(0, 10).map(async (place) => { // Limit to 10 results
          try {
            const details = await new Promise((resolve, reject) => {
              placesService.current.getDetails({
                placeId: place.place_id,
                fields: ['name', 'formatted_address', 'geometry', 'rating', 'user_ratings_total', 'opening_hours', 'price_level', 'photos', 'reviews']
              }, (result, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                  resolve(result);
                } else {
                  resolve(null);
                }
              });
            });

            return {
              id: place.place_id,
              name: place.name || 'Unknown Parking',
              address: place.vicinity || place.formatted_address || 'Address not available',
              location: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              },
              rating: place.rating || 0,
              totalRatings: place.user_ratings_total || 0,
              priceLevel: place.price_level,
              openingHours: details?.opening_hours?.weekday_text || [],
              isOpen: details?.opening_hours?.isOpen?.() || null,
              photos: place.photos || [],
              distance: window.google.maps.geometry.spherical.computeDistanceBetween(
                destinationLocation,
                place.geometry.location
              )
            };
          } catch (error) {
            console.error('Error getting place details:', error);
            return {
              id: place.place_id,
              name: place.name || 'Unknown Parking',
              address: place.vicinity || 'Address not available',
              location: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              },
              rating: place.rating || 0,
              totalRatings: place.user_ratings_total || 0,
              distance: window.google.maps.geometry.spherical.computeDistanceBetween(
                destinationLocation,
                place.geometry.location
              )
            };
          }
        })
      );

      // Sort by distance
      detailedParkingSpots.sort((a, b) => a.distance - b.distance);
      setParkingSpots(detailedParkingSpots);
      setShowParkingInfo(true);

    } catch (error) {
      console.error('Error finding parking spots:', error);
      setError(`Could not find parking information: ${error.message}`);
    } finally {
      setLoadingParkingInfo(false);
    }
  }, [selectedDestination, isGoogleLoaded, parkingRadius]);

  // Function to get price level description
  const getPriceLevelText = (priceLevel) => {
    if (priceLevel === undefined || priceLevel === null) return 'Price not available';
    const levels = ['Free', 'Inexpensive', 'Moderate', 'Expensive', 'Very Expensive'];
    return levels[priceLevel] || 'Price not available';
  };

  // Function to format distance
  const formatDistance = (distance) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  };

  // Get parking marker icon
  const getParkingIcon = () => ({
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="15" fill="#1E40AF" stroke="white" stroke-width="2"/>
        <text x="16" y="22" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="bold">P</text>
      </svg>
    `),
    scaledSize: new window.google.maps.Size(32, 32)
  });

  // Original functions remain the same...
  const getSuggestions = useCallback(async (input) => {
    if (!input || !window.google || !window.google.maps || !window.google.maps.places) {
      console.log('Google Places API not loaded yet');
      return;
    }
    setIsLoadingSuggestions(true);

    try {
      if (!autocompleteService.current) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
      }

      const response = await new Promise((resolve, reject) => {
        autocompleteService.current.getPlacePredictions(
          {
            input,
            componentRestrictions: { country: 'in' },
            types: ['geocode']
          },
          (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
              resolve(results);
            } else {
              reject(status);
            }
          }
        );
      });
      setSuggestions(response);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
    setIsLoadingSuggestions(false);
  }, []);

  const travelModes = [
    { id: 'DRIVING', icon: '🚗', label: 'Drive' },
    { id: 'TRANSIT', icon: '🚌', label: 'Bus' },
    { id: 'WALKING', icon: '🚶', label: 'Walk' },
    { id: 'BICYCLING', icon: '🚲', label: 'Bike' }
  ];

  const mapContainerStyle = {
    width: '100%',
    height: '500px'
  };

  const center = {
    lat: 20.5937,
    lng: 78.9629
  };

  const getWeatherInfo = async (lat, lng) => {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEY}&units=metric`
      );
      return {
        temp: Math.round(response.data.main.temp),
        condition: response.data.weather[0].main,
        icon: response.data.weather[0].icon
      };
    } catch (error) {
      console.error('Weather fetch error:', error);
      return null;
    }
  };

  const directionsCallback = useCallback(async (result, status) => {
    if (status === 'OK' && result.routes.length > 0) {
      setDirections(result.routes);
      
      // Get weather for destination
      const destLat = result.routes[0].legs[0].end_location.lat();
      const destLng = result.routes[0].legs[0].end_location.lng();
      const weather = await getWeatherInfo(destLat, destLng);
      setWeatherInfo(weather);

      // Process routes with traffic info
      const routesInfo = result.routes.map((route, index) => {
        const leg = route.legs[0];
        const trafficTime = leg.duration_in_traffic?.value || leg.duration.value;
        const normalTime = leg.duration.value;
        const delayFactor = trafficTime / normalTime;
        
        let trafficLevel;
        if (delayFactor <= 1.1) trafficLevel = 'Low';
        else if (delayFactor <= 1.3) trafficLevel = 'Moderate';
        else trafficLevel = 'Heavy';

        return {
          text: `Route ${index + 1}`,
          color: index === 0 ? '#4F46E5' : index === 1 ? '#059669' : '#DC2626',
          trafficLevel,
          delayMinutes: Math.round((trafficTime - normalTime) / 60),
          viaPoints: leg.via_waypoints
            .map(point => `${point.location.lat().toFixed(4)},${point.location.lng().toFixed(4)}`)
            .join(' → ')
        };
      });

      setRouteLabels(routesInfo);
      setTrafficInfo(routesInfo);
      setError("");
    } else {
      let errorMessage = "Could not find any routes between these locations";
      switch (status) {
        case 'ZERO_RESULTS':
          errorMessage = "No route found between these locations. Please check the addresses.";
          break;
        case 'NOT_FOUND':
          errorMessage = "One or more locations could not be found. Please check the addresses.";
          break;
        case 'OVER_QUERY_LIMIT':
          errorMessage = "Too many requests. Please try again later.";
          break;
        case 'REQUEST_DENIED':
          errorMessage = "Route request was denied. Please check your API key.";
          break;
        case 'INVALID_REQUEST':
          errorMessage = "Invalid route request. Please check the addresses.";
          break;
      }
      setError(errorMessage);
      setDirections([]);
    }
    setLoading(false);
  }, []);

  const getTrafficColor = (level) => {
    switch (level) {
      case 'Low': return 'text-green-600';
      case 'Moderate': return 'text-yellow-600';
      case 'Heavy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSource || !selectedDestination) {
      setError("Please enter both source and destination");
      return;
    }
    setLoading(true);
    setDirections([]);
    // Clear parking info when new route is requested
    setParkingSpots([]);
    setShowParkingInfo(false);
  };

  const addWaypoint = (location) => {
    setWaypoints([...waypoints, {
      location: `${location}, India`,
      stopover: true
    }]);
    setWaypointInput("");
  };

  const requestLocationPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      setLocationPermission(result.state);
      
      if (result.state === 'denied') {
        setError('Location permission is required for navigation');
        return false;
      }
      
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => {
            setError('Location access denied. Please enable location services.');
            resolve(false);
          }
        );
      });
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  const startTracking = (routeIndex) => {
    setSelectedRoute(directions[routeIndex]);
    setIsTracking(true);
    setNavigating(true);
    setCurrentStep(0);

    const route = directions[routeIndex];
    const steps = route.legs[0].steps;

    setNextInstruction(steps[0].instructions);
    setDistanceToNext(steps[0].distance.text);
    setEstimatedTime(route.legs[0].duration.text);

    if ("geolocation" in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const newPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          if (currentPosition) {
            const angle = window.google.maps.geometry.spherical.computeHeading(
              new window.google.maps.LatLng(currentPosition.lat, currentPosition.lng),
              new window.google.maps.LatLng(newPosition.lat, newPosition.lng)
            );
            setHeading(angle);
          }

          if (steps[currentStep + 1]) {
            const distanceToNextStep = window.google.maps.geometry.spherical.computeDistanceBetween(
              new window.google.maps.LatLng(newPosition.lat, newPosition.lng),
              steps[currentStep + 1].start_location
            );

            if (distanceToNextStep < 50) {
              setCurrentStep(curr => curr + 1);
              setNextInstruction(steps[currentStep + 1].instructions);
              setDistanceToNext(steps[currentStep + 1].distance.text);
              
              const remainingSteps = steps.slice(currentStep + 1);
              const remainingTime = remainingSteps.reduce((acc, step) => acc + step.duration.value, 0);
              setEstimatedTime(Math.round(remainingTime / 60) + ' mins');
            }
          }
          
          setCurrentPosition(newPosition);
        },
        (error) => {
          console.error("Error getting location:", error);
          stopTracking();
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000
        }
      );
    }
  };

  const simulateMovement = (routeIndex) => {
    const route = directions[routeIndex];
    const path = route.legs[0].steps.flatMap(step => 
      window.google.maps.geometry.encoding.decodePath(step.polyline.points)
    );
    
    let currentIdx = 0;
    
    simulationIntervalRef.current = setInterval(() => {
      if (currentIdx < path.length - 1) {
        const currentPoint = path[currentIdx];
        const nextPoint = path[currentIdx + 1];
        
        const heading = window.google.maps.geometry.spherical.computeHeading(
          currentPoint,
          nextPoint
        );
        
        setHeading(heading);
        setCurrentPosition({
          lat: currentPoint.lat(),
          lng: currentPoint.lng()
        });
        
        currentIdx++;
      } else {
        stopTracking();
      }
    }, 1000);
  };

  const stopTracking = () => {
    setIsTracking(false);
    setNavigating(false);
    setSelectedRoute(null);
    setCurrentPosition(null);
    setCurrentStep(0);
    setNextInstruction('');
    setDistanceToNext('');
    setEstimatedTime('');
    
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, []);

  const getCurrentLocation = async () => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({
        location: { lat: latitude, lng: longitude }
      });

      if (result.results[0]) {
        setSelectedSource(result.results[0].formatted_address);
        setUseCurrentLocation(true);
      }
    } catch (error) {
      setError("Could not get current location. Please check your GPS settings.");
      console.error('Error getting current location:', error);
    }
  };

  const LocationPrompt = ({ onAccept }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md">
        <h3 className="text-lg font-semibold mb-4">Location Access Required</h3>
        <p className="text-gray-600 mb-6">
          This app needs access to your location for navigation features. 
          Please allow location access when prompted.
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onAccept}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );

  const NavigationOverlay = ({ instruction, distance, time, onClose }) => (
    <div className="fixed inset-0 flex flex-col pointer-events-none">
      <div className="bg-white shadow-lg p-4 mb-auto pointer-events-auto">
        <div className="max-w-7xl mx-auto">
          <div dangerouslySetInnerHTML={{ __html: instruction }} className="text-2xl font-semibold" />
          <p className="text-gray-600">{distance}</p>
        </div>
      </div>
      
      <div className="bg-white shadow-lg p-4 pointer-events-auto">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <p className="text-lg font-semibold">Estimated arrival: {time}</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              End
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const RecenterButton = ({ onClick }) => (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-4 bg-white p-3 rounded-full shadow-lg z-50"
    >
      <span className="text-2xl">🎯</span>
    </button>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50">
      <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
        Best Route Finder
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-8">
        <div className="relative w-64">
          <div className="flex items-center mb-2">
            <button
              type="button"
              onClick={getCurrentLocation}
              className="text-indigo-600 hover:text-indigo-700 text-sm flex items-center gap-1"
            >
              <span className="text-xl">📍</span>
              Use current location
            </button>
          </div>
          <input
            type="text"
            value={selectedSource}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedSource(value);
              if (isGoogleLoaded) {
                getSuggestions(value);
              }
              setUseCurrentLocation(false);
            }}
            placeholder="Enter source location"
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          {isLoadingSuggestions && (
            <div className="absolute right-2 top-3">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent"></div>
            </div>
          )}
          {suggestions.length > 0 && !useCurrentLocation && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.place_id}
                  type="button"
                  onClick={() => {
                    setSelectedSource(suggestion.description);
                    setSuggestions([]);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  {suggestion.description}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative w-64">
          <input
            type="text"
            value={selectedDestination}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedDestination(value);
              if (isGoogleLoaded) {
                getSuggestions(value);
              }
            }}
            placeholder="Enter destination"
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          {isLoadingSuggestions && (
            <div className="absolute right-2 top-3">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent"></div>
            </div>
          )}
          {suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.place_id}
                  type="button"
                  onClick={() => {
                    setSelectedDestination(suggestion.description);
                    setSuggestions([]);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  {suggestion.description}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <input
            type="text"
            value={waypointInput}
            onChange={(e) => setWaypointInput(e.target.value)}
            placeholder="Add stop (optional)"
            className="w-64 p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => addWaypoint(waypointInput)}
            disabled={!waypointInput}
            className="absolute right-2 top-2 text-indigo-600 hover:text-indigo-700"
          >
            Add
          </button>
        </div>

        {waypoints.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-gray-700">Stops:</p>
            {waypoints.map((waypoint, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{waypoint.location}</span>
                <button
                  type="button"
                  onClick={() => setWaypoints(waypoints.filter((_, i) => i !== index))}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-center gap-4 mt-4">
          {travelModes.map(mode => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setSelectedMode(mode.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                selectedMode === mode.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <span className="text-xl">{mode.icon}</span>
              <span>{mode.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-4 justify-center">
          <button 
            type="submit"
            disabled={loading}
            className={`px-6 py-2 text-white rounded-md transition-colors duration-200 ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
            }`}
          >
            {loading ? 'Finding Routes...' : 'Find Routes'}
          </button>

          {/* New Parking Info Button */}
          <button
            type="button"
            onClick={findParkingSpots}
            disabled={!selectedDestination || loadingParkingInfo}
            className={`px-6 py-2 text-white rounded-md transition-colors duration-200 flex items-center gap-2 ${
              !selectedDestination || loadingParkingInfo
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            <span className="text-xl">🅿️</span>
            {loadingParkingInfo ? 'Finding Parking...' : 'Find Parking'}
          </button>
        </div>

        {/* Parking radius selector */}
        {selectedDestination && (
          <div className="flex items-center gap-4 justify-center">
            <label className="text-sm font-medium text-gray-700">Search radius:</label>
            <select
              value={parkingRadius}
              onChange={(e) => setParkingRadius(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value={200}>200m</option>
              <option value={500}>500m</option>
              <option value={1000}>1km</option>
              <option value={2000}>2km</option>
            </select>
          </div>
        )}
      </form>

      {error && (
        <div className="text-red-600 text-center mb-4">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-lg">
        <LoadScript
          googleMapsApiKey={GOOGLE_MAPS_API_KEY}
          libraries={['places', 'geometry']}
          onLoad={() => {
            if (window.google?.maps?.places) {
              setIsGoogleLoaded(true);
              autocompleteService.current = new window.google.maps.places.AutocompleteService();
            }
          }}
        >
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={currentPosition || center}
            zoom={isTracking ? 18 : currentPosition ? 15 : 5}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              zoomControl: !isTracking,
              rotateControl: isTracking,
              tilt: isTracking ? 45 : 0,
              heading: isTracking ? heading : 0
            }}
            onLoad={(map) => (mapRef.current = map)}
          >
            {selectedSource && selectedDestination && !directions.length && (
              <DirectionsService
                options={{
                  destination: selectedDestination,
                  origin: selectedSource,
                  travelMode: selectedMode,
                  provideRouteAlternatives: true,
                  optimizeWaypoints: true,
                  waypoints: waypoints,
                  drivingOptions: {
                    departureTime: new Date(),
                    trafficModel: 'bestguess'
                  }
                }}
                callback={directionsCallback}
              />
            )}

            {directions.map((route, index) => (
              <React.Fragment key={index}>
                {(!isTracking || (isTracking && selectedRoute === route)) && (
                  <>
                    <DirectionsRenderer
                      options={{
                        directions: {
                          routes: [route],
                          request: {
                            destination: selectedDestination,
                            origin: selectedSource,
                            travelMode: selectedMode
                          }
                        },
                        routeIndex: 0,
                        polylineOptions: {
                          strokeColor: routeLabels[index]?.color || '#4F46E5',
                          strokeWeight: 4,
                          clickable: true,
                          title: `Route ${index + 1}${index === 0 ? ' (Recommended)' : ''}\nDistance: ${route.legs[0].distance.text}\nDuration: ${route.legs[0].duration.text}`
                        },
                        suppressMarkers: false
                      }}
                    />
                  </>
                )}
              </React.Fragment>
            ))}

            {/* Parking spot markers */}
            {showParkingInfo && parkingSpots.map((spot) => (
              <Marker
                key={spot.id}
                position={spot.location}
                icon={isGoogleLoaded && window.google?.maps ? getParkingIcon() : undefined}
                onClick={() => setSelectedParkingSpot(spot)}
              />
            ))}

            {/* Current position marker */}
            {currentPosition && arrowIcon && (
              <Marker
                position={currentPosition}
                icon={{
                  ...arrowIcon,
                  rotation: heading
                }}
              />
            )}

            {/* Info window for selected parking spot */}
            {selectedParkingSpot && (
              <InfoWindow
                position={selectedParkingSpot.location}
                onCloseClick={() => setSelectedParkingSpot(null)}
              >
                <div className="max-w-xs">
                  <h3 className="font-semibold text-lg mb-2">{selectedParkingSpot.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{selectedParkingSpot.address}</p>
                  <p className="text-sm mb-1">
                    <strong>Distance:</strong> {formatDistance(selectedParkingSpot.distance)}
                  </p>
                  {selectedParkingSpot.rating > 0 && (
                    <p className="text-sm mb-1">
                      <strong>Rating:</strong> ⭐ {selectedParkingSpot.rating.toFixed(1)} 
                      ({selectedParkingSpot.totalRatings} reviews)
                    </p>
                  )}
                  <p className="text-sm mb-1">
                    <strong>Price:</strong> {getPriceLevelText(selectedParkingSpot.priceLevel)}
                  </p>
                  {selectedParkingSpot.isOpen !== null && (
                    <p className={`text-sm font-medium ${selectedParkingSpot.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedParkingSpot.isOpen ? 'Open Now' : 'Closed Now'}
                    </p>
                  )}
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </LoadScript>
      </div>

      {isTracking && !followMode && (
        <RecenterButton
          onClick={() => {
            setFollowMode(true);
            if (currentPosition) {
              mapRef.current?.panTo(currentPosition);
            }
          }}
        />
      )}

      {/* Parking Information Panel */}
      {showParkingInfo && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <span className="text-2xl">🅿️</span>
              Parking Near Destination ({parkingSpots.length} found)
            </h3>
            <button
              onClick={() => setShowParkingInfo(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          {parkingSpots.length === 0 ? (
            <p className="text-gray-600 text-center py-4">
              No parking spots found within {parkingRadius}m of your destination.
              Try increasing the search radius.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {parkingSpots.map((spot) => (
                <div
                  key={spot.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedParkingSpot(spot)}
                >
                  <h4 className="font-semibold text-lg mb-2">{spot.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">{spot.address}</p>
                  
                  <div className="space-y-1 text-sm">
                    <p><strong>Distance:</strong> {formatDistance(spot.distance)}</p>
                    
                    {spot.rating > 0 && (
                      <p>
                        <strong>Rating:</strong> ⭐ {spot.rating.toFixed(1)} 
                        <span className="text-gray-500"> ({spot.totalRatings})</span>
                      </p>
                    )}
                    
                    <p>
                      <strong>Price:</strong> 
                      <span className={`ml-1 ${
                        spot.priceLevel === 0 ? 'text-green-600' : 
                        spot.priceLevel <= 2 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {getPriceLevelText(spot.priceLevel)}
                      </span>
                    </p>
                    
                    {spot.isOpen !== null && (
                      <p className={`font-medium ${spot.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                        {spot.isOpen ? '🟢 Open Now' : '🔴 Closed Now'}
                      </p>
                    )}
                    
                    {spot.openingHours.length > 0 && (
                      <div className="mt-2">
                        <strong className="text-xs">Hours:</strong>
                        <div className="text-xs text-gray-600 max-h-20 overflow-y-auto">
                          {spot.openingHours.slice(0, 3).map((hour, index) => (
                            <div key={index}>{hour}</div>
                          ))}
                          {spot.openingHours.length > 3 && (
                            <div className="text-blue-600">+ {spot.openingHours.length - 3} more...</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedParkingSpot(spot);
                      mapRef.current?.panTo(spot.location);
                      mapRef.current?.setZoom(16);
                    }}
                    className="mt-3 w-full px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                  >
                    View on Map
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {directions.length > 0 && (
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
                        requestLocationPermission().then(hasPermission => {
                          if (hasPermission) {
                            startTracking(index);
                          }
                        });
                      } else {
                        startTracking(index);
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    Start Navigation
                  </button>
                ) : selectedRoute === route && (
                  <button
                    onClick={stopTracking}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    Stop Navigation
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {weatherInfo && (
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
      )}

      {navigating && (
        <NavigationOverlay
          instruction={nextInstruction}
          distance={distanceToNext}
          time={estimatedTime}
          onClose={stopTracking}
        />
      )}
    </div>
  );
};

export default BestRoute;