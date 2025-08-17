import React from 'react';
import { GoogleMap, DirectionsService, DirectionsRenderer, Marker, InfoWindow } from '@react-google-maps/api';

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
  parkingSpots,
  showParkingInfo,
  selectedParkingSpot,
  setSelectedParkingSpot,
  getParkingIcon,
  formatDistance,
  getPriceLevelText,
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
      {/* Directions Service */}
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

      {/* Parking Spot Markers */}
      {showParkingInfo && parkingSpots.map((spot) => (
        <Marker
          key={spot.id}
          position={spot.location}
          icon={isGoogleLoaded && window.google?.maps ? getParkingIcon() : undefined}
          onClick={() => setSelectedParkingSpot(spot)}
        />
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
    </GoogleMap>
  );
};

export default MapContainer;