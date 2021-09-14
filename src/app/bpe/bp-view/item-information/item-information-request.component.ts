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
import { BPDataService } from "../bp-data-service";
import { BPEService } from "../../bpe.service";
import { CookieService } from "ng2-cookies";
import { UserService } from "../../../user-mgmt/user.service";
import { CallStatus } from "../../../common/call-status";
import { Router } from "@angular/router";
import { Location } from "@angular/common";
import { ItemInformationRequest } from "../../../catalogue/model/publish/item-information-request";
import { DocumentReference } from "../../../catalogue/model/publish/document-reference";
import { BinaryObject } from "../../../catalogue/model/publish/binary-object";
import { Attachment } from "../../../catalogue/model/publish/attachment";
import { UBLModelUtils } from "../../../catalogue/model/ubl-model-utils";
import { CustomerParty } from "../../../catalogue/model/publish/customer-party";
import { SupplierParty } from "../../../catalogue/model/publish/supplier-party";
import { copy, isTransportService } from "../../../common/utils";
import { PresentationMode } from "../../../catalogue/model/publish/presentation-mode";
import { DocumentService } from '../document-service';
import { ThreadEventMetadata } from '../../../catalogue/model/publish/thread-event-metadata';

@Component({
    selector: "item-information-request",
    templateUrl: "./item-information-request.component.html",
    styleUrls: ["./item-information-request.component.css"]
})
export class ItemInformationRequestComponent implements OnInit {

    callStatus: CallStatus = new CallStatus();

    request: ItemInformationRequest;
    files: BinaryObject[]

    // the copy of ThreadEventMetadata of the current business process
    processMetadata: ThreadEventMetadata;

    constructor(private bpeService: BPEService,
        private bpDataService: BPDataService,
        private userService: UserService,
        private cookieService: CookieService,
        private location: Location,
        private documentService: DocumentService,
        private router: Router) {

    }

    ngOnInit() {
        if (this.bpDataService.itemInformationRequest == null) {
            // initiating a new business process from scratch
            this.bpDataService.initItemInformationRequest();
            // for now we reset the item specification document list in order not to show documents from previous steps
            this.bpDataService.itemInformationRequest.itemInformationRequestLine[0].salesItem[0].item.itemSpecificationDocumentReference = [];
        }

        // get copy of ThreadEventMetadata of the current business process
        this.processMetadata = this.bpDataService.bpActivityEvent.processMetadata;

        this.request = this.bpDataService.itemInformationRequest;
        const documents = this.request.itemInformationRequestLine[0].salesItem[0].item.itemSpecificationDocumentReference;
        this.files = documents.map(doc => doc.attachment.embeddedDocumentBinaryObject);
    }

    onBack(): void {
        this.location.back();
    }

    isRequestSent() {
        return !!this.processMetadata && !this.processMetadata.isBeingUpdated;
    }

    getPresentationMode(): PresentationMode {
        return this.isRequestSent() ? "view" : "edit";
    }

    onSkip(): void {
        if (isTransportService(this.bpDataService.getCatalogueLine()) || !this.bpDataService.getCompanySettings().tradeDetails.ppapCompatibilityLevel) {
            this.bpDataService.proceedNextBpStep(this.bpDataService.bpActivityEvent.userRole, "Negotiation");
        } else {
            this.bpDataService.proceedNextBpStep(this.bpDataService.bpActivityEvent.userRole, "Ppap");
        }
    }

    onSendRequest(): void {
        this.callStatus.submit();
        const itemInformationRequest: ItemInformationRequest = copy(this.bpDataService.itemInformationRequest);

        //first initialize the seller and buyer parties.
        //once they are fetched continue with starting the ordering process
        const sellerId: string = UBLModelUtils.getPartyId(this.bpDataService.getCatalogueLine().goodsItem.item.manufacturerParty);
        const buyerId: string = this.cookieService.get("company_id");

        Promise.all([
            this.userService.getParty(buyerId),
            this.userService.getParty(sellerId, this.bpDataService.getCatalogueLine().goodsItem.item.manufacturerParty.federationInstanceID)
        ])
            .then(([buyerParty, sellerParty]) => {
                itemInformationRequest.buyerCustomerParty = new CustomerParty(buyerParty);
                itemInformationRequest.sellerSupplierParty = new SupplierParty(sellerParty);

                return this.bpeService.startProcessWithDocument(itemInformationRequest, sellerParty.federationInstanceID);
            })
            .then(() => {
                this.callStatus.callback("Item Information Request sent", true);
                var tab = "PURCHASES";
                if (this.bpDataService.bpActivityEvent.userRole == "seller")
                    tab = "SALES";
                this.router.navigate(['dashboard'], { queryParams: { tab: tab, ins: itemInformationRequest.sellerSupplierParty.party.federationInstanceID } });
            })
            .catch(error => {
                this.callStatus.error("Failed to send Item Information Request", error);
            });
    }

    onUpdateRequest(): void {
        this.callStatus.submit();
        const itemInformationRequest: ItemInformationRequest = copy(this.bpDataService.itemInformationRequest);

        this.bpeService.updateBusinessProcess(JSON.stringify(itemInformationRequest), "ITEMINFORMATIONREQUEST", this.processMetadata.processInstanceId, this.processMetadata.sellerFederationId)
            .then(() => {
                this.documentService.updateCachedDocument(itemInformationRequest.id, itemInformationRequest);
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

    onSelectItemSpecificationFile(binaryObject: BinaryObject): void {
        const documents = this.getRequestDocuments();
        const document: DocumentReference = new DocumentReference();
        const attachment: Attachment = new Attachment();
        attachment.embeddedDocumentBinaryObject = binaryObject;
        document.attachment = attachment;
        documents.push(document);
    }

    onUnselectItemSpecificationFile(binaryObject: BinaryObject): void {
        const documents = this.getRequestDocuments();
        const index = documents.findIndex(doc => doc.attachment.embeddedDocumentBinaryObject === binaryObject);
        if (index >= 0) {
            documents.splice(index, 1);
        }
    }

    getDataSheetFileClasses(): any {
        return {
            "no-document": !this.hasUploadedDocument(),
            disabled: this.isLoading() || this.isRequestSent()
        };
    }

    getDataSheetFileName(): string {
        const docs = this.getRequestDocuments();
        return docs.length > 0 ? docs[0].attachment.embeddedDocumentBinaryObject.fileName : "Choose a file...";
    }

    getRequestDocuments(): DocumentReference[] {
        return this.request.itemInformationRequestLine[0].salesItem[0].item.itemSpecificationDocumentReference;
    }

    hasUploadedDocument(): boolean {
        return this.getRequestDocuments().length > 0;
    }

    isLoading(): boolean {
        return this.callStatus.fb_submitted;
    }

    isEmpty(): boolean {
        var empty = true;
        if (this.request.note.length > 1 || (this.request.note.length == 1 && this.request.note[0] != ""))
            empty = false;
        else if (this.request.additionalDocumentReference.length > 0)
            empty = false;
        else if (this.getRequestDocuments().length > 0)
            empty = false;
        return empty;
    }
}
