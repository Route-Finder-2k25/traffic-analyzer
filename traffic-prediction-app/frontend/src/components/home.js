import React from 'react'

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Traffic Analysis Tools</h1>
      <div className="flex flex-col gap-4 w-64">
        <a
          href="/analyzer"
          className="block text-center px-6 py-3 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition"
        >
          Traffic Analyzer
        </a>
        <a
          href="/bestPath"
          className="block text-center px-6 py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
        >
          Best Path
        </a>
      </div>
    </div>
  )
}

export default Home;
