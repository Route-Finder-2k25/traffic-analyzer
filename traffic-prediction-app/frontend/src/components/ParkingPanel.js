import React from 'react';

const ParkingPanel = ({
  showParkingInfo,
  parkingSpots,
  parkingRadius,
  selectedParkingSpot,
  onClose,
  onSelectSpot,
  onViewOnMap,
  formatDistance,
  getPriceLevelText
}) => {
  if (!showParkingInfo) return null;

  // Get price level color
  const getPriceLevelColor = (priceLevel) => {
    if (priceLevel === undefined || priceLevel === null) return 'text-gray-500';
    if (priceLevel === 0) return 'text-green-600';
    if (priceLevel <= 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get rating stars
  const getRatingStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <>
        {'★'.repeat(fullStars)}
        {hasHalfStar && '☆'}
        {'☆'.repeat(emptyStars)}
      </>
    );
  };

  return (
    <div className="mt-6 bg-white p-6 rounded-lg shadow-lg border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <span className="text-2xl">🅿️</span>
          Parking Near Destination
          <span className="text-sm font-normal text-gray-500">
            ({parkingSpots.length} found within {formatDistance(parkingRadius)})
          </span>
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
          aria-label="Close parking panel"
        >
          ✕
        </button>
      </div>
      
      {parkingSpots.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🅿️</div>
          <p className="text-gray-600 text-lg mb-2">
            No parking spots found
          </p>
          <p className="text-gray-500 text-sm">
            No parking spots found within {formatDistance(parkingRadius)} of your destination.
            Try increasing the search radius or searching in a different area.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {parkingSpots.map((spot) => (
            <div
              key={spot.id}
              className={`border rounded-lg p-4 transition-all cursor-pointer ${
                selectedParkingSpot?.id === spot.id
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
              onClick={() => onSelectSpot(spot)}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-lg leading-tight">{spot.name}</h4>
                {selectedParkingSpot?.id === spot.id && (
                  <span className="text-blue-600 text-sm">✓ Selected</span>
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{spot.address}</p>
              
              <div className="space-y-2 text-sm">
                {/* Distance */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 min-w-[60px]">📍 Distance:</span>
                  <span className="font-medium">{formatDistance(spot.distance)}</span>
                </div>
                
                {/* Rating */}
                {spot.rating > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 min-w-[60px]">⭐ Rating:</span>
                    <span className="text-yellow-600">
                      {getRatingStars(spot.rating)}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {spot.rating.toFixed(1)} ({spot.totalRatings || 0})
                    </span>
                  </div>
                )}
                
                {/* Price */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 min-w-[60px]">💰 Price:</span>
                  <span className={`font-medium ${getPriceLevelColor(spot.priceLevel)}`}>
                    {getPriceLevelText(spot.priceLevel)}
                  </span>
                </div>
                
                {/* Open/Closed Status */}
                {spot.isOpen !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 min-w-[60px]">🕒 Status:</span>
                    <span className={`font-medium flex items-center gap-1 ${
                      spot.isOpen ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        spot.isOpen ? 'bg-green-500' : 'bg-red-500'
                      }`}></span>
                      {spot.isOpen ? 'Open Now' : 'Closed Now'}
                    </span>
                  </div>
                )}
                
                {/* Opening Hours Preview */}
                {spot.openingHours && spot.openingHours.length > 0 && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                    <div className="font-medium text-gray-700 mb-1">Hours:</div>
                    <div className="text-gray-600 space-y-0.5">
                      {spot.openingHours.slice(0, 2).map((hour, index) => (
                        <div key={index} className="truncate">{hour}</div>
                      ))}
                      {spot.openingHours.length > 2 && (
                        <div className="text-blue-600 font-medium">
                          + {spot.openingHours.length - 2} more days
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewOnMap(spot);
                  }}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition flex items-center justify-center gap-1"
                >
                  <span>📍</span>
                  View on Map
                </button>
                
                {selectedParkingSpot?.id !== spot.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSpot(spot);
                    }}
                    className="px-3 py-2 border border-blue-600 text-blue-600 text-sm rounded hover:bg-blue-50 transition"
                  >
                    Select
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Footer with additional info */}
      {parkingSpots.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>💡 Tip: Click on a parking spot to select it, or "View on Map" to see its location</p>
          {selectedParkingSpot && (
            <p className="mt-1 text-blue-600 font-medium">
              Selected: {selectedParkingSpot.name} ({formatDistance(selectedParkingSpot.distance)} away)
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ParkingPanel;