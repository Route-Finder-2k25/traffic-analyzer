from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from datetime import datetime

app = Flask(__name__)
# Enable CORS with additional options
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type"]
    }
})

# Load preprocessed data
df = pd.read_csv("traffic-weather.csv")
df["Date/Time"] = pd.to_datetime(df["Date/Time"])
df["hour"] = df["Date/Time"].dt.hour

@app.route('/api/locations', methods=['GET'])
def get_locations():
    sources = df["Source"].unique().tolist()
    destinations = df["Destination"].unique().tolist()
    return jsonify({
        "sources": sources,
        "destinations": destinations
    })

@app.route('/api/traffic', methods=['POST'])
def get_traffic_data():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        source = data.get("source")
        destination = data.get("destination")

        if not source or not destination:
            return jsonify({"error": "Source and destination are required"}), 400

        filtered = df[
            (df["Source"] == source) & 
            (df["Destination"] == destination)
        ]

        if filtered.empty:
            return jsonify({"error": "No data found for given route"}), 404

        # Group by hour and calculate statistics
        hourly_stats = []
        for hour in range(24):
            hour_data = filtered[filtered["hour"] == hour]
            
            if not hour_data.empty:
                stats = {
                    "hour": int(hour),
                    "travel_time": float(round(hour_data["Travel Time (min)"].mean(), 2)),
                    "min_time": float(round(hour_data["Travel Time (min)"].min(), 2)),
                    "max_time": float(round(hour_data["Travel Time (min)"].max(), 2)),
                    "traffic_level": str(hour_data["Traffic Level"].mode().iloc[0]),
                    "weather": str(hour_data["Weather Conditions"].mode().iloc[0]),
                    "sample_size": int(len(hour_data)),
                    "route_id": str(hour_data["Route ID"].iloc[0])
                }
            else:
                stats = {
                    "hour": int(hour),
                    "travel_time": 0.0,
                    "min_time": 0.0,
                    "max_time": 0.0,
                    "traffic_level": "No Data",
                    "weather": "No Data",
                    "sample_size": 0,
                    "route_id": str(filtered["Route ID"].iloc[0]) if not filtered.empty else "N/A"
                }
            
            hourly_stats.append(stats)

        return jsonify(hourly_stats)

    except Exception as e:
        print(f"Error processing request: {str(e)}")  # For debugging
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True)