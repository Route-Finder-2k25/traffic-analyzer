export { };

export async function getTransitDirections(origin, destination) {
  const { GOOGLE_MAPS_API_KEY } = await import('../config');
  const params = new URLSearchParams({
    origin,
    destination,
    mode: 'transit',
    transit_mode: 'bus|train',
    departure_time: 'now',
    key: GOOGLE_MAPS_API_KEY
  });

  const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;
  const response = await fetch(url);
  console.log(response);
  if (!response.ok) {
    throw new Error(`Transit directions request failed: ${response.status}`);
  }
  const data = await response.json();
  return data;
}

// Polyline decoder (Google Encoded Polyline Algorithm Format)
export function decodePolyline(encoded) {
  if (!encoded) return [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  const coordinates = [];

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return coordinates;
}
