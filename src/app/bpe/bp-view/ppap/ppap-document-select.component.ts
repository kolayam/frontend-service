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

import { Component, Input, OnInit } from "@angular/core";
import { BPEService } from "../../bpe.service";
import { UserService } from "../../../user-mgmt/user.service";
import { CookieService } from "ng2-cookies";
import { BPDataService } from "../bp-data-service";
import { CustomerParty } from "../../../catalogue/model/publish/customer-party";
import { SupplierParty } from "../../../catalogue/model/publish/supplier-party";
import { UBLModelUtils } from "../../../catalogue/model/ubl-model-utils";
import { Ppap } from "../../../catalogue/model/publish/ppap";
import { CallStatus } from "../../../common/call-status";
import { ActivatedRoute, Router } from "@angular/router";
import { Location } from "@angular/common";
import { copy } from "../../../common/utils";
import { Certificate } from "../../../user-mgmt/model/certificate";
import { DocumentService } from '../document-service';
import { DocumentReference } from '../../../catalogue/model/publish/document-reference';
import { ThreadEventMetadata } from '../../../catalogue/model/publish/thread-event-metadata';

type PpapLevels = [boolean, boolean, boolean, boolean, boolean]

interface PpapDocument {
    name: string
    levels: PpapLevels
}

@Component({
    selector: "ppap-document-select",
    templateUrl: "./ppap-document-select.component.html",
    styleUrls: ["./ppap-document-select.component.css"]
})
export class PpapDocumentSelectComponent implements OnInit {

    callStatus: CallStatus = new CallStatus();
    ppap: Ppap;


    /** The ppap level ,goes from 0 (level 1) to 4 (level 5). */
    level: number = 0;

    /** All available Ppap documents and if they should be checked for each level. */
    DOCUMENTS: PpapDocument[] = [
        { name: "Design Documentation", levels: [false, true, true, true, true] },
        { name: "Engineering Change Documentation", levels: [false, true, true, true, true] },
        { name: "Customer Engineering Approval", levels: [false, false, true, false, true] },
        { name: "Design Failure Mode and Effects Analysis", levels: [false, false, true, false, true] },
        { name: "Process Flow Diagram", levels: [false, false, true, false, true] },
        { name: "Process Failure Mode and Effects Analysis", levels: [false, false, true, false, true] },
        { name: "Control Plan", levels: [false, false, true, false, true] },
        { name: "Measurement System Analysis Studies", levels: [false, false, true, false, true] },
        { name: "Dimensional Results", levels: [false, true, true, true, true] },
        { name: "Records of Material / Performance Tests", levels: [false, true, true, true, true] },
        { name: "Initial Process Studies", levels: [false, false, true, false, true] },
        { name: "Qualified Laboratory Documentation", levels: [false, true, true, true, true] },
        { name: "Appearance Approval Report", levels: [true, true, true, true, true] },
        { name: "Sample Production Parts", levels: [false, true, true, true, true] },
        { name: "Master Sample", levels: [false, false, false, true, true] },
        { name: "Checking Aids", levels: [false, false, false, true, true] },
        { name: "Customer Specific Requirements", levels: [false, false, false, true, false] },
        { name: "Part Submission Warrant", levels: [true, true, true, true, true] }
    ];

    /** The currently selected documents. */
    selectedDocuments: boolean[];

    /** The note. */
    notes: string[] = [''];
    /** The currently selected additional documents*/
    additionalDocuments: DocumentReference[] = [];

    /** Whether the definition of PPAP is visible or not. */
    showDetails = false;

    // the copy of ThreadEventMetadata of the current business process
    processMetadata: ThreadEventMetadata;

    constructor(private bpeService: BPEService,
        private bpDataService: BPDataService,
        private userService: UserService,
        private cookieService: CookieService,
        private route: ActivatedRoute,
        private router: Router,
        private documentService: DocumentService,
        private location: Location) {
    }

    ngOnInit() {
        // get copy of ThreadEventMetadata of the current business process
        this.processMetadata = this.bpDataService.bpActivityEvent.processMetadata;

        this.computeSelectedDocuments();

        this.route.params.subscribe(params => {
            if (params['processInstanceId'] !== 'new' && this.processMetadata) {
                this.level = 0;
                this.resetSelectedDocumens();
                this.ppap = this.bpDataService.ppap;
                this.notes = this.ppap.note;
                this.additionalDocuments = this.ppap.additionalDocumentReference;
                this.ppap.documentType.forEach(name => {
                    const index = this.DOCUMENTS.findIndex(doc => doc.name === name);
                    if (index >= 0) {
                        this.selectedDocuments[index] = true;
                    }
                });
            }
        });
    }

    isRequestSent(): boolean {
        return !!this.processMetadata && !this.processMetadata.isBeingUpdated;
    }

    isLoading(): boolean {
        return this.callStatus.fb_submitted;
    }

    areAllDocumentsAvailable(): boolean {
        for (let i = 0; i < this.selectedDocuments.length; i++) {
            if (this.selectedDocuments[i]) {
                const name = this.DOCUMENTS[i].name;
                if (!this.isDocumentAvailable(name)) {
                    return false;
                }
            }
        }

        return true;
    }

    isDocumentAvailable(name: string): boolean {
        return !!this.getCertificate(name);
    }

    onDownload(name: string): void {
        const certificate = this.getCertificate(name);
        if (!certificate) {
            return;
        }
        this.userService.downloadCert(certificate.id);
    }

    private getCertificate(name: string): Certificate | null {
        const settings = this.bpDataService.getCompanySettings();

        for (const certificate of settings.certificates) {
            if (certificate.type === name) {
                return certificate;
            }
        }

        return null;
    }

    onBack() {
        this.location.back();
    }

    onSkip() {
        this.bpDataService.proceedNextBpStep(this.bpDataService.bpActivityEvent.userRole, "Negotiation");
    }

    onSendRequest() {
        this.ppap = UBLModelUtils.createPpap([]);
        this.ppap.note = this.notes;
        this.ppap.additionalDocumentReference = this.additionalDocuments;
        this.ppap.documentType = this.DOCUMENTS.filter((_, i) => this.selectedDocuments[i]).map(doc => doc.name);
        this.ppap.lineItem.item = copy(this.bpDataService.modifiedCatalogueLines[0].goodsItem.item);

        let sellerId = UBLModelUtils.getPartyId(this.bpDataService.getCatalogueLine().goodsItem.item.manufacturerParty);
        let buyerId = this.cookieService.get("company_id");

        this.callStatus.submit();
        this.userService.getParty(buyerId).then(buyerParty => {
            this.ppap.buyerCustomerParty = new CustomerParty(buyerParty);

            this.userService.getParty(sellerId, this.bpDataService.getCatalogueLine().goodsItem.item.manufacturerParty.federationInstanceID).then(sellerParty => {
                this.ppap.sellerSupplierParty = new SupplierParty(sellerParty);
                this.bpeService
                    .startProcessWithDocument(this.ppap, sellerParty.federationInstanceID)
                    .then(() => {
                        this.callStatus.callback("Ppap request sent", true);
                        this.router.navigate(["dashboard"], { queryParams: { ins: sellerParty.federationInstanceID } });
                    })
                    .catch(error => {
                        this.callStatus.error("Failed to send Ppap request", error);
                    });
            })
                .catch(error => {
                    this.callStatus.error("Failed to send Ppap request", error);
                });
        })
            .catch(error => {
                this.callStatus.error("Failed to send Ppap request", error);
            });
    }

    onUpdateRequest(): void {
        this.callStatus.submit();

        const ppap: Ppap = copy(this.bpDataService.ppap);

        ppap.note = this.notes;
        ppap.additionalDocumentReference = this.additionalDocuments;
        ppap.documentType = this.DOCUMENTS.filter((_, i) => this.selectedDocuments[i]).map(doc => doc.name);

        this.bpeService.updateBusinessProcess(JSON.stringify(ppap), "PPAPREQUEST", this.processMetadata.processInstanceId, this.processMetadata.sellerFederationId)
            .then(() => {
                this.documentService.updateCachedDocument(ppap.id, ppap);
                this.callStatus.callback("Ppap request updated", true);
                var tab = "PURCHASES";
                if (this.bpDataService.bpActivityEvent.userRole == "seller")
                    tab = "SALES";
                this.router.navigate(['dashboard'], { queryParams: { tab: tab } });
            })
            .catch(error => {
                this.callStatus.error("Failed to update Ppap request", error);
            });
    }

    private resetSelectedDocumens() {
        this.selectedDocuments = this.DOCUMENTS.map(() => false);
    }

    public computeSelectedDocuments() {
        this.selectedDocuments = this.DOCUMENTS.map(doc => doc.levels[this.level]);
    }
}
