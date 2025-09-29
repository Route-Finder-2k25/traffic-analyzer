import React from "react";

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500">
      <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-xl p-8 shadow-2xl max-w-md w-full mx-4">
        <h1 className="text-4xl font-bold mb-2 text-gray-800 text-center">
          🚦 Traffic Hub
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Your complete traffic analysis solution
        </p>

        <div className="flex flex-col gap-4">
          <a
            href="/traffic-prediction"
            className="group block text-center px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">🔮</span>
              <span className="font-semibold">Traffic Prediction</span>
            </div>
            <p className="text-sm opacity-90 mt-1">
              ML-powered traffic volume prediction
            </p>
          </a>

          <a
            href="/analyzer"
            className="group block text-center px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">📊</span>
              <span className="font-semibold">Traffic Analyzer</span>
            </div>
            <p className="text-sm opacity-90 mt-1">
              Real-time traffic analysis & charts
            </p>
          </a>

          <a
            href="/bestPath"
            className="group block text-center px-6 py-4 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">🗺️</span>
              <span className="font-semibold">Best Route</span>
            </div>
            <p className="text-sm opacity-90 mt-1">
              Find optimal routes & navigation
            </p>
          </a>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-500">
            🌟 Powered by Machine Learning & Real-time Data
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
