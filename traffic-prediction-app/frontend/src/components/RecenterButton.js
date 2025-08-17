import React from 'react';

const RecenterButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-4 bg-white p-3 rounded-full shadow-lg z-50"
    >
      <span className="text-2xl">🎯</span>
    </button>
  );
};

export default RecenterButton;