import pandas as pd
import numpy as np
from datetime import datetime
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

file_path = "Banglore_traffic_Dataset.csv"
data = pd.read_csv(file_path)

data['Date'] = pd.to_datetime(data['Date'], errors='coerce')
data = data.dropna(subset=['Date'])
data['DayOfWeek'] = data['Date'].dt.dayofweek
data['Month'] = data['Date'].dt.month

le_area = LabelEncoder()
le_road = LabelEncoder()
le_weather = LabelEncoder()
le_construction = LabelEncoder()

if data['Area Name'].isnull().any() or data['Road/Intersection Name'].isnull().any() or data['Weather Conditions'].isnull().any() or data['Roadwork and Construction Activity'].isnull().any():
    data = data.dropna(subset=['Area Name', 'Road/Intersection Name', 'Weather Conditions', 'Roadwork and Construction Activity'])

data['Area Encoded'] = le_area.fit_transform(data['Area Name'])
data['Road Encoded'] = le_road.fit_transform(data['Road/Intersection Name'])
data['Weather Encoded'] = le_weather.fit_transform(data['Weather Conditions'])
data['Construction Encoded'] = le_construction.fit_transform(data['Roadwork and Construction Activity'])

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

data = data.dropna(subset=feature_cols + [target_col])

X = data[feature_cols]
y = data[target_col]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)
from sklearn.metrics import r2_score, mean_absolute_error

# Measure accuracy on test set
y_pred = model.predict(X_test)
r2 = r2_score(y_test, y_pred)
mae = mean_absolute_error(y_test, y_pred)
accuracy_percent = r2 * 100
print(f"Model Accuracy (R²): {accuracy_percent:.2f}%")
# print(f"Model MAE: {mae:.2f} vehicles")

def predict_traffic(area, road):
    today = datetime.now()
    # Filter historical data for the selected area and road
    filtered = data[(data['Area Name'] == area) & (data['Road/Intersection Name'] == road)]
    if filtered.empty:
        print("Error: Area or road not found in training data.")
        return None

    # Use the most recent record for prediction, or the mean if multiple
    recent = filtered.sort_values('Date', ascending=False).iloc[0]

    try:
        area_encoded = le_area.transform([area])[0]
        road_encoded = le_road.transform([road])[0]
        weather_encoded = le_weather.transform([recent['Weather Conditions']])[0]
        construction_encoded = le_construction.transform([recent['Roadwork and Construction Activity']])[0]
    except ValueError:
        weather_encoded = 0
        construction_encoded = 0

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

    predicted_volume = model.predict(sample_input)[0]

    plt.figure(figsize=(6, 4))
    plt.bar([f'{area}\n({road})'], [predicted_volume], color='skyblue')
    plt.title("Predicted Traffic Volume for Today")
    plt.ylabel("Traffic Volume")
    plt.grid(axis='y', linestyle='--', alpha=0.7)
    plt.tight_layout()
    plt.show()

    return predicted_volume

predicted = predict_traffic("Hebbal", "Hebbal Flyover")
if predicted is not None:
    print(f"Predicted Traffic Volume: {predicted:.0f} vehicles")
