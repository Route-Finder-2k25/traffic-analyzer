import { useState, useCallback } from 'react';

const useAccidentZones = (isMapsReady, mapRef) => {
  const [accidentZones, setAccidentZones] = useState([]);
  const [showAccidentInfo, setShowAccidentInfo] = useState(false);
  const [loadingAccidents, setLoadingAccidents] = useState(false);
  const [accidentWarnings, setAccidentWarnings] = useState([]);

  const findAccidentZones = useCallback(async (routeForSearch) => {
    if (!isMapsReady) {
      throw new Error('Google Maps is still loading');
    }
    if (!mapRef?.current || !window.google?.maps) {
      throw new Error('Map is not ready yet');
    }

    setLoadingAccidents(true);
    setShowAccidentInfo(true);
    setAccidentWarnings([]);

    try {
      const route = routeForSearch;
      const path = route?.overview_path || (route?.overviewPolyline && route.overviewPolyline.path) || [];
      if (!path || path.length === 0) {
        setLoadingAccidents(false);
        return;
      }

      const polyline = new window.google.maps.Polyline({ path });
      const service = new window.google.maps.places.PlacesService(mapRef.current);

      const nearbyAtPoint = (latLng) => new Promise((resolve) => {
        const request = {
          location: latLng,
          radius: 1500,
          keyword: 'accident OR crash OR collision OR accident prone OR black spot'
        };
        service.nearbySearch(request, (results, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            resolve(results);
          } else {
            resolve([]);
          }
        });
      });

      const sampleStep = Math.max(1, Math.floor(path.length / 25));
      const samples = path.filter((_, idx) => idx % sampleStep === 0);
      const batches = await Promise.all(samples.map((pt) => nearbyAtPoint(pt)));
      const flat = batches.flat();

      const uniqueById = new Map();
      for (const place of flat) {
        if (place.place_id && !uniqueById.has(place.place_id)) {
          uniqueById.set(place.place_id, place);
        }
      }

      const tolerance = 1e-3; // ~100m
      const zones = Array.from(uniqueById.values()).map((p) => {
        const loc = p.geometry?.location;
        const latLng = loc ? new window.google.maps.LatLng(loc.lat(), loc.lng()) : null;
        const onRoute = latLng ? window.google.maps.geometry.poly.isLocationOnEdge(latLng, polyline, tolerance) : false;
        return {
          id: p.place_id,
          name: p.name,
          address: p.vicinity || p.formatted_address || '',
          location: latLng ? { lat: latLng.lat(), lng: latLng.lng() } : null,
          rating: typeof p.rating === 'number' ? p.rating : 0,
          totalRatings: typeof p.user_ratings_total === 'number' ? p.user_ratings_total : 0,
          onRoute
        };
      }).filter((z) => z.location);

      setAccidentZones(zones);
      const warnings = zones.filter((z) => z.onRoute).slice(0, 5).map((z) => `${z.name}`);
      setAccidentWarnings(warnings);
    } finally {
      setLoadingAccidents(false);
    }
  }, [isMapsReady, mapRef]);

  return {
    accidentZones,
    showAccidentInfo,
    setShowAccidentInfo,
    loadingAccidents,
    accidentWarnings,
    findAccidentZones
  };
};

export default useAccidentZones;


