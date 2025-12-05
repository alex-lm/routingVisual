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
import DataView = powerbi.DataView;
import DataViewTable = powerbi.DataViewTable;
import DataViewTableRow = powerbi.DataViewTableRow;
import PrimitiveValue = powerbi.PrimitiveValue;

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
        
        // Load OSM graph data
        this.loadGraphData();
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
            
            // Re-render if we already have coordinates
            if (this.startCoord && this.endCoord) {
                this.renderVisual();
            }
        } catch (error) {
            console.error('Error loading graph data:', error);
            // Try alternative path
            try {
                const altResponse = await fetch('./osm_graph.json');
                if (altResponse.ok) {
                    const data = await altResponse.json();
                    this.graphData = data as GraphData;
                    console.log('Graph data loaded from alternative path');
                    if (this.startCoord && this.endCoord) {
                        this.renderVisual();
                    }
                }
            } catch (altError) {
                console.error('Failed to load graph from alternative path:', altError);
            }
        }
    }

    public update(options: VisualUpdateOptions) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews?.[0]);
        
        console.log('Visual update', options);
        
        // Get dimensions
        this.width = options.viewport.width;
        this.height = options.viewport.height;
        
        // Parse data
        if (options.dataViews && options.dataViews.length > 0) {
            const dataView = options.dataViews[0];
            this.parseDataView(dataView);
        }
        
        this.renderVisual();
    }

    private parseDataView(dataView: DataView): void {
        try {
            if (!dataView.table) {
                console.warn('No table data in dataView');
                return;
            }

            const table: DataViewTable = dataView.table;
            
            if (table.rows.length === 0) {
                console.warn('No rows in table');
                return;
            }

            // Get the first row (assuming single route)
            const row: DataViewTableRow = table.rows[0];
            
            // Extract coordinates from columns
            // Expected order: startLat, startLon, endLat, endLon
            if (row.length >= 4) {
                const startLat = this.parseValue(row[0]);
                const startLon = this.parseValue(row[1]);
                const endLat = this.parseValue(row[2]);
                const endLon = this.parseValue(row[3]);

                if (this.isValidCoordinate(startLat, startLon) && this.isValidCoordinate(endLat, endLon)) {
                    this.startCoord = { lat: startLat, lon: startLon };
                    this.endCoord = { lat: endLat, lon: endLon };
                    console.log('Parsed coordinates:', { start: this.startCoord, end: this.endCoord });
                } else {
                    console.warn('Invalid coordinates:', { startLat, startLon, endLat, endLon });
                }
            } else {
                console.warn('Insufficient columns in table. Expected 4, got', row.length);
            }
        } catch (error) {
            console.error('Error parsing dataView:', error);
        }
    }

    private parseValue(value: PrimitiveValue): number {
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'string') {
            const parsed = parseFloat(value);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
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

        if (!this.startCoord || !this.endCoord) {
            this.reactRoot.render(
                <div style={{ width: this.width, height: this.height, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div>Please provide start and end coordinates</div>
                </div>
            );
            return;
        }

        if (!this.graphData) {
            this.reactRoot.render(
                <div style={{ width: this.width, height: this.height, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div>Loading graph data...</div>
                </div>
            );
            return;
        }

        this.reactRoot.render(
            <RouteVisualization
                startCoord={this.startCoord}
                endCoord={this.endCoord}
                graphData={this.graphData}
                width={this.width}
                height={this.height}
            />
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
