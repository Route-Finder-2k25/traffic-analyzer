import React from 'react';
import { GoogleMap, DirectionsService, DirectionsRenderer, Marker, InfoWindow, Polyline } from '@react-google-maps/api';

const MapContainer = ({
  mapContainerStyle,
  center,
  isTracking,
  heading,
  currentPosition,
  arrowIcon,
  directions,
  selectedRoute,
  routeLabels,
  selectedSource,
  selectedDestination,
  selectedMode,
  waypoints,
  directionsCallback,
  shouldRequestDirections,
  transitPolylines,
  parkingSpots,
  showParkingInfo,
  selectedParkingSpot,
  setSelectedParkingSpot,
  getParkingIcon,
  formatDistance,
  getPriceLevelText,
  evStations,
  showEvInfo,
  selectedEvStation,
  setSelectedEvStation,
  getEvIcon,
  formatEvDistance,
  accidentZones,
  showAccidentInfo,
  setShowAccidentInfo,
  selectedAccidentZone,
  setSelectedAccidentZone,
  mapRef,
  isGoogleLoaded
}) => {
  return (
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
      {/* Floating Legend */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}>
        <div className="rounded-lg bg-white/95 backdrop-blur border border-gray-200 shadow px-3 py-2 text-xs text-gray-700">
          <div className="font-semibold text-gray-900 mb-1">Legend</div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block h-2 w-2 rounded-full bg-indigo-600"></span>
            <span>Route 1</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-600"></span>
            <span>Route 2</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block h-2 w-2 rounded-full bg-rose-600"></span>
            <span>Route 3</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-yellow-500"></span>
            <span>Accident (near)</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-block h-2 w-2 rounded-full bg-red-600"></span>
            <span>Accident (on route)</span>
          </div>
        </div>
      </div>
      {/* Directions Service */}
      {selectedSource && selectedDestination && shouldRequestDirections && !directions.length && (
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

      {/* Directions Renderer */}
      {directions.map((route, index) => (
        <React.Fragment key={index}>
          {(!isTracking || (isTracking && selectedRoute === route)) && (
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
          )}
        </React.Fragment>
      ))}

      {/* Transit Polylines */}
      {transitPolylines && transitPolylines.map((path, idx) => (
        <Polyline
          key={`transit-${idx}`}
          path={path}
          options={{
            strokeColor: '#2563EB',
            strokeOpacity: 0.8,
            strokeWeight: 4,
            zIndex: 1,
          }}
        />
      ))}

      {/* Parking Spot Markers */}
      {showParkingInfo && parkingSpots.map((spot) => (
        <Marker
          key={spot.id}
          position={spot.location}
          icon={isGoogleLoaded && window.google?.maps ? getParkingIcon() : undefined}
          onClick={() => setSelectedParkingSpot(spot)}
        />
      ))}

      {/* EV Charging Station Markers */}
      {showEvInfo && evStations && evStations.map((st) => (
        <Marker
          key={st.id}
          position={st.location}
          icon={isGoogleLoaded && window.google?.maps ? getEvIcon() : undefined}
          onClick={() => setSelectedEvStation(st)}
        />
      ))}

      {/* Accident Zone Markers */}
      {showAccidentInfo && accidentZones && accidentZones.map((az) => (
        <React.Fragment key={az.id}>
          <Marker
            position={az.location}
            icon={isGoogleLoaded && window.google?.maps ? {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: az.onRoute ? '#DC2626' : '#F59E0B',
              fillOpacity: 0.95,
              strokeColor: az.onRoute ? '#7F1D1D' : '#B45309',
              strokeWeight: 2
            } : undefined}
            title={`Accident Zone: ${az.name}`}
            onClick={() => setSelectedAccidentZone(az)}
          />
          {selectedAccidentZone && selectedAccidentZone.id === az.id && (
            <InfoWindow
              position={az.location}
              onCloseClick={() => setSelectedAccidentZone(null)}
            >
              <div className="max-w-xs">
                <h3 className="font-semibold text-lg mb-1">{az.name}</h3>
                {az.address && (
                  <p className="text-sm text-gray-600 mb-1">{az.address}</p>
                )}
                {typeof az.rating === 'number' && az.rating > 0 && (
                  <p className="text-sm mb-1">
                    <strong>Rating:</strong> ⭐ {az.rating.toFixed(1)} ({az.totalRatings} reviews)
                  </p>
                )}
                <p className={`text-sm font-medium ${az.onRoute ? 'text-red-700' : 'text-yellow-700'}`}>
                  {az.onRoute ? 'On your route' : 'Near your route'}
                </p>
              </div>
            </InfoWindow>
          )}
        </React.Fragment>
      ))}

      {/* Current Position Marker */}
      {currentPosition && arrowIcon && (
        <Marker
          position={currentPosition}
          icon={{
            ...arrowIcon,
            rotation: heading
          }}
        />
      )}

      {/* Info Window for Selected Parking Spot */}
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

      {/* Info Window for Selected EV Station */}
      {selectedEvStation && (
        <InfoWindow
          position={selectedEvStation.location}
          onCloseClick={() => setSelectedEvStation(null)}
        >
          <div className="max-w-xs">
            <h3 className="font-semibold text-lg mb-2">{selectedEvStation.name}</h3>
            <p className="text-sm text-gray-600 mb-2">{selectedEvStation.address}</p>
            {typeof selectedEvStation.distanceToRoute === 'number' && (
              <p className="text-sm mb-1">
                <strong>Offset:</strong> {formatEvDistance(selectedEvStation.distanceToRoute)} from route
              </p>
            )}
            {selectedEvStation.rating > 0 && (
              <p className="text-sm mb-1">
                <strong>Rating:</strong> ⭐ {selectedEvStation.rating.toFixed(1)} ({selectedEvStation.totalRatings} reviews)
              </p>
            )}
            {selectedEvStation.isOpen !== null && (
              <p className={`text-sm font-medium ${selectedEvStation.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                {selectedEvStation.isOpen ? 'Open Now' : 'Closed Now'}
              </p>
            )}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

export default MapContainer;