import pandas as pd

# Load the CSV file
df = pd.read_csv('Banglore_traffic_Dataset.csv')

print("=== BANGALORE TRAFFIC DATASET ANALYSIS ===")
print(f"Total rows in dataset: {len(df)}")
print(f"Total unique areas: {len(df['Area Name'].unique())}")
print(f"Total unique roads: {len(df['Road/Intersection Name'].unique())}")

print("\n=== ALL AREAS AND THEIR ROADS ===")
areas_data = {}
for area in sorted(df['Area Name'].unique()):
    roads = sorted(df[df['Area Name'] == area]['Road/Intersection Name'].unique())
    areas_data[area] = roads
    print(f"\n{area} ({len(roads)} roads):")
    for i, road in enumerate(roads, 1):
        print(f"  {i}. {road}")

print(f"\n=== SUMMARY ===")
print(f"Areas: {list(areas_data.keys())}")
print(f"Total unique combinations: {sum(len(roads) for roads in areas_data.values())}")

# Check for any null values
print(f"\n=== DATA QUALITY CHECK ===")
print(f"Null values in Area Name: {df['Area Name'].isnull().sum()}")
print(f"Null values in Road/Intersection Name: {df['Road/Intersection Name'].isnull().sum()}")

# Sample data check
print(f"\n=== SAMPLE DATA ===")
print(df[['Area Name', 'Road/Intersection Name']].head(10))