import React, { useState, useEffect } from "react";
import axios from "axios";

const TrafficPrediction = () => {
  const [locations, setLocations] = useState({});
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedRoad, setSelectedRoad] = useState("");
  const [prediction, setPrediction] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("prediction");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const API_BASE_URL = "http://localhost:5000/api";

  // Handle responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Inline styles
  const styles = {
    container: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: isMobile ? "15px" : "20px",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: "linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)",
      minHeight: "100vh",
      color: "#333",
    },
    header: {
      textAlign: "center",
      marginBottom: "30px",
      color: "white",
    },
    headerTitle: {
      fontSize: isMobile ? "2rem" : "2.5rem",
      marginBottom: "10px",
      textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
    },
    headerSubtitle: {
      fontSize: "1.1rem",
      opacity: 0.9,
      marginBottom: "15px",
    },
    statsBar: {
      display: "flex",
      justifyContent: "center",
      gap: "20px",
      flexWrap: "wrap",
      marginTop: "15px",
    },
    stat: {
      background: "rgba(255, 255, 255, 0.2)",
      padding: "8px 16px",
      borderRadius: "20px",
      fontSize: "0.9rem",
      fontWeight: "600",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255, 255, 255, 0.3)",
    },
    locationSelector: {
      background: "white",
      padding: "25px",
      borderRadius: "15px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
      marginBottom: "25px",
    },
    inputGroup: {
      marginBottom: "20px",
    },
    label: {
      display: "block",
      marginBottom: "8px",
      fontWeight: "600",
      color: "#555",
      fontSize: "1rem",
    },
    optionCount: {
      fontWeight: "400",
      color: "#666",
      fontSize: "0.85rem",
      marginLeft: "5px",
    },
    selectInput: {
      width: "100%",
      padding: "12px 15px",
      border: "2px solid #e0e0e0",
      borderRadius: "8px",
      fontSize: "1rem",
      background: "white",
      transition: "all 0.3s ease",
    },
    selectInputFocus: {
      outline: "none",
      borderColor: "#74b9ff",
      boxShadow: "0 0 0 3px rgba(116, 185, 255, 0.1)",
    },
    selectInputDisabled: {
      background: "#f5f5f5",
      cursor: "not-allowed",
      opacity: 0.6,
    },
    buttonGroup: {
      display: "flex",
      gap: "15px",
      marginTop: "20px",
      flexWrap: "wrap",
      flexDirection: isMobile ? "column" : "row",
    },
    button: {
      flex: 1,
      minWidth: "150px",
      padding: "12px 20px",
      border: "none",
      borderRadius: "8px",
      fontSize: "1rem",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    predictBtn: {
      background: "linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)",
      color: "white",
    },
    historyBtn: {
      background: "linear-gradient(135deg, #fd79a8 0%, #e84393 100%)",
      color: "white",
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: "not-allowed",
    },
    errorMessage: {
      background: "#ffebee",
      color: "#c62828",
      padding: "15px",
      borderRadius: "8px",
      margin: "20px 0",
      borderLeft: "4px solid #c62828",
      fontWeight: "500",
    },
    tabsContainer: {
      background: "white",
      borderRadius: "15px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
      overflow: "hidden",
    },
    tabs: {
      display: "flex",
      background: "#f5f5f5",
      flexDirection: isMobile ? "column" : "row",
    },
    tab: {
      flex: 1,
      padding: "15px 20px",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      fontSize: "1rem",
      fontWeight: "600",
      transition: "all 0.3s ease",
      borderBottom: "3px solid transparent",
    },
    tabActive: {
      background: "white",
      borderBottomColor: "#74b9ff",
      color: "#74b9ff",
    },
    resultsContainer: {
      padding: isMobile ? "20px" : "30px",
    },
    predictionSummary: {
      display: "grid",
      gridTemplateColumns: isMobile
        ? "1fr"
        : "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "20px",
      marginBottom: "30px",
    },
    summaryItem: {
      textAlign: "center",
      padding: "20px",
      background: "#f8f9fa",
      borderRadius: "10px",
      border: "1px solid #e9ecef",
    },
    summaryItemTitle: {
      margin: "0 0 10px 0",
      color: "#666",
      fontSize: "0.9rem",
      textTransform: "uppercase",
      letterSpacing: "1px",
    },
    summaryItemValue: {
      margin: "0",
      fontSize: "1.1rem",
      fontWeight: "600",
    },
    volumeText: {
      fontSize: "1.3rem",
      color: "#74b9ff",
    },
    trafficLevel: {
      fontSize: "1.2rem",
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: "1px",
    },
    additionalInfo: {
      marginBottom: "30px",
    },
    sectionTitle: {
      marginBottom: "15px",
      color: "#333",
      borderBottom: "2px solid #74b9ff",
      paddingBottom: "5px",
    },
    infoGrid: {
      display: "grid",
      gridTemplateColumns: isMobile
        ? "1fr"
        : "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "15px",
    },
    infoItem: {
      display: "flex",
      justifyContent: "space-between",
      padding: "12px 15px",
      background: "#f8f9fa",
      borderRadius: "6px",
      borderLeft: "4px solid #74b9ff",
    },
    infoLabel: {
      fontWeight: "600",
      color: "#555",
    },
    infoValue: {
      fontWeight: "500",
      color: "#333",
    },
    chartContainer: {
      textAlign: "center",
    },
    chartTitle: {
      marginBottom: "20px",
      color: "#333",
      borderBottom: "2px solid #74b9ff",
      paddingBottom: "5px",
      display: "inline-block",
    },
    predictionChart: {
      maxWidth: "100%",
      height: "auto",
      borderRadius: "10px",
      boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
    },
    historyHeader: {
      textAlign: "center",
      marginBottom: "25px",
    },
    historyTitle: {
      marginBottom: "5px",
      color: "#333",
    },
    historySubtitle: {
      color: "#666",
      fontSize: "1.1rem",
    },
    historyTableContainer: {
      overflowX: "auto",
    },
    historyTable: {
      width: "100%",
      borderCollapse: "collapse",
      marginTop: "10px",
    },
    tableHeader: {
      padding: "12px 15px",
      textAlign: "left",
      borderBottom: "1px solid #e9ecef",
      background: "#f8f9fa",
      fontWeight: "600",
      color: "#555",
      textTransform: "uppercase",
      fontSize: "0.85rem",
      letterSpacing: "0.5px",
    },
    tableCell: {
      padding: "12px 15px",
      textAlign: "left",
      borderBottom: "1px solid #e9ecef",
    },
    tableRowEven: {
      background: "#fdfdfd",
    },
    tableRowHover: {
      background: "#f8f9fa",
    },
  };

  // Fetch available locations on component mount
  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/locations`);
      if (response.data.success) {
        setLocations(response.data.data);
      }
    } catch (err) {
      setError("Failed to fetch locations");
      console.error("Error fetching locations:", err);
    }
  };

  const handleAreaChange = (e) => {
    const area = e.target.value;
    setSelectedArea(area);
    setSelectedRoad(""); // Reset road selection when area changes
    setPrediction(null);
    setHistoricalData(null);
  };

  const handleRoadChange = (e) => {
    setSelectedRoad(e.target.value);
    setPrediction(null);
    setHistoricalData(null);
  };

  const predictTraffic = async () => {
    if (!selectedArea || !selectedRoad) {
      setError("Please select both area and road");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API_BASE_URL}/predict`, {
        area: selectedArea,
        road: selectedRoad,
      });

      if (response.data.success) {
        setPrediction(response.data.data);
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError("Failed to get traffic prediction");
      console.error("Error predicting traffic:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalData = async () => {
    if (!selectedArea || !selectedRoad) {
      setError("Please select both area and road");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API_BASE_URL}/historical`, {
        area: selectedArea,
        road: selectedRoad,
        days: 15,
      });

      if (response.data.success) {
        setHistoricalData(response.data.data);
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError("Failed to fetch historical data");
      console.error("Error fetching historical data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTrafficLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case "low":
        return "#4CAF50";
      case "moderate":
        return "#FF9800";
      case "high":
        return "#F44336";
      case "very high":
        return "#8B0000";
      default:
        return "#666";
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>🚦 Traffic Volume Prediction</h1>
        <p style={styles.headerSubtitle}>
          Get real-time traffic predictions for Bangalore locations
        </p>
        <div style={styles.statsBar}>
          <span style={styles.stat}>
            📍 {Object.keys(locations).length} Areas
          </span>
          <span style={styles.stat}>
            🛣️ {Object.values(locations).flat().length} Roads
          </span>
          <span style={styles.stat}>
            🔄{" "}
            {Object.values(locations).reduce(
              (total, roads) => total + roads.length,
              0
            )}{" "}
            Combinations
          </span>
        </div>
      </div>

      {/* Location Selection */}
      <div style={styles.locationSelector}>
        <div style={styles.inputGroup}>
          <label htmlFor="area-select" style={styles.label}>
            Select Area:
            <span style={styles.optionCount}>
              ({Object.keys(locations).length} available)
            </span>
          </label>
          <select
            id="area-select"
            value={selectedArea}
            onChange={handleAreaChange}
            style={{
              ...styles.selectInput,
              ...(selectedArea ? styles.selectInputFocus : {}),
            }}
          >
            <option value="">Choose an area...</option>
            {Object.keys(locations)
              .sort()
              .map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
          </select>
        </div>

        <div style={styles.inputGroup}>
          <label htmlFor="road-select" style={styles.label}>
            Select Road/Intersection:
            {selectedArea && (
              <span style={styles.optionCount}>
                ({locations[selectedArea]?.length || 0} available)
              </span>
            )}
          </label>
          <select
            id="road-select"
            value={selectedRoad}
            onChange={handleRoadChange}
            style={{
              ...styles.selectInput,
              ...(!selectedArea ? styles.selectInputDisabled : {}),
              ...(selectedRoad ? styles.selectInputFocus : {}),
            }}
            disabled={!selectedArea}
          >
            <option value="">
              {!selectedArea ? "Select an area first..." : "Choose a road..."}
            </option>
            {selectedArea &&
              locations[selectedArea]?.sort().map((road) => (
                <option key={road} value={road}>
                  {road}
                </option>
              ))}
          </select>
        </div>

        <div style={styles.buttonGroup}>
          <button
            onClick={() => {
              setActiveTab("prediction");
              predictTraffic();
            }}
            disabled={loading || !selectedArea || !selectedRoad}
            style={{
              ...styles.button,
              ...styles.predictBtn,
              ...(loading || !selectedArea || !selectedRoad
                ? styles.buttonDisabled
                : {}),
              ":hover":
                !loading && selectedArea && selectedRoad
                  ? {
                      transform: "translateY(-2px)",
                      boxShadow: "0 5px 15px rgba(116, 185, 255, 0.4)",
                    }
                  : {},
            }}
          >
            {loading && activeTab === "prediction"
              ? "🔄 Predicting..."
              : "🔮 Predict Traffic"}
          </button>

          <button
            onClick={() => {
              setActiveTab("history");
              fetchHistoricalData();
            }}
            disabled={loading || !selectedArea || !selectedRoad}
            style={{
              ...styles.button,
              ...styles.historyBtn,
              ...(loading || !selectedArea || !selectedRoad
                ? styles.buttonDisabled
                : {}),
              ":hover":
                !loading && selectedArea && selectedRoad
                  ? {
                      transform: "translateY(-2px)",
                      boxShadow: "0 5px 15px rgba(232, 67, 147, 0.4)",
                    }
                  : {},
            }}
          >
            {loading && activeTab === "history"
              ? "🔄 Loading..."
              : "📊 View History"}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && <div style={styles.errorMessage}>⚠️ {error}</div>}

      {/* Results Tabs */}
      <div style={styles.tabsContainer}>
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === "prediction" ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab("prediction")}
          >
            🔮 Prediction
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === "history" ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab("history")}
          >
            📊 Historical Data
          </button>
        </div>

        {/* Prediction Results */}
        {activeTab === "prediction" && prediction && (
          <div style={styles.resultsContainer}>
            <div style={styles.predictionSummary}>
              <div style={styles.summaryItem}>
                <h3 style={styles.summaryItemTitle}>📍 Location</h3>
                <p style={styles.summaryItemValue}>
                  {prediction.area} - {prediction.road}
                </p>
              </div>

              <div style={styles.summaryItem}>
                <h3 style={styles.summaryItemTitle}>🚗 Predicted Volume</h3>
                <p style={{ ...styles.summaryItemValue, ...styles.volumeText }}>
                  {prediction.predicted_volume.toLocaleString()} vehicles
                </p>
              </div>

              <div style={styles.summaryItem}>
                <h3 style={styles.summaryItemTitle}>🚦 Traffic Level</h3>
                <p
                  style={{
                    ...styles.summaryItemValue,
                    ...styles.trafficLevel,
                    color: getTrafficLevelColor(prediction.traffic_level),
                  }}
                >
                  {prediction.traffic_level}
                </p>
              </div>

              <div style={styles.summaryItem}>
                <h3 style={styles.summaryItemTitle}>📅 Date</h3>
                <p style={styles.summaryItemValue}>
                  {new Date(prediction.prediction_date).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Additional Information */}
            <div style={styles.additionalInfo}>
              <h3 style={styles.sectionTitle}>📋 Additional Information</h3>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Average Speed:</span>
                  <span style={styles.infoValue}>
                    {prediction.additional_info.average_speed.toFixed(1)} km/h
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Congestion Level:</span>
                  <span style={styles.infoValue}>
                    {prediction.additional_info.congestion_level.toFixed(1)}%
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Weather:</span>
                  <span style={styles.infoValue}>
                    {prediction.additional_info.weather_condition}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Construction:</span>
                  <span style={styles.infoValue}>
                    {prediction.additional_info.construction_activity}
                  </span>
                </div>
              </div>
            </div>

            {/* Chart */}
            {prediction.chart_image && (
              <div style={styles.chartContainer}>
                <h3 style={styles.chartTitle}>📈 Traffic Volume Chart</h3>
                <img
                  src={`data:image/png;base64,${prediction.chart_image}`}
                  alt="Traffic Prediction Chart"
                  style={styles.predictionChart}
                />
              </div>
            )}
          </div>
        )}

        {/* Historical Data */}
        {activeTab === "history" && historicalData && (
          <div style={styles.resultsContainer}>
            <div style={styles.historyHeader}>
              <h3 style={styles.historyTitle}>📊 Historical Traffic Data</h3>
              <p style={styles.historySubtitle}>
                {historicalData.area} - {historicalData.road}
              </p>
            </div>

            <div style={styles.historyTableContainer}>
              <table style={styles.historyTable}>
                <thead>
                  <tr>
                    <th style={styles.tableHeader}>Date</th>
                    <th style={styles.tableHeader}>Traffic Volume</th>
                    <th style={styles.tableHeader}>Avg Speed (km/h)</th>
                    <th style={styles.tableHeader}>Congestion (%)</th>
                    <th style={styles.tableHeader}>Weather</th>
                  </tr>
                </thead>
                <tbody>
                  {historicalData.historical_data.map((row, index) => (
                    <tr
                      key={index}
                      style={index % 2 === 0 ? styles.tableRowEven : {}}
                      onMouseEnter={(e) =>
                        (e.target.parentNode.style.background = "#f8f9fa")
                      }
                      onMouseLeave={(e) =>
                        (e.target.parentNode.style.background =
                          index % 2 === 0 ? "#fdfdfd" : "white")
                      }
                    >
                      <td style={styles.tableCell}>
                        {new Date(row.date).toLocaleDateString()}
                      </td>
                      <td style={styles.tableCell}>
                        {row.traffic_volume.toLocaleString()}
                      </td>
                      <td style={styles.tableCell}>
                        {row.average_speed.toFixed(1)}
                      </td>
                      <td style={styles.tableCell}>
                        {row.congestion_level.toFixed(1)}
                      </td>
                      <td style={styles.tableCell}>{row.weather}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrafficPrediction;
