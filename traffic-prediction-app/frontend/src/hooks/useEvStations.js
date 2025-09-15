import { useState, useCallback, useRef } from 'react';

// Finds EV charging stations near a destination or along a given route
// Requires Google Maps JS API with places and geometry libraries loaded
const useEvStations = (selectedDestination, mapRef) => {
	const [evStations, setEvStations] = useState([]);
	const [showEvInfo, setShowEvInfo] = useState(false);
	const [loadingEvInfo, setLoadingEvInfo] = useState(false);
	const [selectedEvStation, setSelectedEvStation] = useState(null);
	const [evRadius, setEvRadius] = useState(1000);

	const placesService = useRef(null);

	const geocodeAddress = async (address) => {
		const geocoder = new window.google.maps.Geocoder();
		return new Promise((resolve, reject) => {
			geocoder.geocode({ address }, (results, status) => {
				if (status === 'OK' && results && results.length > 0) {
					resolve(results[0]);
				} else {
					reject(new Error(`Geocoding failed: ${status}`));
				}
			});
		});
	};

	const ensurePlacesService = () => {
		if (!placesService.current && mapRef.current) {
			placesService.current = new window.google.maps.places.PlacesService(mapRef.current);
		}
		return placesService.current;
	};

	const nearbyEvSearch = (location, radius) => {
		return new Promise((resolve) => {
			ensurePlacesService();
			if (!placesService.current) {
				resolve([]);
				return;
			}
			const request = {
				location,
				radius,
				keyword: 'electric vehicle charging station',
				type: 'charging_station'
			};
			placesService.current.nearbySearch(request, (results, status) => {
				if (status === window.google.maps.places.PlacesServiceStatus.OK) {
					resolve(results || []);
				} else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
					resolve([]);
				} else {
					resolve([]);
				}
			});
		});
	};

	const getPlaceDetails = (placeId) => {
		return new Promise((resolve) => {
			ensurePlacesService();
			if (!placesService.current) {
				resolve(null);
				return;
			}
			placesService.current.getDetails({
				placeId,
				fields: [
					'name',
					'formatted_address',
					'geometry',
					'rating',
					'user_ratings_total',
					'opening_hours',
					'photos'
				]
			}, (result, status) => {
				if (status === window.google.maps.places.PlacesServiceStatus.OK) {
					resolve(result);
				} else {
					resolve(null);
				}
			});
		});
	};

	// Sample points along a route's overview path to search nearby
	const sampleRoutePoints = (route, step = 10) => {
		const points = [];
		try {
			const path = route?.overview_path || [];
			for (let i = 0; i < path.length; i += step) {
				points.push(path[i]);
			}
			// Always include last point
			if (path.length > 0) points.push(path[path.length - 1]);
		} catch (e) {
			return points;
		}
		return points;
	};

	const findEvStations = useCallback(async (route) => {
		if (!window.google?.maps?.places || !window.google?.maps?.geometry) {
			console.log('Google Places/Geometry API not loaded');
			return;
		}

		setLoadingEvInfo(true);
		setEvStations([]);
		setSelectedEvStation(null);

		try {
			// Ensure Places Service exists
			ensurePlacesService();
			if (!placesService.current) {
				await new Promise(res => setTimeout(res, 400));
				ensurePlacesService();
			}

			let anchorLocations = [];
			if (route) {
				// Sample along route
				anchorLocations = sampleRoutePoints(route, 15);
			} else if (selectedDestination) {
				// Fallback: near destination
				try {
					const g = await geocodeAddress(selectedDestination);
					if (g?.geometry?.location) anchorLocations = [g.geometry.location];
				} catch (e) {}
			}

			if (anchorLocations.length === 0) {
				setShowEvInfo(true);
				setLoadingEvInfo(false);
				return;
			}

			// Perform nearby searches around anchor points and merge unique results by place_id
			const resultsPerPoint = await Promise.all(
				anchorLocations.map(pt => nearbyEvSearch(pt, evRadius))
			);
			const mergedById = new Map();
			resultsPerPoint.flat().forEach((place) => {
				if (!place?.place_id) return;
				if (!mergedById.has(place.place_id)) mergedById.set(place.place_id, place);
			});

			const basicPlaces = Array.from(mergedById.values());
			if (basicPlaces.length === 0) {
				setEvStations([]);
				setShowEvInfo(true);
				setLoadingEvInfo(false);
				return;
			}

			// Enrich with details and compute min distance to route polyline
			const routePath = route?.overview_path || [];
			const detailed = await Promise.all(basicPlaces.slice(0, 20).map(async (place) => {
				const hasValidLoc = place?.geometry?.location && typeof place.geometry.location.lat === 'function';
				if (!hasValidLoc) return null;
				const details = await getPlaceDetails(place.place_id);
				const loc = {
					lat: place.geometry.location.lat(),
					lng: place.geometry.location.lng()
				};
				let distanceToRoute = null;
				try {
					if (routePath.length > 0) {
						const to = new window.google.maps.LatLng(loc.lat, loc.lng);
						let min = Number.POSITIVE_INFINITY;
						for (let i = 1; i < routePath.length; i++) {
							const segStart = routePath[i - 1];
							const segEnd = routePath[i];
							const d = window.google.maps.geometry.spherical.computeDistanceBetween(to, segStart) + window.google.maps.geometry.spherical.computeDistanceBetween(to, segEnd);
							if (d < min) min = d;
						}
						distanceToRoute = isFinite(min) ? min : null;
					}
				} catch (e) {}

				return {
					id: place.place_id,
					name: details?.name || place.name || 'EV Charging Station',
					address: details?.formatted_address || place.vicinity || 'Address not available',
					location: loc,
					rating: details?.rating ?? place.rating ?? 0,
					totalRatings: details?.user_ratings_total ?? place.user_ratings_total ?? 0,
					isOpen: details?.opening_hours?.isOpen?.() ?? null,
					distanceToRoute
				};
			}));

			const valid = detailed.filter(Boolean).sort((a, b) => (a.distanceToRoute ?? Infinity) - (b.distanceToRoute ?? Infinity));
			setEvStations(valid);
			setShowEvInfo(true);
		} catch (err) {
			console.error('Error finding EV stations:', err);
			setEvStations([]);
			setShowEvInfo(false);
		} finally {
			setLoadingEvInfo(false);
		}
	}, [selectedDestination, evRadius]);

	const getEvIcon = () => {
		if (!window.google?.maps?.Size) return null;
		return {
			url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
				<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
					<circle cx="16" cy="16" r="15" fill="#059669" stroke="white" stroke-width="2"/>
					<path d="M14 7l6 8h-4l2 10-6-8h4l-2-10z" fill="white"/>
				</svg>
			`),
			scaledSize: new window.google.maps.Size(32, 32)
		};
	};

	const formatDistance = (distance) => {
		if (!distance || isNaN(distance)) return 'Distance unavailable';
		if (distance < 1000) return `${Math.round(distance)}m`;
		return `${(distance / 1000).toFixed(1)}km`;
	};

	return {
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
		formatDistance
	};
};

export default useEvStations;


