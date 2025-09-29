from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from datetime import datetime
import base64
import io
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import r2_score, mean_absolute_error

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global variables for the model and encoders
model = None
le_area = None
le_road = None
le_weather = None
le_construction = None
data = None
feature_cols = None

def initialize_model():
    """Initialize the traffic prediction model"""
    global model, le_area, le_road, le_weather, le_construction, data, feature_cols
    
    # Load and preprocess data
    file_path = "Banglore_traffic_Dataset.csv"
    data = pd.read_csv(file_path)
    
    data['Date'] = pd.to_datetime(data['Date'], errors='coerce')
    data = data.dropna(subset=['Date'])
    data['DayOfWeek'] = data['Date'].dt.dayofweek
    data['Month'] = data['Date'].dt.month
    
    # Initialize encoders
    le_area = LabelEncoder()
    le_road = LabelEncoder()
    le_weather = LabelEncoder()
    le_construction = LabelEncoder()
    
    # Clean data
    if data['Area Name'].isnull().any() or data['Road/Intersection Name'].isnull().any() or data['Weather Conditions'].isnull().any() or data['Roadwork and Construction Activity'].isnull().any():
        data = data.dropna(subset=['Area Name', 'Road/Intersection Name', 'Weather Conditions', 'Roadwork and Construction Activity'])
    
    # Encode categorical variables
    data['Area Encoded'] = le_area.fit_transform(data['Area Name'])
    data['Road Encoded'] = le_road.fit_transform(data['Road/Intersection Name'])
    data['Weather Encoded'] = le_weather.fit_transform(data['Weather Conditions'])
    data['Construction Encoded'] = le_construction.fit_transform(data['Roadwork and Construction Activity'])
    
    # Define features
    feature_cols = [
        'Area Encoded', 'Road Encoded', 'DayOfWeek', 'Month',
        'Average Speed', 'Travel Time Index', 'Congestion Level',
        'Road Capacity Utilization', 'Incident Reports',
        'Environmental Impact', 'Public Transport Usage',
        'Traffic Signal Compliance', 'Parking Usage',
        'Pedestrian and Cyclist Count', 'Weather Encoded',
        'Construction Encoded'
    ]
    target_col = 'Traffic Volume'
    
    # Clean data
    data = data.dropna(subset=feature_cols + [target_col])
    
    # Prepare training data
    X = data[feature_cols]
    y = data[target_col]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train model
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Calculate accuracy
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    accuracy_percent = r2 * 100
    print(f"Model Accuracy (R²): {accuracy_percent:.2f}%")

@app.route('/api/locations', methods=['GET'])
def get_locations():
    """Get all available areas and their roads"""
    try:
        areas_data = {}
        for area in data['Area Name'].unique():
            roads = data[data['Area Name'] == area]['Road/Intersection Name'].unique().tolist()
            areas_data[area] = roads
        
        return jsonify({
            'success': True,
            'data': areas_data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/predict', methods=['POST'])
def predict_traffic():
    """Predict traffic volume for given area and road"""
    try:
        req_data = request.get_json()
        area = req_data.get('area')
        road = req_data.get('road')
        
        if not area or not road:
            return jsonify({
                'success': False,
                'error': 'Area and road are required'
            }), 400
        
        today = datetime.now()
        
        # Filter historical data for the selected area and road
        filtered = data[(data['Area Name'] == area) & (data['Road/Intersection Name'] == road)]
        if filtered.empty:
            return jsonify({
                'success': False,
                'error': 'Area or road not found in training data'
            }), 404
        
        # Use the most recent record for prediction
        recent = filtered.sort_values('Date', ascending=False).iloc[0]
        
        try:
            area_encoded = le_area.transform([area])[0]
            road_encoded = le_road.transform([road])[0]
            weather_encoded = le_weather.transform([recent['Weather Conditions']])[0]
            construction_encoded = le_construction.transform([recent['Roadwork and Construction Activity']])[0]
        except ValueError:
            weather_encoded = 0
            construction_encoded = 0
        
        # Prepare input for prediction
        sample_input = pd.DataFrame([{
            'Area Encoded': area_encoded,
            'Road Encoded': road_encoded,
            'DayOfWeek': today.weekday(),
            'Month': today.month,
            'Average Speed': recent['Average Speed'],
            'Travel Time Index': recent['Travel Time Index'],
            'Congestion Level': recent['Congestion Level'],
            'Road Capacity Utilization': recent['Road Capacity Utilization'],
            'Incident Reports': recent['Incident Reports'],
            'Environmental Impact': recent['Environmental Impact'],
            'Public Transport Usage': recent['Public Transport Usage'],
            'Traffic Signal Compliance': recent['Traffic Signal Compliance'],
            'Parking Usage': recent['Parking Usage'],
            'Pedestrian and Cyclist Count': recent['Pedestrian and Cyclist Count'],
            'Weather Encoded': weather_encoded,
            'Construction Encoded': construction_encoded
        }])
        
        # Make prediction
        predicted_volume = model.predict(sample_input)[0]
        
        # Generate chart
        plt.figure(figsize=(10, 6))
        plt.bar([f'{area}\n({road})'], [predicted_volume], color='skyblue', alpha=0.8)
        plt.title("Predicted Traffic Volume for Today", fontsize=16, fontweight='bold')
        plt.ylabel("Traffic Volume (vehicles)", fontsize=12)
        plt.grid(axis='y', linestyle='--', alpha=0.7)
        plt.tight_layout()
        
        # Convert plot to base64 string
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format='png', dpi=150, bbox_inches='tight')
        img_buffer.seek(0)
        img_str = base64.b64encode(img_buffer.getvalue()).decode()
        plt.close()
        
        # Get traffic level based on predicted volume
        def get_traffic_level(volume):
            if volume < 20000:
                return "Low"
            elif volume < 40000:
                return "Moderate"
            elif volume < 60000:
                return "High"
            else:
                return "Very High"
        
        # Get historical data for the location
        historical_data = filtered.tail(7).to_dict('records')  # Last 7 records
        
        return jsonify({
            'success': True,
            'data': {
                'predicted_volume': int(predicted_volume),
                'traffic_level': get_traffic_level(predicted_volume),
                'chart_image': img_str,
                'area': area,
                'road': road,
                'prediction_date': today.strftime('%Y-%m-%d'),
                'additional_info': {
                    'average_speed': float(recent['Average Speed']),
                    'congestion_level': float(recent['Congestion Level']),
                    'weather_condition': recent['Weather Conditions'],
                    'construction_activity': recent['Roadwork and Construction Activity']
                },
                'historical_data': historical_data
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/historical', methods=['POST'])
def get_historical_data():
    """Get historical traffic data for a specific location"""
    try:
        req_data = request.get_json()
        area = req_data.get('area')
        road = req_data.get('road')
        days = req_data.get('days', 30)  # Default 30 days
        
        if not area or not road:
            return jsonify({
                'success': False,
                'error': 'Area and road are required'
            }), 400
        
        # Filter data for the location
        filtered = data[(data['Area Name'] == area) & (data['Road/Intersection Name'] == road)]
        if filtered.empty:
            return jsonify({
                'success': False,
                'error': 'No data found for this location'
            }), 404
        
        # Get recent data
        recent_data = filtered.sort_values('Date', ascending=False).head(days)
        
        # Prepare chart data
        chart_data = []
        for _, row in recent_data.iterrows():
            chart_data.append({
                'date': row['Date'].strftime('%Y-%m-%d'),
                'traffic_volume': int(row['Traffic Volume']),
                'average_speed': float(row['Average Speed']),
                'congestion_level': float(row['Congestion Level']),
                'weather': row['Weather Conditions']
            })
        
        return jsonify({
            'success': True,
            'data': {
                'area': area,
                'road': road,
                'historical_data': chart_data
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'message': 'Traffic Prediction API is running',
        'model_loaded': model is not None
    })

if __name__ == '__main__':
    print("Initializing traffic prediction model...")
    initialize_model()
    print("Model initialized successfully!")
    print("Starting Flask server...")
    app.run(debug=True, host='0.0.0.0', port=5000)