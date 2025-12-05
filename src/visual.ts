/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import { RouteVisualization } from "./RouteVisualization";
import { GraphData, Coordinate } from "./routingUtils";
import { VisualFormattingSettingsModel } from "./settings";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

export class Visual implements IVisual {
    private target: HTMLElement;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private reactRoot: Root | null = null;
    private graphData: GraphData | null = null;
    private startCoord: Coordinate | null = null;
    private endCoord: Coordinate | null = null;
    private width: number = 0;
    private height: number = 0;

    constructor(options: VisualConstructorOptions) {
        console.log('Visual constructor', options);
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        
        // Create a container div for React
        const container = document.createElement("div");
        container.style.width = "100%";
        container.style.height = "100%";
        this.target.appendChild(container);
        
        // Initialize React root
        this.reactRoot = createRoot(container);
        
        // Render initial placeholder
        this.renderInitialPlaceholder();
        
        // Load OSM graph data
        this.loadGraphData();
    }

    private renderInitialPlaceholder(): void {
        if (!this.reactRoot) {
            return;
        }
        // Don't render anything initially - let update() handle the first render
        // This ensures settings are available when we render
    }

    private async loadGraphData(): Promise<void> {
        try {
            // Try to load from assets folder (when packaged) or from the same directory
            const graphPath = (window as any).location.href.includes('localhost') 
                ? './osm_graph.json' 
                : './assets/osm_graph.json';
            
            const response = await fetch(graphPath);
            if (!response.ok) {
                throw new Error(`Failed to load graph: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.graphData = data as GraphData;
            console.log('Graph data loaded:', this.graphData.node_count, 'nodes,', this.graphData.edge_count, 'edges');
            
            // Always re-render after loading graph data
            this.renderVisual();
        } catch (error) {
            console.error('Error loading graph data:', error);
            // Try alternative path
            try {
                const altResponse = await fetch('./osm_graph.json');
                if (altResponse.ok) {
                    const data = await altResponse.json();
                    this.graphData = data as GraphData;
                    console.log('Graph data loaded from alternative path');
                    // Always re-render after loading graph data
                    this.renderVisual();
                }
            } catch (altError) {
                console.error('Failed to load graph from alternative path:', altError);
            }
        }
    }

    public update(options: VisualUpdateOptions) {
        // Always populate settings, even if dataView is empty
        try {
            this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews?.[0]);
        } catch (error) {
            console.warn('Error populating settings, creating default:', error);
            this.formattingSettings = new VisualFormattingSettingsModel();
        }
        
        console.log('Visual update', options);
        console.log('Formatting settings:', this.formattingSettings);
        
        // Get dimensions
        this.width = options.viewport.width;
        this.height = options.viewport.height;
        
        // Parse coordinates from settings
        this.parseCoordinatesFromSettings();
        
        // Always render, even if coordinates are missing (to show helpful message)
        this.renderVisual();
    }

    private parseCoordinatesFromSettings(): void {
        try {
            if (!this.formattingSettings || !this.formattingSettings.coordinatesCard) {
                console.warn('Settings not available, using defaults');
                // Use default coordinates if settings not available
                this.startCoord = { lat: 51.4643, lon: -0.1660 };
                this.endCoord = { lat: 51.4907, lon: -0.2067 };
                return;
            }

            const coords = this.formattingSettings.coordinatesCard;
            console.log('Coordinate values from settings:', {
                startLat: coords.startLatitude.value,
                startLon: coords.startLongitude.value,
                endLat: coords.endLatitude.value,
                endLon: coords.endLongitude.value
            });
            
            const startLat = this.parseCoordinateValue(coords.startLatitude.value);
            const startLon = this.parseCoordinateValue(coords.startLongitude.value);
            const endLat = this.parseCoordinateValue(coords.endLatitude.value);
            const endLon = this.parseCoordinateValue(coords.endLongitude.value);

            if (this.isValidCoordinate(startLat, startLon) && this.isValidCoordinate(endLat, endLon)) {
                this.startCoord = { lat: startLat, lon: startLon };
                this.endCoord = { lat: endLat, lon: endLon };
                console.log('Parsed coordinates from settings:', { start: this.startCoord, end: this.endCoord });
            } else {
                console.warn('Invalid coordinates from settings:', { startLat, startLon, endLat, endLon });
                this.startCoord = null;
                this.endCoord = null;
            }
        } catch (error) {
            console.error('Error parsing coordinates from settings:', error);
            this.startCoord = null;
            this.endCoord = null;
        }
    }

    private parseCoordinateValue(value: string): number {
        if (!value || value.trim() === '') {
            return NaN;
        }
        const parsed = parseFloat(value.trim());
        return isNaN(parsed) ? NaN : parsed;
    }

    private isValidCoordinate(lat: number, lon: number): boolean {
        return !isNaN(lat) && !isNaN(lon) && 
               lat >= -90 && lat <= 90 && 
               lon >= -180 && lon <= 180;
    }

    private renderVisual(): void {
        if (!this.reactRoot) {
            return;
        }

        // Ensure we have valid dimensions
        const width = Math.max(this.width || 200, 200);
        const height = Math.max(this.height || 200, 200);

        if (!this.startCoord || !this.endCoord) {
            this.reactRoot.render(
                React.createElement(
                    "div",
                    { 
                        style: { 
                            width: width, 
                            height: height, 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            padding: "20px",
                            boxSizing: "border-box"
                        } 
                    },
                    React.createElement("div", { style: { textAlign: "center" } }, 
                        React.createElement("div", { style: { marginBottom: "10px", fontWeight: "bold" } }, "Route Coordinates Required"),
                        React.createElement("div", null, "Please enter start and end coordinates in the formatting pane.")
                    )
                )
            );
            return;
        }

        if (!this.graphData) {
            this.reactRoot.render(
                React.createElement(
                    "div",
                    { 
                        style: { 
                            width: width, 
                            height: height, 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            padding: "20px",
                            boxSizing: "border-box"
                        } 
                    },
                    React.createElement("div", { style: { textAlign: "center" } }, 
                        React.createElement("div", { style: { marginBottom: "10px" } }, "Loading graph data..."),
                        React.createElement("div", { style: { fontSize: "12px", color: "#666" } }, "Please ensure osm_graph.json is in the assets folder")
                    )
                )
            );
            return;
        }

        this.reactRoot.render(
            React.createElement(RouteVisualization, {
                startCoord: this.startCoord,
                endCoord: this.endCoord,
                graphData: this.graphData,
                width: width,
                height: height
            })
        );
    }

    /**
     * Returns properties pane formatting model content hierarchies, properties and latest formatting values, Then populate properties pane.
     * This method is called once every time we open properties pane or when the user edit any format property. 
     */
    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
