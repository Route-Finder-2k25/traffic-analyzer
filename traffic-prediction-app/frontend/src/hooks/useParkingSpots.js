import { useState, useCallback, useRef } from 'react';

const useParkingSpots = (selectedDestination, mapRef) => {
  const [parkingSpots, setParkingSpots] = useState([]);
  const [showParkingInfo, setShowParkingInfo] = useState(false);
  const [loadingParkingInfo, setLoadingParkingInfo] = useState(false);
  const [selectedParkingSpot, setSelectedParkingSpot] = useState(null);
  const [parkingRadius, setParkingRadius] = useState(500);

  const placesService = useRef(null);

  const findParkingSpots = useCallback(async () => {
    if (!selectedDestination || !window.google?.maps?.places) {
      console.log('Missing destination or Google Places API not loaded');
      return;
    }

    setLoadingParkingInfo(true);
    setParkingSpots([]);
    setSelectedParkingSpot(null);

    try {
      // First, geocode the destination to get coordinates
      const geocoder = new window.google.maps.Geocoder();
      let geocodeResults;
      
      try {
        geocodeResults = await new Promise((resolve, reject) => {
          geocoder.geocode({ address: selectedDestination }, (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              resolve(results);
            } else {
              reject(new Error(`Geocoding failed: ${status}`));
            }
          });
        });
      } catch (err) {
        console.error('Geocoding error:', err);
        setLoadingParkingInfo(false);
        return;
      }

      // Fixed: Access the first result correctly
      const firstResult = geocodeResults[0];
      if (!firstResult?.geometry?.location) {
        console.error('No valid geocoding result');
        setLoadingParkingInfo(false);
        return;
      }

      const destinationLocation = firstResult.geometry.location;

      // Create PlacesService if not exists - ensure map is ready
      if (!placesService.current && mapRef.current) {
        placesService.current = new window.google.maps.places.PlacesService(mapRef.current);
      }

      // Wait a bit for map to be ready if service creation failed
      if (!placesService.current) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (mapRef.current) {
          placesService.current = new window.google.maps.places.PlacesService(mapRef.current);
        }
      }

      if (!placesService.current) {
        console.error('Could not create Places service');
        setLoadingParkingInfo(false);
        return;
      }

      // Search for parking spots
      const request = {
        location: destinationLocation,
        radius: parkingRadius,
        keyword: 'parking', // Changed from type to keyword for better results
        type: 'parking'
      };

      let searchResults;
      try {
        searchResults = await new Promise((resolve, reject) => {
          placesService.current.nearbySearch(request, (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
              resolve(results || []);
            } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              resolve([]); // No results is not an error
            } else {
              reject(new Error(`Places search failed: ${status}`));
            }
          });
        });
      } catch (err) {
        console.error('Places search error:', err);
        
        // Try alternative search with different parameters
        try {
          const alternativeRequest = {
            location: destinationLocation,
            radius: parkingRadius * 2, // Larger radius
            keyword: 'parking lot OR parking garage OR car park'
          };
          
          searchResults = await new Promise((resolve, reject) => {
            placesService.current.textSearch(alternativeRequest, (results, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                resolve(results || []);
              } else {
                resolve([]); // Give up gracefully
              }
            });
          });
        } catch (altErr) {
          console.error('Alternative search also failed:', altErr);
          searchResults = [];
        }
      }

      if (!searchResults || searchResults.length === 0) {
        console.log('No parking spots found');
        setParkingSpots([]);
        setShowParkingInfo(true); // Still show the panel with "no results" message
        setLoadingParkingInfo(false);
        return;
      }

      // Get detailed information for each parking spot
      const detailedParkingSpots = await Promise.all(
        searchResults.slice(0, 10).map(async (place) => {
          // Enhanced validation for place geometry
          const hasValidLocation = 
            place?.geometry?.location &&
            typeof place.geometry.location.lat === 'function' &&
            typeof place.geometry.location.lng === 'function';

          if (!hasValidLocation) {
            console.warn('Skipping place with invalid location:', place?.name);
            return null;
          }

          try {
            const details = await new Promise((resolve) => {
              placesService.current.getDetails({
                placeId: place.place_id,
                fields: [
                  'name',
                  'formatted_address',
                  'geometry',
                  'rating',
                  'user_ratings_total',
                  'opening_hours',
                  'price_level',
                  'photos',
                  'reviews',
                ],
              }, (result, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                  resolve(result);
                } else {
                  console.warn('Failed to get place details:', status);
                  resolve(null);
                }
              });
            });

            const placeLocation = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };

            return {
              id: place.place_id,
              name: place.name || 'Parking Area',
              address: place.vicinity || place.formatted_address || details?.formatted_address || 'Address not available',
              location: placeLocation,
              rating: place.rating || details?.rating || 0,
              totalRatings: place.user_ratings_total || details?.user_ratings_total || 0,
              priceLevel: place.price_level ?? details?.price_level,
              openingHours: details?.opening_hours?.weekday_text || [],
              isOpen: details?.opening_hours?.isOpen?.() ?? null,
              photos: place.photos || details?.photos || [],
              distance: window.google.maps.geometry.spherical.computeDistanceBetween(
                destinationLocation,
                new window.google.maps.LatLng(placeLocation.lat, placeLocation.lng)
              ),
            };
          } catch (error) {
            console.warn('Error getting place details:', error);
            // Return basic info even if details fail
            const placeLocation = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };
            
            return {
              id: place.place_id,
              name: place.name || 'Parking Area',
              address: place.vicinity || 'Address not available',
              location: placeLocation,
              rating: place.rating || 0,
              totalRatings: place.user_ratings_total || 0,
              priceLevel: place.price_level,
              distance: window.google.maps.geometry.spherical.computeDistanceBetween(
                destinationLocation,
                new window.google.maps.LatLng(placeLocation.lat, placeLocation.lng)
              ),
            };
          }
        })
      );

      // Filter out null results and sort by distance
      const validParkingSpots = detailedParkingSpots
        .filter(spot => spot !== null)
        .sort((a, b) => a.distance - b.distance);

      console.log(`Found ${validParkingSpots.length} valid parking spots`);
      setParkingSpots(validParkingSpots);
      setShowParkingInfo(true);
      
    } catch (error) {
      console.error('Error finding parking spots:', error);
      setParkingSpots([]);
      setShowParkingInfo(false);
    } finally {
      setLoadingParkingInfo(false);
    }
  }, [selectedDestination, parkingRadius]);

  // Get price level description
  const getPriceLevelText = (priceLevel) => {
    if (priceLevel === undefined || priceLevel === null) return 'Price not available';
    const levels = ['Free', 'Inexpensive', 'Moderate', 'Expensive', 'Very Expensive'];
    return levels[priceLevel] || 'Price not available';
  };

  // Format distance
  const formatDistance = (distance) => {
    if (!distance || isNaN(distance)) return 'Distance unavailable';
    
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  };

  // Parking marker icon
  const getParkingIcon = () => {
    if (!window.google?.maps?.Size) {
      return null; // Fallback if Google Maps not loaded
    }
    
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="15" fill="#1E40AF" stroke="white" stroke-width="2"/>
          <text x="16" y="22" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="bold">P</text>
        </svg>
      `),
      scaledSize: new window.google.maps.Size(32, 32),
    };
  };

  return {
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
    getPriceLevelText,
  };
};

export default useParkingSpots;