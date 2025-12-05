# Routing Visual for Power BI

This Power BI custom visual displays the fastest driving route between two coordinates on an interactive map using OSM (OpenStreetMap) data.

## Setup Instructions

### 1. Export OSM Graph to JSON

Before using this visual, you need to export your OSM graph from the pickle file to JSON format:

1. Navigate to the `routeVisualCreator` directory
2. Run the export script:
   ```bash
   python exportGraphToJson.py
   ```
   This will create `osm_graph.json` from `osm_graph.pkl`

### 2. Add JSON File to Visual

Copy the `osm_graph.json` file to the `routingVisual/assets/` directory:

```bash
cp routeVisualCreator/osm_graph.json routingVisual/assets/osm_graph.json
```

Alternatively, you can place it in the root directory of the visual project.

### 3. Install Dependencies

```bash
cd routingVisual
npm install
```

### 4. Build the Visual

```bash
npm run package
```

## Usage in Power BI

1. Add the visual to your Power BI report
2. In the Fields pane, add the following measures/columns:

   - **Start Latitude**: The latitude of the starting point
   - **Start Longitude**: The longitude of the starting point
   - **End Latitude**: The latitude of the ending point
   - **End Longitude**: The longitude of the ending point

3. The visual will automatically calculate and display the fastest driving route between the two points.

## Data Format

The visual expects a table with exactly 4 columns in this order:

1. Start Latitude (decimal degrees, -90 to 90)
2. Start Longitude (decimal degrees, -180 to 180)
3. End Latitude (decimal degrees, -90 to 90)
4. End Longitude (decimal degrees, -180 to 180)

## Features

- **Interactive Map**: Uses Plotly.js with OpenStreetMap tiles
- **Fastest Route**: Calculates the route with shortest travel time
- **Visual Markers**:
  - Green marker for start point
  - Red marker for end point
  - Blue line for the route
- **Automatic Zoom**: Automatically adjusts map view to show the entire route

## Technical Details

- Uses Dijkstra's algorithm for route calculation
- Graph data is loaded from JSON file (no API calls)
- Built with React and TypeScript
- Uses Plotly.js for map visualization
