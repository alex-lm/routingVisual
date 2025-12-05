/**
 * React component for visualizing routes on a map using Plotly.js
 */

import * as React from "react";
import Plot from "react-plotly.js";
import { calculateRoute, Coordinate, GraphData } from "./routingUtils";
import * as Plotly from "plotly.js";

export interface RouteVisualizationProps {
    startCoord: Coordinate;
    endCoord: Coordinate;
    graphData: GraphData | null;
    width: number;
    height: number;
}

export const RouteVisualization: React.FC<RouteVisualizationProps> = (props) => {
    const { startCoord, endCoord, graphData, width, height } = props;
    const [routeCoords, setRouteCoords] = React.useState<Coordinate[]>([]);
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState<boolean>(false);

    React.useEffect(() => {
        if (!graphData) {
            setError("Graph data not loaded");
            return;
        }

        if (!startCoord || !endCoord) {
            setError("Start or end coordinates missing");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const route = calculateRoute(graphData, startCoord, endCoord);
            setRouteCoords(route);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to calculate route");
            setRouteCoords([]);
        } finally {
            setLoading(false);
        }
    }, [graphData, startCoord, endCoord]);

    if (!graphData) {
        return (
            <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div>Loading graph data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center", color: "red" }}>
                <div>Error: {error}</div>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div>Calculating route...</div>
            </div>
        );
    }

    // Prepare data for Plotly
    const routeLons = routeCoords.map(coord => coord.lon);
    const routeLats = routeCoords.map(coord => coord.lat);

    // Calculate center and zoom
    const allLats = [...routeLats, startCoord.lat, endCoord.lat];
    const allLons = [...routeLons, startCoord.lon, endCoord.lon];
    
    const centerLat = allLats.reduce((a, b) => a + b, 0) / allLats.length;
    const centerLon = allLons.reduce((a, b) => a + b, 0) / allLons.length;

    // Calculate zoom level based on bounding box
    const minLat = Math.min(...allLats);
    const maxLat = Math.max(...allLats);
    const minLon = Math.min(...allLons);
    const maxLon = Math.max(...allLons);
    
    const latRange = maxLat - minLat;
    const lonRange = maxLon - minLon;
    const maxRange = Math.max(latRange, lonRange);
    
    // Estimate zoom level (approximate)
    let zoom = 12;
    if (maxRange > 0.1) zoom = 10;
    else if (maxRange > 0.05) zoom = 11;
    else if (maxRange > 0.02) zoom = 12;
    else if (maxRange > 0.01) zoom = 13;
    else zoom = 14;

    const data: Partial<Plotly.PlotData>[] = [
        // Route line
        {
            type: "scattermapbox",
            mode: "lines",
            lon: routeLons,
            lat: routeLats,
            line: {
                width: 4,
                color: "blue"
            },
            name: "Route",
            hovertemplate: "<b>Route</b><br>Lat: %{lat:.6f}<br>Lon: %{lon:.6f}<extra></extra>"
        },
        // Start point
        {
            type: "scattermapbox",
            mode: "markers",
            lon: [startCoord.lon],
            lat: [startCoord.lat],
            marker: {
                size: 15,
                color: "green",
                symbol: "circle"
            },
            name: "Start",
            hovertemplate: "<b>Start</b><br>Lat: %{lat:.6f}<br>Lon: %{lon:.6f}<extra></extra>"
        },
        // End point
        {
            type: "scattermapbox",
            mode: "markers",
            lon: [endCoord.lon],
            lat: [endCoord.lat],
            marker: {
                size: 15,
                color: "red",
                symbol: "circle"
            },
            name: "End",
            hovertemplate: "<b>End</b><br>Lat: %{lat:.6f}<br>Lon: %{lon:.6f}<extra></extra>"
        }
    ];

    const layout: Partial<Plotly.Layout> = {
        mapbox: {
            style: "open-street-map",
            center: {
                lat: centerLat,
                lon: centerLon
            },
            zoom: zoom
        },
        margin: { l: 0, r: 0, t: 0, b: 0 },
        showlegend: false,
        height: height,
        width: width
    };

    const config: Partial<Plotly.Config> = {
        displayModeBar: true,
        displaylogo: false,
        responsive: true
    };

    return (
        <div style={{ width, height }}>
            <Plot
                data={data}
                layout={layout}
                config={config}
                style={{ width: "100%", height: "100%" }}
            />
        </div>
    );
};

