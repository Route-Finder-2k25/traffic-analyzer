import React, { useState, useEffect } from 'react';
import { TRAIN_API_BASE } from '../config';
import stationCodes from '../data/stationCodes.json';
import { Bus, Train, MapPin, ArrowRight, AlertCircle } from 'lucide-react';

const TransitResultsCard = ({ transitData, loadingTransit, transitError, onFetchTransit, selectedTransitDate, setSelectedTransitDate, selectedSource, selectedDestination }) => {
  const [expandedRoute, setExpandedRoute] = useState(0);
  const [activeTab, setActiveTab] = useState('buses'); // 'buses', 'trains'
  const [fromCode, setFromCode] = useState('');
  const [toCode, setToCode] = useState('');
  const [trainDate, setTrainDate] = useState(null);
  const [loadingTrains, setLoadingTrains] = useState(false);
  const [trainError, setTrainError] = useState('');
  const [trainResults, setTrainResults] = useState([]);
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [showFromList, setShowFromList] = useState(false);
  const [showToList, setShowToList] = useState(false);

  const allCodes = React.useMemo(() => new Set(Object.values(stationCodes).map(c => String(c).toUpperCase())), []);
  const stationOptions = React.useMemo(() => Object.entries(stationCodes).map(([name, code]) => ({ name, code })), []);
  const filteredFromOptions = React.useMemo(() => {
    const q = fromQuery.trim().toLowerCase();
    if (!q) return [];
    return stationOptions.filter(o => o.name.startsWith(q)).slice(0, 8);
  }, [stationOptions, fromQuery]);
  const filteredToOptions = React.useMemo(() => {
    const q = toQuery.trim().toLowerCase();
    if (!q) return [];
    return stationOptions.filter(o => o.name.startsWith(q)).slice(0, 8);
  }, [stationOptions, toQuery]);

  const normalizePlace = (s) => {
    if (!s) return '';
    const v = String(s).toLowerCase();

    // 1) direct code in input (tokens like SBC, MAS, NDLS)
    const tokens = String(s).toUpperCase().match(/[A-Z]{2,5}/g) || [];
    for (const t of tokens) {
      if (allCodes.has(t)) return t;
    }

    // 2) exact key match by word(s)
    const words = v.replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
    const candidates = new Set();
    // single words
    words.forEach(w => candidates.add(w));
    // bigrams
    for (let i = 0; i < words.length - 1; i++) {
      candidates.add(`${words[i]} ${words[i+1]}`);
    }
    // trigrams
    for (let i = 0; i < words.length - 2; i++) {
      candidates.add(`${words[i]} ${words[i+1]} ${words[i+2]}`);
    }
    for (const cand of candidates) {
      if (stationCodes[cand]) return stationCodes[cand];
    }

    // 3) substring contains known key
    for (const key of Object.keys(stationCodes)) {
      if (v.includes(key)) return stationCodes[key];
    }

    return '';
  };

  const prefillCodesFromSelection = () => {
    const from = normalizePlace(selectedSource);
    const to = normalizePlace(selectedDestination);
    if (from && !fromCode) setFromCode(from);
    if (to && !toCode) setToCode(to);
  };

  // Auto-prefill codes when user switches to Trains tab or changes selections/date
  useEffect(() => {
    if (activeTab !== 'trains') return;
    prefillCodesFromSelection();
  }, [activeTab, selectedSource, selectedDestination]);

  // Auto-fetch trains when in Trains tab and we have codes + date
  useEffect(() => {
    if (activeTab !== 'trains') return;
    const haveCodes = (fromCode || normalizePlace(selectedSource)) && (toCode || normalizePlace(selectedDestination));
    if (!haveCodes || !selectedTransitDate) return;
    fetchTrains({});
  }, [activeTab, fromCode, toCode, selectedSource, selectedDestination, selectedTransitDate]);

  const fetchTrains = async (opts = {}) => {
    // Allow overrides for immediate auto-fetch without waiting for state
    const effFrom = (opts.from || fromCode || normalizePlace(selectedSource) || '').toUpperCase();
    const effTo = (opts.to || toCode || normalizePlace(selectedDestination) || '').toUpperCase();
    setTrainError('');
    setTrainResults([]);
    if (!effFrom || !effTo) {
      setTrainError('Enter source and destination station codes');
      return;
    }
    const dateObj = opts.date || trainDate || selectedTransitDate;
    if (!dateObj) {
      setTrainError('Select a date');
      return;
    }
    // Expected format DD-MM-YYYY
    const d = new Date(dateObj);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    const dateStr = `${dd}-${mm}-${yyyy}`;
    try {
      setLoadingTrains(true);
      const url = `${TRAIN_API_BASE}/trains/getTrainOn?from=${encodeURIComponent(effFrom)}&to=${encodeURIComponent(effTo)}&date=${encodeURIComponent(dateStr)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json?.success) {
        setTrainError(json?.data || 'Failed to fetch trains');
        setTrainResults([]);
        return;
      }
      setTrainResults(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setTrainError('Failed to load trains');
      setTrainResults([]);
    } finally {
      setLoadingTrains(false);
    }
  };

  if (loadingTransit) {
    return (
      <div className="mt-6 p-8 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading transit options...</span>
        </div>
      </div>
    );
  }

  if (transitError) {
    return (
      <div className="mt-6 p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-red-800">{transitError}</div>
        </div>
      </div>
    );
  }

  if (!transitData || !transitData.routes || transitData.routes.length === 0) {
    return (
      <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-blue-800 text-center">
          Click "Get Transit Options" to see available bus and train routes
        </div>
      </div>
    );
  }

  // Categorize transit steps
  const categorizeTransitSteps = (steps) => {
    const buses = [];
    const trains = [];
    const walking = [];

    steps.forEach(step => {
      if (step.travel_mode === 'TRANSIT' && step.transit_details) {
        const vehicleTypeRaw = step.transit_details.line?.vehicle?.type || '';
        const vehicleType = String(vehicleTypeRaw).toUpperCase();
        const lineNameRaw = step.transit_details.line?.name || step.transit_details.line?.short_name || '';
        const lineName = String(lineNameRaw);
        const lineNameLower = lineName.toLowerCase();
        
        // Determine bus
        const isBus = vehicleType.includes('BUS') || lineNameLower.includes('bus') || lineNameLower.includes('ksrtc');

        // Determine train/rail/metro
        const isTrainLike = (
          vehicleType.includes('TRAIN') ||
          vehicleType.includes('RAIL') ||
          vehicleType.includes('SUBWAY') ||
          vehicleType.includes('METRO') ||
          vehicleType.includes('TRAM') || // include trams in trains tab
          vehicleType.includes('COMMUTER_TRAIN') ||
          vehicleType.includes('HEAVY_RAIL') ||
          vehicleType.includes('METRO_RAIL') ||
          vehicleType.includes('LIGHT_RAIL') ||
          lineNameLower.includes('train') ||
          lineNameLower.includes('rail') ||
          lineNameLower.includes('metro') ||
          lineNameLower.includes('subway') ||
          lineNameLower.includes('tram')
        );

        if (isBus && !isTrainLike) {
          buses.push(step);
        } else if (isTrainLike) {
          trains.push(step);
        } else {
          // Default to bus if unclear
          buses.push(step);
        }
      } else if (step.travel_mode === 'WALKING') {
        walking.push(step);
      }
    });

    return { buses, trains, walking };
  };

  // Get icon for vehicle type (not used after flattening buses UI)

  // Get color for vehicle type
  const getVehicleColor = (vehicleType) => {
    if (!vehicleType) return 'bg-blue-500';
    
    const type = vehicleType.toUpperCase();
    if (type.includes('TRAIN') || type.includes('RAIL') || type.includes('SUBWAY') || type.includes('METRO')) {
      return 'bg-purple-600';
    }
    return 'bg-blue-500';
  };

  // Filter helper removed with simplified UI

  return (
    <div className="mt-6 bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
        <h3 className="text-2xl font-bold text-white mb-2">Transit Options</h3>
        <p className="text-blue-100">Choose from buses, trains, and combined routes</p>
      </div>

      {/* Date selector and fetch button */}
      <div className="p-4 bg-white border-b border-gray-200 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* <div className="flex items-center gap-2">
          <label htmlFor="transit-date" className="text-sm text-gray-700">Select date:</label>
          <input
            id="transit-date"
            type="date"
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            value={selectedTransitDate ? new Date(selectedTransitDate).toISOString().slice(0,10) : ''}
            onChange={(e) => setSelectedTransitDate(new Date(e.target.value))}
          />
        </div> */}
        {/* <button
          onClick={onFetchTransit}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
        >
          Get Transit Options
        </button> */}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex">
          <button
            onClick={() => setActiveTab('buses')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'buses'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Bus className="w-4 h-4" />
              <span>Buses Only</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('trains')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'trains'
                ? 'bg-white text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Train className="w-4 h-4" />
              <span>Trains Only</span>
            </div>
          </button>
        </div>
      </div>

      {/* Trains search and results (auto-fills and auto-fetches) */}
      {activeTab === 'trains' && (
        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative w-full sm:w-60">
              <input
                value={fromQuery}
                onChange={(e) => { setFromQuery(e.target.value); setShowFromList(true); }}
                onFocus={() => setShowFromList(true)}
                className="border border-gray-300 rounded px-3 py-2 text-sm w-full"
                placeholder="From city/station name (prefix)"
              />
              {showFromList && filteredFromOptions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded shadow">
                  {filteredFromOptions.map((opt, idx) => (
                    <div
                      key={`${opt.name}-${idx}`}
                      className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                      onMouseDown={() => {
                        setFromQuery(opt.name);
                        setFromCode(String(opt.code).toUpperCase());
                        setShowFromList(false);
                      }}
                    >
                      <span className="text-gray-800">{opt.name}</span>
                      <span className="ml-3 px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-800">{String(opt.code).toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              )}
              {fromCode && (
                <div className="mt-1 text-xs text-gray-600">Selected: <span className="font-semibold">{fromCode}</span></div>
              )}
            </div>

            <ArrowRight className="w-5 h-5 text-gray-400 self-center hidden sm:block" />

            <div className="relative w-full sm:w-60">
              <input
                value={toQuery}
                onChange={(e) => { setToQuery(e.target.value); setShowToList(true); }}
                onFocus={() => setShowToList(true)}
                className="border border-gray-300 rounded px-3 py-2 text-sm w-full"
                placeholder="To city/station name (prefix)"
              />
              {showToList && filteredToOptions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded shadow">
                  {filteredToOptions.map((opt, idx) => (
                    <div
                      key={`${opt.name}-${idx}`}
                      className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                      onMouseDown={() => {
                        setToQuery(opt.name);
                        setToCode(String(opt.code).toUpperCase());
                        setShowToList(false);
                      }}
                    >
                      <span className="text-gray-800">{opt.name}</span>
                      <span className="ml-3 px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-800">{String(opt.code).toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              )}
              {toCode && (
                <div className="mt-1 text-xs text-gray-600">Selected: <span className="font-semibold">{toCode}</span></div>
              )}
            </div>
            <input
              type="date"
              className="border border-gray-300 rounded px-3 py-2 text-sm w-full sm:w-48"
              value={(trainDate || selectedTransitDate) ? new Date(trainDate || selectedTransitDate).toISOString().slice(0,10) : ''}
              onChange={(e) => setTrainDate(new Date(e.target.value))}
            />
            <button onClick={() => { prefillCodesFromSelection(); fetchTrains(); }} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm">Search Trains</button>
          </div>
          {trainError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{trainError}</div>
          )}
          {loadingTrains && (
            <div className="flex items-center text-gray-600 text-sm"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>Loading trains…</div>
          )}
          {!loadingTrains && trainResults.length > 0 && (
            <div className="space-y-3">
              {trainResults.map((t, i) => {
                const b = t.train_base || {};
                return (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-800">{b.train_no} • {b.train_name}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                        <span>{b.from_stn_name} ({b.from_stn_code})</span>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span>{b.to_stn_name} ({b.to_stn_code})</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="mr-3">Dep {b.from_time}</span>
                        <span className="mr-3">Arr {b.to_time}</span>
                        <span>{b.travel_time}</span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">Train</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!loadingTrains && trainResults.length === 0 && !trainError && (
            <div className="text-sm text-gray-500">No trains to show. Enter station codes and search.</div>
                    )}
                  </div>
      )}

      {/* Buses list (flattened, without route numbers) */}
      {activeTab === 'buses' && (
        <div className="p-6 space-y-3">
          {(() => {
            const busItems = [];
            (transitData.routes || []).forEach((route) => {
              const leg = route.legs?.[0];
              const steps = leg?.steps || [];
              steps.forEach((step) => {
                    const transit = step.transit_details;
                if (!transit) return;
                    const vehicleType = transit.line?.vehicle?.type || '';
                const vt = String(vehicleType).toUpperCase();
                const lineName = transit.line?.name || transit.line?.short_name || '';
                const isTrainLike = vt.includes('TRAIN') || vt.includes('RAIL') || vt.includes('SUBWAY') || vt.includes('METRO') || vt.includes('TRAM');
                if (!isTrainLike) {
                  busItems.push({ transit, vehicleType });
                }
              });
            });
            if (busItems.length === 0) {
              return <div className="text-gray-500 text-sm">No buses found for this query</div>;
            }
            return busItems.map((item, idx) => {
              const transit = item.transit;
              const vehicleType = item.vehicleType;
              const lineName = transit.line?.name || transit.line?.short_name || 'Bus';
                    const lineShortName = transit.line?.short_name || '';
                    return (
                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 ${getVehicleColor('BUS')} rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
                      <Bus className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-800 mb-1">
                              {lineShortName && <span className="mr-2 text-lg">{lineShortName}</span>}
                              {lineName}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-green-600" />
                                <span>From: <strong>{transit.departure_stop?.name || 'N/A'}</strong></span>
                                {transit.departure_time && (
                            <span className="ml-2 text-gray-500">({transit.departure_time.text})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-red-600" />
                                <span>To: <strong>{transit.arrival_stop?.name || 'N/A'}</strong></span>
                                {transit.arrival_time && (
                            <span className="ml-2 text-gray-500">({transit.arrival_time.text})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">BUS</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
            });
          })()}
                </div>
              )}

      {transitData.routes.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No transit routes available for the selected filter
        </div>
      )}
    </div>
  );
};

export default TransitResultsCard;