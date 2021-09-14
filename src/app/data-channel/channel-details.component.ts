/*
 * Copyright 2020
 * SRFG - Salzburg Research Forschungsgesellschaft mbH; Salzburg; Austria
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

import 'rxjs/add/operator/switchMap';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { DataChannelService } from "./data-channel.service";
import { Machine } from "./model/machine";
import { Sensor } from "./model/sensor";
import { Server } from "./model/server";
import * as moment from "moment";

class NewServer {
    constructor(
        public priority: string,
        public name: string,
        public address: string,
        public duration: string,
        public ownership: string,
        public login: string,
        public loginPW: string,
        public description: string
    ) {
    }
}

class NewSensor {
    constructor(
        public name: string,
        public interval: number,
        public description: string,
        public dataKey: string,
        public metadata: string,
        public advancedFiltering: string,
        public machineName: string
    ) {
    }
}



//-------------------------------------------------------------------------------------
// Component
//-------------------------------------------------------------------------------------
@Component({
    selector: 'channel-details',
    templateUrl: './channel-details.component.html',
    styleUrls: ['./channel-details.component.css']
})
export class ChannelDetailsComponent implements OnInit {

    public pageNumber: number = 0;
    public hasInternalService: boolean = false;
    private hasFilteringService: boolean = false;
    public displayStorageArea: boolean = true;
    private pageSubmitted: boolean = false;
    private pageRenegotiated: boolean = false;

    public channelConfig: object = {};
    private channelMessages: object[] = [];

    private SERVER_TYPES: string[] = ["MongoDB", "Oracle", "Mqtt", "Kafka"]

    public sellerMessage: string = '';
    private buyerMessage: string = '';

    private sellerServerType: string = '';
    private buyerServerType: string = '';

    private initialChannelServers: object[] = [];
    private counterChannelServers: object[] = [];

    private initialChannelSensors: object[] = [];
    private counterChannelSensors: object[] = [];

    private newServer: NewServer = new NewServer(null, null, null, null, null, null, null, null);
    private newSensor: NewSensor = new NewSensor(null, null, null, null, null, null, null);


    //-------------------------------------------------------------------------------------
    // CTOR
    //-------------------------------------------------------------------------------------
    constructor(
        private route: ActivatedRoute,
        private dataChannelService: DataChannelService,
        private router: Router
    ) { }

    //-------------------------------------------------------------------------------------
    // ngOnInit to update
    //-------------------------------------------------------------------------------------
    ngOnInit(): void {
        this.update();
    }

    //-------------------------------------------------------------------------------------
    // update
    //-------------------------------------------------------------------------------------
    update(): void {

        const channelID = this.route.snapshot.params['channelID'];

        // get metadata of channel
        this.dataChannelService.getChannelConfig(channelID)
            .then(channelConfig => {
                this.channelConfig = channelConfig;
                this.pageNumber = channelConfig.negotiationStepcounter % 5;
                this.sellerMessage = channelConfig.negotiationSellerMessages;
                this.buyerMessage = channelConfig.negotiationBuyerMessages;
                this.sellerServerType = channelConfig.sellerServersType;
                this.buyerServerType = channelConfig.buyerServersType;

                if (this.pageNumber == 1) {
                    this.dataChannelService.getChannelConfigFromNegotiationStep(channelID, channelConfig.negotiationStepcounter - 1)
                        .then(initialChannelConfig => {

                            this.initialChannelSensors = initialChannelConfig.associatedSensors;
                            this.initialChannelServers = initialChannelConfig.associatedServers;
                        })
                        .catch(() => {
                            alert("Error while doing getting historic step. Please make sure your local data-channel-service is running!");
                        });

                    this.counterChannelSensors = channelConfig.associatedSensors;
                    this.counterChannelServers = channelConfig.associatedServers;
                }

                else if (this.pageNumber == 2) {
                    this.dataChannelService.getChannelConfigFromNegotiationStep(channelID, channelConfig.negotiationStepcounter - 2)
                        .then(initialChannelConfig => {

                            this.initialChannelSensors = initialChannelConfig.associatedSensors;
                            this.initialChannelServers = initialChannelConfig.associatedServers;
                        })
                        .catch(() => {
                            alert("Error while doing getting historic step. Please make sure your local data-channel-service is running!");
                        });

                    this.dataChannelService.getChannelConfigFromNegotiationStep(channelID, channelConfig.negotiationStepcounter - 1)
                        .then(counterChannelConfig => {

                            this.counterChannelSensors = counterChannelConfig.associatedSensors;
                            this.counterChannelServers = counterChannelConfig.associatedServers;
                        })
                        .catch(() => {
                            alert("Error while doing getting historic step. Please make sure your local data-channel-service is running!");
                        });
                }

                else if (this.pageNumber == 3) {
                    this.dataChannelService.getChannelConfigFromNegotiationStep(channelID, channelConfig.negotiationStepcounter - 2)
                        .then(counterChannelConfig => {

                            this.counterChannelSensors = counterChannelConfig.associatedSensors;
                            this.counterChannelServers = counterChannelConfig.associatedServers;
                        })
                        .catch(() => {
                            alert("Error while doing getting historic step. Please make sure your local data-channel-service is running!");
                        });
                }


                if (this.pageNumber == 0) {
                    // get sensors
                    this.dataChannelService.getAssociatedSensors(channelID)
                        .then(sensors => {
                            this.initialChannelSensors = sensors;
                            this.counterChannelSensors = sensors;
                        });
                    // get servers
                    this.dataChannelService.getAssociatedServers(channelID)
                        .then(servers => {
                            this.initialChannelServers = servers;
                            this.counterChannelServers = servers;
                        });
                }
            })
            .catch(() => {
                alert("Error while getting channel config. Please make sure your local data-channel-service is running!");
            });


        // get setup internal service boolean
        this.dataChannelService.getInternalService()
            .then(bInternalService => {
                this.hasInternalService = bInternalService;
            });

        // get setup filtering service boolean
        this.dataChannelService.getFilteringService()
            .then(bFilteringService => {
                this.hasFilteringService = bFilteringService;
            });
    }

    //-------------------------------------------------------------------------------------
    // switch page visualisation left and right
    //-------------------------------------------------------------------------------------
    getPresentationModeLeft(): string {
        if (this.pageNumber == 0)
            return "edit";
        else
            return "view";
    }
    getPresentationModeRight(): string {
        if (this.pageNumber == 1)
            return "edit";
        else
            return "view";
    }

    //-------------------------------------------------------------------------------------
    // handle negotiation steps
    //-------------------------------------------------------------------------------------
    getCurrentNegotiationStep(step: number): any {
        if (step === this.pageNumber) {
            const result: any = {
                step: true,
                current: true
            };
            return result;
        }
        return { step: true }
    }

    //-------------------------------------------------------------------------------------
    // confirm current page
    //-------------------------------------------------------------------------------------
    confirmPage(): void {

        this.pageSubmitted = true;
        const channelId = this.channelConfig["channelID"];

        this.dataChannelService.doNegotiationStep(channelId, this.displayStorageArea,
            this.sellerMessage, this.buyerMessage,
            this.sellerServerType, this.buyerServerType)
            .then(() => {
                this.router.navigate(["dashboard"]);
            })
            .catch(() => {
                alert("Error while doing a negotiation step. Please make sure your local data-channel-service is running!");
            });
    }

    //-------------------------------------------------------------------------------------
    // renegotiate
    //-------------------------------------------------------------------------------------
    renegotiateTerms(numberOfSteps: number): void {

        this.pageRenegotiated = true;
        const channelId = this.channelConfig["channelID"];
        this.dataChannelService.renegotiate(channelId, numberOfSteps)
            .then(() => {
                this.router.navigate(["dashboard"]);
            })
            .catch(() => {
                alert("Error while doing a negotiation step. Please make sure your local data-channel-service is running!");
            });
    }

    //-------------------------------------------------------------------------------------
    // open a channel
    //-------------------------------------------------------------------------------------
    openChannel(): void {
        const channelId = this.channelConfig["channelID"];
        this.dataChannelService.startChannel(channelId)
            .then(() => {
                location.reload();
                //this.router.navigate(["dashboard"]);
                alert("Opened Channel");
            })
            .catch(() => {
                alert("Error while opening channel. Please make sure your local data-channel-service is running!");
            });
    }

    //-------------------------------------------------------------------------------------
    // close a channel
    //-------------------------------------------------------------------------------------
    closeChannel(): void {
        const channelId = this.channelConfig["channelID"];
        this.dataChannelService.closeChannel(channelId)
            .then(() => {
                location.reload();
                //this.router.navigate(["dashboard"]);
                alert("Closed Channel");
            })
            .catch(() => {
                alert("Error while closing channel. Please make sure your local data-channel-service is running!");
            });
    }

    //-------------------------------------------------------------------------------------
    // add a private DB server
    //-------------------------------------------------------------------------------------
    addServer(): void {
        const server = new Server(this.newServer.priority, this.newServer.name, this.newServer.address,
            this.newServer.duration, this.newServer.ownership,
            this.newServer.login, this.newServer.loginPW, this.newServer.description);

        // add to backend
        const channelId = this.channelConfig["channelID"];
        this.dataChannelService.addServersForChannel(channelId, server)
            .then(addedServer => {
                this.update();
            })
            .catch(() => {
                alert("Error while adding server. Please make sure your local data-channel-service is running!");
            });
    }

    //-------------------------------------------------------------------------------------
    // remove a private DB server
    //-------------------------------------------------------------------------------------
    removeServer(server: Server): void {
        const channelId = this.channelConfig["channelID"];

        this.dataChannelService.removeServerForChannel(channelId, server)
            .then(() => {
                this.update();
            })
            .catch(() => {
                this.update();
            });
    }

    //-------------------------------------------------------------------------------------
    // add a sensor
    //-------------------------------------------------------------------------------------
    addSensor(): void {

        if (!this.hasFilteringService) {
            this.newSensor.dataKey = "not installed";
            this.newSensor.metadata = "not installed";
            this.newSensor.advancedFiltering = "not installed";
        }

        // create sensor locally
        const machine = new Machine(this.newSensor.machineName, null, null);
        const sensor = new Sensor(this.newSensor.name, this.newSensor.interval, this.newSensor.description,
            this.newSensor.dataKey, this.newSensor.metadata, this.newSensor.advancedFiltering,
            machine);

        // add to backend
        const channelId = this.channelConfig["channelID"];
        this.dataChannelService.addSensor(channelId, sensor)
            .then(addedSensor => {
                this.update();
            })
            .catch(() => {
                alert("Error while adding sensor. Please make sure your local data-channel-service is running!");
            });
    }

    //-------------------------------------------------------------------------------------
    // remove a sensor
    //-------------------------------------------------------------------------------------
    removeSensor(sensor: Sensor): void {
        const channelId = this.channelConfig["channelID"];

        this.dataChannelService.removeSensor(channelId, sensor)
            .then(() => {
                this.update();
            })
            .catch(() => {
                this.update();
            });
    }

    //-------------------------------------------------------------------------------------
    // check if channel is closed or open
    //-------------------------------------------------------------------------------------
    checkClosed(): boolean {
        let start;
        let end;
        if (this.channelConfig && this.channelConfig["startDateTime"])
            start = moment(this.channelConfig["startDateTime"]);
        else
            return true;
        if (this.channelConfig && this.channelConfig["endDateTime"])
            end = moment(this.channelConfig["endDateTime"]);
        else
            return false;
        if (start.isBefore(end))
            return true;
        else
            return false;
    }

}
