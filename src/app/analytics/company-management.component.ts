/*
 * Copyright 2020
 * SRFG - Salzburg Research Forschungsgesellschaft mbH; Salzburg; Austria
   In collaboration with
 * SRDC - Software Research & Development Consultancy; Ankara; Turkey
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

import { Component, OnInit, Input } from "@angular/core";
import { CompanyManagementTab } from "./model/company-management-tab";

@Component({
    selector: "company-management",
    templateUrl: "./company-management.component.html",
    styleUrls: ["./company-management.component.css"]
})
export class CompanyManagementComponent implements OnInit {

    @Input() showOverview: boolean = true;

    selectedTab: CompanyManagementTab;

    constructor() {
    }

    ngOnInit(): void {
        this.selectedTab = this.showOverview ? "UNVERIFIED" : "VERIFIED";
    }

    onSelectTab(event: any, id: any): void {
        event.preventDefault();
        this.selectedTab = id;
    }

}
