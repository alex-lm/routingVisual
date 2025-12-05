/*
 *  Power BI Visualizations
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

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

/**
 * Coordinates Settings Card
 */
class CoordinatesCardSettings extends FormattingSettingsCard {
    startLatitude = new formattingSettings.TextInput({
        name: "startLatitude",
        displayName: "Start Latitude",
        value: "51.4643"
    });

    startLongitude = new formattingSettings.TextInput({
        name: "startLongitude",
        displayName: "Start Longitude",
        value: "-0.1660"
    });

    endLatitude = new formattingSettings.TextInput({
        name: "endLatitude",
        displayName: "End Latitude",
        value: "51.4907"
    });

    endLongitude = new formattingSettings.TextInput({
        name: "endLongitude",
        displayName: "End Longitude",
        value: "-0.2067"
    });

    name: string = "coordinates";
    displayName: string = "Route Coordinates";
    slices: Array<FormattingSettingsSlice> = [this.startLatitude, this.startLongitude, this.endLatitude, this.endLongitude];
}

/**
* visual settings model class
*
*/
export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    // Create formatting settings model formatting cards
    coordinatesCard = new CoordinatesCardSettings();

    cards = [this.coordinatesCard];
}
