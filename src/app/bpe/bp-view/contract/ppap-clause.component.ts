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
import { PpapResponse } from "../../../catalogue/model/publish/ppap-response";
import { DocumentReference } from "../../../catalogue/model/publish/document-reference";

@Component({
    selector: 'ppap-clause',
    templateUrl: './ppap-clause.component.html'
})
export class PpapClauseComponent implements OnInit {

    @Input() ppapResponse: PpapResponse;

    constructor() {
    }

    ngOnInit() {

    }

    downloadFile(doc: DocumentReference, event: Event): void {
        event.preventDefault();

        const binaryString = window.atob(doc.attachment.embeddedDocumentBinaryObject.value);
        const binaryLen = binaryString.length;
        const bytes = new Uint8Array(binaryLen);
        for (let i = 0; i < binaryLen; i++) {
            const ascii = binaryString.charCodeAt(i);
            bytes[i] = ascii;
        }
        const a = document.createElement("a");
        document.body.appendChild(a);
        const blob = new Blob([bytes], { type: doc.attachment.embeddedDocumentBinaryObject.mimeCode });
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = doc.attachment.embeddedDocumentBinaryObject.fileName;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}
