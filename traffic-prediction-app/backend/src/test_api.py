import requests
import json

# Test the locations endpoint
print("=== TESTING LOCATIONS API ===")
try:
    response = requests.get('http://localhost:5000/api/locations')
    if response.status_code == 200:
        data = response.json()
        if data['success']:
            locations = data['data']
            print(f"✅ Successfully retrieved {len(locations)} areas")
            for area, roads in locations.items():
                print(f"  {area}: {len(roads)} roads")
        else:
            print(f"❌ API error: {data.get('error', 'Unknown error')}")
    else:
        print(f"❌ HTTP error: {response.status_code}")
except Exception as e:
    print(f"❌ Connection error: {e}")

# Test the prediction endpoint
print("\n=== TESTING PREDICTION API ===")
try:
    test_data = {
        "area": "Indiranagar",
        "road": "100 Feet Road"
    }
    response = requests.post('http://localhost:5000/api/predict', 
                           json=test_data,
                           headers={'Content-Type': 'application/json'})
    
    if response.status_code == 200:
        data = response.json()
        if data['success']:
            result = data['data']
            print(f"✅ Prediction successful!")
            print(f"  Location: {result['area']} - {result['road']}")
            print(f"  Predicted Volume: {result['predicted_volume']:,} vehicles")
            print(f"  Traffic Level: {result['traffic_level']}")
            print(f"  Date: {result['prediction_date']}")
        else:
            print(f"❌ Prediction error: {data.get('error', 'Unknown error')}")
    else:
        print(f"❌ HTTP error: {response.status_code}")
        print(f"Response: {response.text}")
except Exception as e:
    print(f"❌ Connection error: {e}")

print("\n=== API TESTING COMPLETE ===")