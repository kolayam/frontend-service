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
import { Contract } from "../../../catalogue/model/publish/contract";

@Component({
    selector: 'contract',
    templateUrl: './contract.component.html',
    styleUrls: ["./contract.component.css"]
})
export class ContractComponent {
    @Input() contract: Contract = null;
    @Input() sellerFederationId: string = null;
    @Input() showQuotation: boolean = false;
    @Input() collapsable: boolean = true;
    // whether the item is deleted or not
    @Input() areCatalogueLinesDeleted: boolean[];
    @Input() selectedLineIndex: number;
    showClauses: boolean = false;

    constructor() {
    }
}
