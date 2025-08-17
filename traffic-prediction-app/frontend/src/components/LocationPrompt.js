import React from 'react';

const LocationPrompt = ({ onAccept }) => {
  return (
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
};

export default LocationPrompt;