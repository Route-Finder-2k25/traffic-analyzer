import React from 'react';

const NavigationOverlay = ({ instruction, distance, time, onClose }) => {
  return (
    <div className="fixed inset-0 flex flex-col pointer-events-none">
      {/* Top instruction bar */}
      <div className="pointer-events-auto mb-auto">
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <div className="rounded-xl border border-indigo-200 bg-white/90 backdrop-blur shadow-md">
            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-2xl font-semibold text-gray-900" dangerouslySetInnerHTML={{ __html: instruction }} />
                  <p className="text-gray-600 mt-1">{distance}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom control sheet */}
      <div className="pointer-events-auto">
        <div className="mx-auto max-w-7xl px-4 pb-4 w-full">
          <div className="rounded-xl border border-gray-200 bg-white/95 backdrop-blur shadow-lg">
            <div className="p-4 flex items-center justify-between">
              <div className="text-lg font-semibold text-gray-900">ETA: {time}</div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                >
                  <span>■</span>
                  <span>End</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationOverlay;