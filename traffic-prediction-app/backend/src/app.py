from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import joblib
from datetime import datetime
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder

app = Flask(_name_)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type"]
    }
})

# Load and preprocess data
df = pd.read_csv("traffic-weather.csv")
df["Date/Time"] = pd.to_datetime(df["Date/Time"])
df["hour"] = df["Date/Time"].dt.hour

# Encode categorical features
label_encoders = {}
for col in ["Source", "Destination", "Traffic Level", "Weather Conditions"]:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col])
    label_encoders[col] = le

# Features and target
feature_cols = ["Source", "Destination", "hour", "Traffic Level", "Weather Conditions"]
X = df[feature_cols]
y = df["Travel Time (min)"]

# Train model
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X, y)

@app.route('/api/locations', methods=['GET'])
def get_locations():
    sources = label_encoders["Source"].classes_.tolist()
    destinations = label_encoders["Destination"].classes_.tolist()
    return jsonify({
        "sources": sources,
        "destinations": destinations
    })

@app.route('/api/traffic', methods=['POST'])
def get_predicted_traffic():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        source = data.get("source")
        destination = data.get("destination")

        if not source or not destination:
            return jsonify({"error": "Source and destination are required"}), 400

        # Encode inputs
        if source not in label_encoders["Source"].classes_ or destination not in label_encoders["Destination"].classes_:
            return jsonify({"error": "Invalid source or destination"}), 400

        encoded_source = label_encoders["Source"].transform([source])[0]
        encoded_destination = label_encoders["Destination"].transform([destination])[0]

        # Filter data for Traffic Level and Weather Conditions per hour
        filtered = df[(df["Source"] == encoded_source) & (df["Destination"] == encoded_destination)]
        if filtered.empty:
            return jsonify({"error": "No data found for given route"}), 404

        hourly_stats = []
        for hour in range(24):
            hour_data = filtered[filtered["hour"] == hour]
            if not hour_data.empty:
                traffic = hour_data["Traffic Level"].mode().iloc[0]
                weather = hour_data["Weather Conditions"].mode().iloc[0]
                X_pred = [[encoded_source, encoded_destination, hour, traffic, weather]]
                pred_time = round(model.predict(X_pred)[0], 2)

                stat = {
                    "hour": hour,
                    "travel_time": float(pred_time),
                    "traffic_level": label_encoders["Traffic Level"].inverse_transform([traffic])[0],
                    "weather": label_encoders["Weather Conditions"].inverse_transform([weather])[0],
                    "sample_size": int(len(hour_data)),
                    "route_id": str(hour_data["Route ID"].iloc[0])
                }
            else:
                stat = {
                    "hour": hour,
                    "travel_time": 0.0,
                    "traffic_level": "No Data",
                    "weather": "No Data",
                    "sample_size": 0,
                    "route_id": str(filtered["Route ID"].iloc[0]) if not filtered.empty else "N/A"
                }
            hourly_stats.append(stat)

        return jsonify(hourly_stats)

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

if _name_ == '_main_':
    app.run(debug=True)