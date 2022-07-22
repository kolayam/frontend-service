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

import { Component, Input } from "@angular/core";
import { BPDataService } from "../bp-data-service";
import { BPEService } from "../../bpe.service";
import { ActivatedRoute } from "@angular/router";
import { PpapResponse } from "../../../catalogue/model/publish/ppap-response";
import { Ppap } from "../../../catalogue/model/publish/ppap";
import { DocumentReference } from "../../../catalogue/model/publish/document-reference";
import { Location } from "@angular/common";
import { BinaryObject } from "../../../catalogue/model/publish/binary-object";
import { DocumentService } from "../document-service";

interface UploadedDocuments {
    [doc: string]: BinaryObject[];
}

@Component({
    selector: "ppap-document-download",
    templateUrl: "./ppap-document-download.component.html",
    styleUrls: ["./ppap-document-download.component.css"]
})
export class PpapDocumentDownloadComponent {

    @Input() ppapResponse: PpapResponse;
    @Input() ppap: Ppap;
    // whether the item is deleted or not
    @Input() isCatalogueLineDeleted: boolean = false;

    processMetadata;
    ppapDocuments: DocumentReference[] = [];
    notes: string[];
    notesBuyer: string[];
    additionalDocuments: DocumentReference[];
    additionalDocumentsBuyer: DocumentReference[];
    documents: UploadedDocuments = {};
    keys = [];

    requestedDocuments = [];

    constructor(private bpDataService: BPDataService,
        private bpeService: BPEService,
        private route: ActivatedRoute,
        private location: Location,
        private documentService: DocumentService) {
    }

    ngOnInit() {
        this.processMetadata = this.bpDataService.bpActivityEvent.processMetadata;

        if (!this.ppapResponse) {
            this.route.params.subscribe(params => {
                const processid = params['processInstanceId'];

                this.bpeService.getProcessDetailsHistory(processid, this.processMetadata.sellerFederationId).then(task => {
                    return Promise.all([
                        this.documentService.getInitialDocument(task, this.processMetadata.sellerFederationId),
                        this.documentService.getResponseDocument(task, this.processMetadata.sellerFederationId)
                    ]).then(([initialDocument, responseDocument]) => {
                        this.ppap = initialDocument as Ppap;
                        this.ppapResponse = responseDocument as PpapResponse;
                        this.initFromPpap();
                    });
                });
            });
        } else {
            if (!this.ppap) {
                throw new Error("ppap must be set if ppapResponse is set.");
            }
            this.initFromPpap();
        }

    }

    private initFromPpap() {
        this.notesBuyer = this.ppap.note;
        this.additionalDocumentsBuyer = this.ppap.additionalDocumentReference;
        this.ppapDocuments = this.ppapResponse.requestedDocument;

        for (let i = 0; i < this.ppapDocuments.length; i++) {
            if (!(this.ppapDocuments[i].documentType in this.documents)) {
                this.documents[this.ppapDocuments[i].documentType] = [
                    this.ppapDocuments[i].attachment.embeddedDocumentBinaryObject
                ];
            } else {
                this.documents[this.ppapDocuments[i].documentType].push(
                    this.ppapDocuments[i].attachment.embeddedDocumentBinaryObject
                );
            }
        }
        this.notes = this.ppapResponse.note;
        this.additionalDocuments = this.ppapResponse.additionalDocumentReference;
        this.keys = Object.keys(this.documents);

        this.requestedDocuments = this.ppap.documentType;
    }

    onBack() {
        this.location.back();
    }

    onNextStep() {
        this.bpDataService.proceedNextBpStep(this.bpDataService.bpActivityEvent.userRole, "Negotiation");
    }

    isNextStepDisabled(): boolean {
        return this.bpDataService.isFinalProcessInTheWorkflow('Ppap') || this.isCatalogueLineDeleted || this.processMetadata.collaborationStatus == 'COMPLETED';
    }

    isBuyer(): boolean {
        return this.bpDataService.bpActivityEvent.userRole === "buyer";
    }

    showNextStepButton() {
        return !this.bpDataService.isFinalProcessInTheWorkflow('Ppap') && this.processMetadata.collaborationStatus != "CANCELLED";
    }
}
