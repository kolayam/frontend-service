/**
 * Copyright 2020
 * University of Bremen, Faculty of Production Engineering, Badgasteiner Straße 1, 28359 Bremen, Germany.
 * In collaboration with BIBA - Bremer Institut für Produktion und Logistik GmbH, Bremen, Germany.
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
 */

import { Component, Input, OnChanges, ViewEncapsulation } from '@angular/core';
import { TrackInfo } from './model/trackinfo';
import * as myGlobals from '../globals';
import { TnTService } from './tnt.service';
import moment = require('moment');


@Component({
    selector: 'tnt-event-details',
    templateUrl: './tnt-event-details.component.html',
    styleUrls: ['./tnt-event-details.component.css'],
    providers: [TnTService],
    encapsulation: ViewEncapsulation.None
})

export class TnTEventDetailsComponent implements OnChanges {
    @Input('eventsToDisplay') events: TrackInfo[];
    debug = myGlobals.debug;
    bcIoTDataHashExists: boolean;
    bcIoTDataIntegrityValidated: boolean;
    bcIoTHash: string;
    bcEventVerified: boolean;
    falsecode = '';
    gateInformation = [];
    bizLocationInformation = [];
    dashboardURL = 'https://grafana5.ips.biba.uni-bremen.de/d-solo/FhrdyH2Wk/nimble-epcis-iot-testbed';
    dashboardQuery: string;
    selectedBizLocation = '';

    constructor(private tntBackend: TnTService) { }

    ngOnChanges() {
        if (!this.events.length) {
            return;
        }
        this.getGateInfo();
        this.getBizLocInfo();

        if (this.events.length > 1) {
            // Display IoT information only if there was a previous event
            // Avoid calling this information on the last event
            this.bcIoTDataHashExists = false;
            this.bcIoTDataIntegrityValidated = false;
            this.bcIoTHash = '';
            this.displaySensorDashboard();
            this.callIoTBCApi();
        } else {
            // clear out any previous Sensor Data Dashboard
            this.dashboardQuery = '';
        }
    }

    getGateInfo() {
        if (this.debug) {
            console.log(this.events[0].readPoint);
        }
        const prefix = 'urn:epc:id:sgln:';
        this.tntBackend.getGateInfo(prefix + this.events[0].readPoint)
            .then(resp => {
                this.gateInformation = resp;
            }
            )
            .catch(err => {
                this.falsecode = err._body;
            });

    }

    getBizLocInfo() {
        if (this.debug) {
            console.log(this.events[0].bizLocation);
        }
        const prefix = 'urn:epc:id:sgln:';
        this.selectedBizLocation = prefix + this.events[0].bizLocation;
        this.tntBackend.getGateInfo(prefix + this.events[0].bizLocation)
            .then(resp => {
                this.bizLocationInformation = resp;
            }
            )
            .catch(err => {
                this.falsecode = err._body;
            });
    }

    displaySensorDashboard() {
        let fromTimeStamp = Number(this.events[1].eventTime);
        let toTimeStamp = Number(this.events[0].eventTime);
        this.dashboardQuery =
            `${this.dashboardURL}?var-bizLocation=${encodeURIComponent(this.selectedBizLocation)}` +
            `&from=${fromTimeStamp}&to=${toTimeStamp}&orgId=2&panelId=2"`;

        if (this.debug) {
            console.log(this.selectedBizLocation);
            console.log(this.dashboardQuery);
        }
    }

    callIoTBCApi() {
        let fromTimeStamp = moment(this.events[1].eventTime).toISOString();
        let toTimeStamp = moment(this.events[0].eventTime).toISOString();
        if (this.debug) {
            console.log(this.events[0].epc);
            console.log(fromTimeStamp);
            console.log(toTimeStamp);
        }
        let verification_query = {
            'productID': this.events[0].epc,
            'from': fromTimeStamp,
            'to': toTimeStamp
        };
        this.tntBackend.verifyIOTBC(verification_query)
            .then(resp => {
                if (this.debug) {
                    console.log(resp);
                }
                this.bcIoTDataHashExists = resp['exists'];
                this.bcIoTDataIntegrityValidated = resp['validated'];
                this.bcIoTHash = resp['hash'];
            }).catch(err => {
                console.log(err);
            })
    }

}
