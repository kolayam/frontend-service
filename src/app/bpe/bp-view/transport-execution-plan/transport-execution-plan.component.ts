/*
 * Copyright 2020
 * SRDC - Software Research & Development Consultancy; Ankara; Turkey
   In collaboration with
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

import { Component, OnInit } from "@angular/core";
import { CookieService } from "ng2-cookies";
import { Location } from "@angular/common";
import { Router } from "@angular/router";
import { BPDataService } from "../bp-data-service";
import { CallStatus } from "../../../common/call-status";
import { TransportExecutionPlanRequest } from "../../../catalogue/model/publish/transport-execution-plan-request";
import { BPEService } from "../../bpe.service";
import { UserService } from "../../../user-mgmt/user.service";
import { UBLModelUtils } from "../../../catalogue/model/ubl-model-utils";
import { TransportExecutionPlan } from "../../../catalogue/model/publish/transport-execution-plan";
import { BpUserRole } from "../../model/bp-user-role";
import { copy, selectPreferredValue } from '../../../common/utils';
import { Order } from "../../../catalogue/model/publish/order";
import { PresentationMode } from "../../../catalogue/model/publish/presentation-mode";
import { DocumentService } from '../document-service';
import { ThreadEventMetadata } from '../../../catalogue/model/publish/thread-event-metadata';

@Component({
    selector: "transport-execution-plan",
    templateUrl: "./transport-execution-plan.component.html"
})
export class TransportExecutionPlanComponent implements OnInit {

    request: TransportExecutionPlanRequest;
    response: TransportExecutionPlan;
    userRole: BpUserRole;
    productOrder?: Order;
    updatingProcess: boolean = false;

    contractCallStatus: CallStatus = new CallStatus();
    callStatus: CallStatus = new CallStatus();

    // the copy of ThreadEventMetadata of the current business process
    processMetadata: ThreadEventMetadata;

    selectPreferredValue = selectPreferredValue
    constructor(private bpDataService: BPDataService,
        private cookieService: CookieService,
        private userService: UserService,
        private bpeService: BPEService,
        private location: Location,
        private router: Router,
        private documentService: DocumentService) {
    }

    ngOnInit() {
        // get copy of ThreadEventMetadata of the current business process
        this.processMetadata = this.bpDataService.bpActivityEvent.processMetadata;

        if (!this.bpDataService.transportExecutionPlanRequest) {
            this.bpDataService.initTransportExecutionPlanRequestWithQuotation();
        }
        this.init();
    }

    init() {
        this.request = this.bpDataService.transportExecutionPlanRequest;
        this.response = this.bpDataService.transportExecutionPlan;
        this.productOrder = this.bpDataService.productOrder;
        this.userRole = this.bpDataService.bpActivityEvent.userRole;
        if (this.processMetadata && this.processMetadata.isBeingUpdated) {
            this.updatingProcess = true;
        }

        if (this.request.transportContract == null && this.bpDataService.precedingProcessId != null) {
            this.contractCallStatus.submit();
            this.bpeService.constructContractForProcess(this.bpDataService.precedingProcessId, this.request.transportServiceProviderParty.federationInstanceID).then(contract => {
                this.request.transportContract = contract;
                this.contractCallStatus.callback("Contract constructed", true);
            })
                .catch(error => {
                    this.contractCallStatus.error("Error while getting contract.", error);
                });
        }
    }

    isLoading(): boolean {
        return this.callStatus.fb_submitted;
    }

    isStarted(): boolean {
        return this.processMetadata && !this.processMetadata.isBeingUpdated && this.processMetadata.processStatus === "Started";
    }

    isFinished(): boolean {
        return this.processMetadata && this.processMetadata.processStatus === "Completed";
    }

    isRequestDisabled(): boolean {
        return this.isLoading() || this.isStarted() || this.isFinished();
    }

    getRequestPresentationMode(): PresentationMode {
        return this.isFinished() ? "view" : "edit";
    }

    isResponseDisabled(): boolean {
        return this.isLoading() || this.isFinished();
    }

    onBack(): void {
        this.location.back();
    }

    onSendRequest(): void {
        this.callStatus.submit();
        const transportationExecutionPlanRequest: TransportExecutionPlanRequest = copy(this.bpDataService.transportExecutionPlanRequest);

        // first initialize the seller and buyer parties.
        // once they are fetched continue with starting the ordering process
        const sellerId: string = UBLModelUtils.getPartyId(this.bpDataService.getCatalogueLine().goodsItem.item.manufacturerParty);
        const buyerId: string = this.cookieService.get("company_id");

        Promise.all([
            this.userService.getParty(buyerId),
            this.userService.getParty(sellerId, this.bpDataService.getCatalogueLine().goodsItem.item.manufacturerParty.federationInstanceID)
        ])
            .then(([buyerParty, sellerParty]) => {
                transportationExecutionPlanRequest.transportUserParty = buyerParty;
                transportationExecutionPlanRequest.transportServiceProviderParty = sellerParty;

                return this.bpeService.startProcessWithDocument(transportationExecutionPlanRequest, sellerParty.federationInstanceID);
            })
            .then(() => {
                this.callStatus.callback("Transport Execution Plan sent", true);
                var tab = "PURCHASES";
                if (this.bpDataService.bpActivityEvent.userRole == "seller")
                    tab = "SALES";
                this.router.navigate(['dashboard'], { queryParams: { tab: tab, ins: transportationExecutionPlanRequest.transportServiceProviderParty.federationInstanceID } });
            })
            .catch(error => {
                this.callStatus.error("Failed to send Transport Execution Plan", error);
            });
    }

    onUpdateRequest(): void {
        this.callStatus.submit();
        const transportationExecutionPlanRequest: TransportExecutionPlanRequest = copy(this.bpDataService.transportExecutionPlanRequest);

        this.bpeService.updateBusinessProcess(JSON.stringify(transportationExecutionPlanRequest), "TRANSPORTEXECUTIONPLANREQUEST", this.processMetadata.processInstanceId, this.processMetadata.sellerFederationId)
            .then(() => {
                this.documentService.updateCachedDocument(transportationExecutionPlanRequest.id, transportationExecutionPlanRequest);
                this.callStatus.callback("Item Information Request updated", true);
                var tab = "PURCHASES";
                if (this.bpDataService.bpActivityEvent.userRole == "seller")
                    tab = "SALES";
                this.router.navigate(['dashboard'], { queryParams: { tab: tab } });
            })
            .catch(error => {
                this.callStatus.error("Failed to update Item Information Request", error);
            });
    }

    onSendResponse(accepted: boolean) {
        this.callStatus.submit();
        this.response.documentStatusCode.name = accepted ? "Accepted" : "Rejected";

        //this.callStatus.submit();
        this.bpeService.startProcessWithDocument(this.bpDataService.transportExecutionPlan, this.bpDataService.transportExecutionPlan.transportServiceProviderParty.federationInstanceID)
            .then(res => {
                this.callStatus.callback("Transport Execution Plan sent", true);
                this.router.navigate(["dashboard"], { queryParams: { ins: this.bpDataService.transportExecutionPlan.transportServiceProviderParty.federationInstanceID } });
            }).catch(error => {
                this.callStatus.error("Failed to send Transport Execution Plan", error);
            });
    }

    onDispatchAdvice() {
        this.bpDataService.setCopyDocuments(false, false, false, false);
        this.bpDataService.proceedNextBpStep("seller", "Fulfilment");
    }

    isThereADeletedProduct(): boolean {
        for (let isProductDeleted of this.processMetadata.areProductsDeleted) {
            if (isProductDeleted) {
                return true;
            }
        }
        return false;
    }

    populateAreCatalogueLinesDeletedArray(): boolean[] {
        let areCatalogueLinesDeleted: boolean[] = [];
        if (this.processMetadata) {
            for (let isProductDeleted of this.processMetadata.areProductsDeleted) {
                if (isProductDeleted) {
                    areCatalogueLinesDeleted.push(true);
                }
                else {
                    areCatalogueLinesDeleted.push(false);
                }
            }
        }
        else {
            areCatalogueLinesDeleted.push(false);
        }

        return areCatalogueLinesDeleted;
    }
}
