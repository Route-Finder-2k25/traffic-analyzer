import React from 'react';

const NavigationOverlay = ({ instruction, distance, time, onClose }) => {
  return (
    <div className="fixed inset-0 flex flex-col pointer-events-none">
      <div className="bg-white shadow-lg p-4 mb-auto pointer-events-auto">
        <div className="max-w-7xl mx-auto">
          <div dangerouslySetInnerHTML={{ __html: instruction }} className="text-2xl font-semibold" />
          <p className="text-gray-600">{distance}</p>
        </div>
      </div>
      
      <div className="bg-white shadow-lg p-4 pointer-events-auto">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <p className="text-lg font-semibold">Estimated arrival: {time}</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              End
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationOverlay;