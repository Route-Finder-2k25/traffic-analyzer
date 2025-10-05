import React, { useState, useCallback, useRef } from 'react';
import { LoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '../config';
import axios from 'axios';
import { WEATHER_API_KEY } from '../config';
import './BestRoute.css';
import { decodePolyline } from '../utils/maps';

// Import components
import RouteForm from './RouteForm';
import MapContainer from './MapContainer';
import ParkingPanel from './ParkingPanel';
import RouteResults from './RouteResults';
import WeatherCard from './WeatherCard';
import NavigationOverlay from './NavigationOverlay';
import LocationPrompt from './LocationPrompt';
import RecenterButton from './RecenterButton';
import TransitResultsCard from './TransitResultsCard';

// Import hooks
import useLocationTracking from '../hooks/useLocationTracking';
import useParkingSpots from '../hooks/useParkingSpots';
import useEvStations from '../hooks/useEvStations';
import useGoogleMapsServices from '../hooks/useGoogleMapsServices';
import useAccidentZones from '../hooks/useAccidentZones';

// Define constant libraries outside component to avoid reload issues in LoadScript
const LIBRARIES = ['places', 'geometry'];

const mapContainerStyle = {
  width: '100%',
  height: '500px'
};

const center = { lat: 20.5937, lng: 78.9629 };

const travelModes = [
  { id: 'DRIVING', icon: '🚗', label: 'Drive' },
  { id: 'TRANSIT', icon: '🚌', label: 'Bus' },
  { id: 'WALKING', icon: '🚶', label: 'Walk' },
  { id: 'BICYCLING', icon: '🚲', label: 'Bike' }
];

const BestRoute = () => {
  // States
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
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [shouldRequestDirections, setShouldRequestDirections] = useState(false);
  const [transitData, setTransitData] = useState(null);
  const [transitPolylines, setTransitPolylines] = useState([]);
  const [loadingTransit, setLoadingTransit] = useState(false);
  const [transitError, setTransitError] = useState('');

  const geocodeToLatLng = async (address) => {
    return new Promise((resolve, reject) => {
      if (!window.google?.maps?.Geocoder) return reject(new Error('Geocoder not ready'));
      const geocoder = new window.google.maps.Geocoder();
      const geocodeRequest = { address, region: 'in' };
      console.log('[Transit][Geocode][Request]', geocodeRequest);
      geocoder.geocode(geocodeRequest, (results, status) => {
        console.log('[Transit][Geocode][Response]', { status, results });
        if (status === 'OK' && results && results[0]) {
          const loc = results[0].geometry.location;
          resolve({ lat: loc.lat(), lng: loc.lng() });
        } else {
          reject(new Error(`Geocode failed: ${status}`));
        }
      });
    });
  };
  // Refs and readiness (must be defined before hooks that depend on them)
  const mapRef = useRef(null);
  const [mapsReady, setMapsReady] = useState(false);

  // Accident zones hook
  const {
    accidentZones,
    showAccidentInfo,
    setShowAccidentInfo,
    loadingAccidents,
    accidentWarnings,
    findAccidentZones
  } = useAccidentZones(mapsReady, mapRef);
  const [selectedAccidentZone, setSelectedAccidentZone] = useState(null);

  // Navigation states
  const [navigating, setNavigating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [nextInstruction, setNextInstruction] = useState('');
  const [distanceToNext, setDistanceToNext] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [followMode, setFollowMode] = useState(false);

  // mapRef moved above to satisfy hook dependency order

  // Hooks
  const {
    isTracking,
    currentPosition,
    locationPermission,
    heading,
    arrowIcon,
    startTracking,
    stopTracking,
    requestLocationPermission
  } = useLocationTracking();

  const {
    parkingSpots,
    showParkingInfo,
    loadingParkingInfo,
    selectedParkingSpot,
    parkingRadius,
    setShowParkingInfo,
    setSelectedParkingSpot,
    setParkingRadius,
    findParkingSpots,
    getParkingIcon,
    formatDistance,
    getPriceLevelText
  } = useParkingSpots(selectedDestination, mapRef);

  const {
    isGoogleLoaded,
    suggestions,
    isLoadingSuggestions,
    getSuggestions,
    clearSuggestions
  } = useGoogleMapsServices();

  // EV stations
  const {
    evStations,
    showEvInfo,
    loadingEvInfo,
    selectedEvStation,
    evRadius,
    setShowEvInfo,
    setSelectedEvStation,
    setEvRadius,
    findEvStations,
    getEvIcon,
    formatDistance: evFormatDistance
  } = useEvStations(selectedDestination, mapRef);

  // Fetch weather info helper
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

  // Directions callback with guarded property access for duration values
  const directionsCallback = useCallback(async (result, status) => {
    if (status === 'OK' && result.routes.length > 0) {
      setDirections(result.routes);

      // Guard access to legs and end_location - Fixed array access
      const firstRoute = result.routes[0];
      const firstLeg = firstRoute.legs && firstRoute.legs.length > 0 ? firstRoute.legs[0] : null;

      if (firstLeg && firstLeg.end_location) {
        const destLat = firstLeg.end_location.lat();
        const destLng = firstLeg.end_location.lng();
        const weather = await getWeatherInfo(destLat, destLng);
        setWeatherInfo(weather);
      } else {
        setWeatherInfo(null);
      }

      // Process routes for traffic info safely
      const routesInfo = result.routes
        .map((route, index) => {
          const leg = route.legs && route.legs[0];
          // Guard duration fields
          const hasDuration =
            leg &&
            leg.duration &&
            typeof leg.duration.value === "number";
          if (!hasDuration) return null;

          const normalTime = leg.duration.value;
          const trafficTime =
            leg.duration_in_traffic &&
            typeof leg.duration_in_traffic.value === "number"
              ? leg.duration_in_traffic.value
              : normalTime;

          const delayFactor = trafficTime / normalTime;
          let trafficLevel;
          if (delayFactor <= 1.1) trafficLevel = "Low";
          else if (delayFactor <= 1.3) trafficLevel = "Moderate";
          else trafficLevel = "Heavy";

          return {
            text: `Route ${index + 1}`,
            color:
              index === 0
                ? "#4F46E5"
                : index === 1
                ? "#059669"
                : "#DC2626",
            trafficLevel,
            delayMinutes: Math.round((trafficTime - normalTime) / 60),
            viaPoints: leg.via_waypoints
              ? leg.via_waypoints
                  .map(
                    (point) =>
                      `${point.location.lat().toFixed(4)},${point.location
                        .lng()
                        .toFixed(4)}`
                  )
                  .join(" → ")
              : "",
          };
        })
        .filter(Boolean); // Remove any nulls from error guards

      setRouteLabels(routesInfo);
      setTrafficInfo(routesInfo);
      setError("");
      // Transit is fetched on-demand via button
      // Try to refresh accident zones for the primary route when available
      try {
        if (result.routes && result.routes[0]) {
          await findAccidentZones(result.routes[0]);
        }
      } catch (e) {
        console.error('Accident zone refresh error:', e);
      }
    } else {
      let errorMessage = "Could not find any routes between these locations";
      switch (status) {
        case "ZERO_RESULTS":
          errorMessage =
            "No route found between these locations. Please check the addresses.";
          break;
        case "NOT_FOUND":
          errorMessage =
            "One or more locations could not be found. Please check the addresses.";
          break;
        case "OVER_QUERY_LIMIT":
          errorMessage = "Too many requests. Please try again later.";
          break;
        case "REQUEST_DENIED":
          errorMessage =
            "Route request was denied. Please check your API key.";
          break;
        case "INVALID_REQUEST":
          errorMessage =
            "Invalid route request. Please check the addresses.";
          break;
        default:
          errorMessage = "An unexpected error occurred. Please try again.";
          break;
      }
      setError(errorMessage);
      setDirections([]);
      setWeatherInfo(null);
      setTransitData(null);
      setTransitPolylines([]);
    }
    setLoading(false);
    setShouldRequestDirections(false);
  }, [selectedSource, selectedDestination]);

  const fetchTransit = async () => {
    if (!selectedSource || !selectedDestination) return;
    setLoadingTransit(true);
    setTransitData(null);
    setTransitPolylines([]);
    setTransitError('');
    try {
      if (!window.google?.maps?.DirectionsService) throw new Error('Google Maps not ready');
      // Resolve to coordinates to avoid ambiguous text like 'beng'
      const [origLatLng, destLatLng] = await Promise.all([
        geocodeToLatLng(selectedSource),
        geocodeToLatLng(selectedDestination)
      ]);
      const svc = new window.google.maps.DirectionsService();
      const req = {
        origin: origLatLng,
        destination: destLatLng,
        travelMode: 'TRANSIT',
        transitOptions: {
          modes: ['BUS', 'SUBWAY', 'TRAIN', 'TRAM', 'RAIL'],
          departureTime: new Date()
        },
        provideRouteAlternatives: true,
        region: 'IN'
      };
      console.log('[Transit][Directions][Request]', req);
      const td = await new Promise((resolve, reject) => {
        svc.route(req, (response, s) => {
          console.log('[Transit][Directions][Response]', { status: s, response });
          if (s === 'OK') resolve(response);
          else reject(s);
        });
      });

      // Normalize DirectionsResult into a lightweight POJO for rendering
      const normRoutes = (td?.routes || []).map(r => {
        const leg = (r.legs && r.legs[0]) || null;
        const steps = (leg?.steps || []).map(st => {
          const t = st.transit || st.transit_details || {};
          const line = t.line || {};
          const vehicle = line.vehicle || {};
          const depStop = t.departureStop || t.departure_stop || {};
          const arrStop = t.arrivalStop || t.arrival_stop || {};
          const depTime = t.departureTime || t.departure_time || {};
          const arrTime = t.arrivalTime || t.arrival_time || {};
          return {
            travel_mode: st.travel_mode,
            html_instructions: st.html_instructions,
            polyline: { points: st.polyline?.points },
            transit_details: t && (t.line || t.departureStop || t.departure_stop) ? {
              line: {
                name: line.name,
                short_name: line.short_name || line.shortName,
                vehicle: { type: vehicle.type }
              },
              departure_stop: { name: depStop.name },
              arrival_stop: { name: arrStop.name },
              departure_time: { text: depTime.text },
              arrival_time: { text: arrTime.text }
            } : null
          };
        });
        return {
          legs: [{
            distance: { text: leg?.distance?.text },
            duration: { text: leg?.duration?.text },
            departure_time: leg?.departure_time ? { text: leg.departure_time.text } : null,
            arrival_time: leg?.arrival_time ? { text: leg.arrival_time.text } : null,
            steps
          }]
        };
      });

      const transitUi = { routes: normRoutes };
      setTransitData(transitUi);

      const paths = [];
      const tdRoute = transitUi?.routes?.[0];
      const tdLeg = tdRoute?.legs?.[0];
      const tdSteps = tdLeg?.steps || [];
      tdSteps.forEach(step => {
        const pts = step?.polyline?.points;
        if (pts) paths.push(decodePolyline(pts));
      });
      setTransitPolylines(paths);
    } catch (e) {
      console.error('Transit fetch error:', e);
      setTransitData(null);
      setTransitPolylines([]);
      const message = String(e || '');
      if (message.includes('NOT_FOUND')) {
        setTransitError('No transit route found for these locations/time. Try more specific addresses.');
      } else if (message.includes('MAX_ROUTE_LENGTH_EXCEEDED')) {
        setTransitError('Transit route too long for a single request. Try closer locations or a shorter segment.');
      } else if (message === 'Google Maps not ready') {
        setTransitError('Google Maps is still loading. Please try again in a moment.');
      } else {
        setTransitError('Failed to load transit directions. Please try again.');
      }
    } finally {
      setLoadingTransit(false);
    }
  };

  // Wrapper to call hook with a selected route
  const handleFindAccidentZones = async () => {
    const route = selectedRoute || directions[0] || null;
    if (!route) {
      setError("Please compute a route first");
      return;
    }
    try {
      await findAccidentZones(route);
    } catch (err) {
      console.error('Error finding accident zones:', err);
      setError('Failed to find accident zones. Please try again.');
    }
  };

  // Form and navigation handlers
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSource || !selectedDestination) {
      setError("Please enter both source and destination");
      return;
    }
    setLoading(true);
    setDirections([]);
    setTransitData(null);
    setTransitPolylines([]);
    setLoadingTransit(false);
    setShowParkingInfo(false);
    // Clear any existing error
    setError("");
    setShouldRequestDirections(true);
  };

  const addWaypoint = (location) => {
    setWaypoints([
      ...waypoints,
      {
        location: `${location}, India`,
        stopover: true,
      },
    ]);
    setWaypointInput("");
  };

  const getCurrentLocation = async () => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Wait for Google Maps to be loaded
      if (!window.google?.maps?.Geocoder) {
        setError("Google Maps is still loading. Please try again.");
        return;
      }

      const geocoder = new window.google.maps.Geocoder();
      const result = await new Promise((resolve, reject) => {
        geocoder.geocode({
          location: { lat: latitude, lng: longitude }
        }, (results, status) => {
          if (status === 'OK' && results && results.length > 0) {
            resolve(results);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });

      if (result[0]) {
        setSelectedSource(result[0].formatted_address);
        setUseCurrentLocation(true);
      }
    } catch (error) {
      setError(
        "Could not get current location. Please check your GPS settings."
      );
      console.error("Error getting current location:", error);
    }
  };

  const handleStartNavigation = (routeIndex) => {
    const route = directions[routeIndex];
    if (!route) return;

    setSelectedRoute(route);
    setNavigating(true);
    setCurrentStep(0);

    // Fixed: Access first step correctly
    const steps = route.legs && route.legs[0]?.steps;

    if (steps && steps.length > 0) {
      const firstStep = steps[0];
      setNextInstruction(firstStep.instructions || '');
      setDistanceToNext((firstStep.distance && firstStep.distance.text) || '');
    } else {
      setNextInstruction('');
      setDistanceToNext('');
    }

    // Fixed: Access duration correctly
    const durationText = route.legs && route.legs[0]?.duration?.text;
    setEstimatedTime(durationText || '');

    startTracking(route, {
      setCurrentStep,
      setNextInstruction,
      setDistanceToNext,
      setEstimatedTime,
      currentStep
    });
  };

  const handleStopNavigation = () => {
    stopTracking();
    setNavigating(false);
    setSelectedRoute(null);
    setCurrentStep(0);
    setNextInstruction("");
    setDistanceToNext("");
    setEstimatedTime("");
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion, field) => {
    if (field === 'source') {
      setSelectedSource(suggestion.description);
    } else if (field === 'destination') {
      setSelectedDestination(suggestion.description);
    } else if (field === 'waypoint') {
      setWaypointInput(suggestion.description);
    }
    clearSuggestions();
  };

  // Enhanced parking handler with better error handling
  const handleFindParking = async () => {
    if (!selectedDestination) {
      setError("Please enter a destination first");
      return;
    }

    if (!isGoogleLoaded) {
      setError("Google Maps is still loading. Please wait a moment and try again.");
      return;
    }

    try {
      await findParkingSpots();
    } catch (error) {
      console.error('Error finding parking:', error);
      setError("Failed to find parking spots. Please try again.");
    }
  };

  // EV stations handler
  const handleFindEvStations = async () => {
    if (!selectedDestination && directions.length === 0) {
      setError("Please enter a destination or compute a route first");
      return;
    }

    if (!isGoogleLoaded) {
      setError("Google Maps is still loading. Please wait a moment and try again.");
      return;
    }

    try {
      const routeForSearch = selectedRoute || directions[0] || null;
      await findEvStations(routeForSearch);
    } catch (error) {
      console.error('Error finding EV stations:', error);
      setError("Failed to find EV charging stations. Please try again.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50">
      <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
        Best Route Finder
      </h2>

      <RouteForm
        selectedSource={selectedSource}
        setSelectedSource={setSelectedSource}
        selectedDestination={selectedDestination}
        setSelectedDestination={setSelectedDestination}
        waypointInput={waypointInput}
        setWaypointInput={setWaypointInput}
        waypoints={waypoints}
        setWaypoints={setWaypoints}
        selectedMode={selectedMode}
        setSelectedMode={setSelectedMode}
        parkingRadius={parkingRadius}
        setParkingRadius={setParkingRadius}
        evRadius={evRadius}
        setEvRadius={setEvRadius}
        loading={loading}
        loadingParkingInfo={loadingParkingInfo}
        loadingEvInfo={loadingEvInfo}
        loadingAccidents={loadingAccidents}
        useCurrentLocation={useCurrentLocation}
        setUseCurrentLocation={setUseCurrentLocation}
        suggestions={suggestions}
        isLoadingSuggestions={isLoadingSuggestions}
        isGoogleLoaded={isGoogleLoaded}
        travelModes={travelModes}
        onSubmit={handleSubmit}
        onAddWaypoint={addWaypoint}
        onGetCurrentLocation={getCurrentLocation}
        onFindParking={handleFindParking}
        onFindEvStations={handleFindEvStations}
        onFindAccidents={handleFindAccidentZones}
        onSuggestionSearch={getSuggestions}
        onSuggestionSelect={handleSuggestionSelect}
        clearSuggestions={clearSuggestions}
        onFetchTransit={fetchTransit}
        loadingTransit={loadingTransit}
      />

      {error && (
        <div className="text-red-600 text-center mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-lg">
        <LoadScript
          googleMapsApiKey={GOOGLE_MAPS_API_KEY}
          libraries={LIBRARIES}
          onLoad={() => setMapsReady(true)}
        >
          <MapContainer
            mapContainerStyle={mapContainerStyle}
            center={currentPosition || center}
            isTracking={isTracking}
            heading={heading}
            currentPosition={currentPosition}
            arrowIcon={arrowIcon}
            directions={directions}
            selectedRoute={selectedRoute}
            routeLabels={routeLabels}
            selectedSource={selectedSource}
            selectedDestination={selectedDestination}
            selectedMode={selectedMode}
            waypoints={waypoints}
            directionsCallback={directionsCallback}
            shouldRequestDirections={shouldRequestDirections}
            transitPolylines={transitPolylines}
            parkingSpots={parkingSpots}
            showParkingInfo={showParkingInfo}
            selectedParkingSpot={selectedParkingSpot}
            setSelectedParkingSpot={setSelectedParkingSpot}
            getParkingIcon={getParkingIcon}
            formatDistance={formatDistance}
            getPriceLevelText={getPriceLevelText}
            evStations={evStations}
            showEvInfo={showEvInfo}
            selectedEvStation={selectedEvStation}
            setSelectedEvStation={setSelectedEvStation}
            getEvIcon={getEvIcon}
            formatEvDistance={evFormatDistance}
            accidentZones={accidentZones}
            showAccidentInfo={showAccidentInfo}
            setShowAccidentInfo={setShowAccidentInfo}
            selectedAccidentZone={selectedAccidentZone}
            setSelectedAccidentZone={setSelectedAccidentZone}
            mapRef={mapRef}
            isGoogleLoaded={isGoogleLoaded}
          />
        </LoadScript>
      </div>

      {isTracking && !followMode && (
        <RecenterButton
          onClick={() => {
            setFollowMode(true);
            if (currentPosition && mapRef.current) {
              mapRef.current.panTo(currentPosition);
            }
          }}
        />
      )}

      <ParkingPanel
        showParkingInfo={showParkingInfo}
        parkingSpots={parkingSpots}
        parkingRadius={parkingRadius}
        selectedParkingSpot={selectedParkingSpot}
        onClose={() => setShowParkingInfo(false)}
        onSelectSpot={setSelectedParkingSpot}
        onViewOnMap={(spot) => {
          if (mapRef.current) {
            mapRef.current.panTo(spot.location);
            mapRef.current.setZoom(16);
          }
        }}
        formatDistance={formatDistance}
        getPriceLevelText={getPriceLevelText}
      />

      <RouteResults
        directions={directions}
        routeLabels={routeLabels}
        trafficInfo={trafficInfo}
        weatherInfo={weatherInfo}
        isTracking={isTracking}
        selectedRoute={selectedRoute}
        locationPermission={locationPermission}
        onStartNavigation={handleStartNavigation}
        onStopNavigation={handleStopNavigation}
        onRequestLocationPermission={requestLocationPermission}
        transitData={transitData}
        onFetchTransit={fetchTransit}
        loadingTransit={loadingTransit}
        transitError={transitError}
      />

      {/* Enhanced Transit Results Display */}
      <TransitResultsCard
        transitData={transitData}
        loadingTransit={loadingTransit}
        transitError={transitError}
        onFetchTransit={fetchTransit}
      />

      {/* Accident warnings banner */}
      {showAccidentInfo && accidentWarnings.length > 0 && (
        <div className="mt-4 p-4 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800">
          <div className="font-semibold mb-1">⚠️ Accident zones on your route:</div>
          <ul className="list-disc list-inside text-sm">
            {accidentWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {weatherInfo && <WeatherCard weatherInfo={weatherInfo} />}

      {navigating && (
        <NavigationOverlay
          instruction={nextInstruction}
          distance={distanceToNext}
          time={estimatedTime}
          onClose={handleStopNavigation}
        />
      )}

      {locationPermission === "prompt" && (
        <LocationPrompt onAccept={requestLocationPermission} />
      )}
    </div>
  );
};

export default BestRoute;