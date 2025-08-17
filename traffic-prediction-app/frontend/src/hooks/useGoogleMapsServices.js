import { useState, useCallback, useRef, useEffect } from 'react';

const useGoogleMapsServices = () => {
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const autocompleteService = useRef(null);

  // Better Google Maps API loading detection
  useEffect(() => {
    const checkGoogleMapsLoaded = () => {
      if (window.google?.maps?.places?.AutocompleteService) {
        setIsGoogleLoaded(true);
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        return true;
      }
      return false;
    };

    // Check immediately
    if (!checkGoogleMapsLoaded()) {
      // If not loaded, set up an interval to check periodically
      const interval = setInterval(() => {
        if (checkGoogleMapsLoaded()) {
          clearInterval(interval);
        }
      }, 100);

      // Clean up interval after 10 seconds to avoid infinite checking
      setTimeout(() => clearInterval(interval), 10000);

      return () => clearInterval(interval);
    }
  }, []);

  const getSuggestions = useCallback(async (input) => {
    if (!input || input.length < 2) {
      setSuggestions([]);
      return;
    }

    if (!isGoogleLoaded || !autocompleteService.current) {
      console.log('Google Places API not ready yet');
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      const response = await new Promise((resolve, reject) => {
        autocompleteService.current.getPlacePredictions(
          {
            input: input.trim(),
            componentRestrictions: { country: 'in' },
            types: ['geocode', 'establishment'] // Added establishment for more results
          },
          (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
              resolve(results);
            } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              resolve([]); // No results is not an error
            } else {
              reject(status);
            }
          }
        );
      });

      setSuggestions(response || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [isGoogleLoaded]);

  // Clear suggestions function
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    isGoogleLoaded,
    suggestions,
    isLoadingSuggestions,
    getSuggestions,
    setSuggestions,
    clearSuggestions
  };
};

export default useGoogleMapsServices;