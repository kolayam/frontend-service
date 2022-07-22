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

import { Component, OnInit, Input } from "@angular/core";
import { CompanySettings } from "../model/company-settings";
import { CallStatus } from "../../common/call-status";
import { UserService } from "../user.service";
import { CookieService } from "ng2-cookies";
import {AppComponent} from '../../app.component';

@Component({
    selector: "company-categories-settings",
    templateUrl: "./company-categories-settings.component.html"
})
export class CompanyCategoriesSettingsComponent implements OnInit {

    @Input() settings: CompanySettings;

    prefCats = [];
    recCats = [];
    prefCategoriesCallStatus: CallStatus[] = [];
    recCategoriesCallStatus: CallStatus[] = [];

    constructor(private cookieService: CookieService,
        private appComponent: AppComponent,
        private userService: UserService) {

    }

    ngOnInit() {
        this.prefCats = this.settings.preferredProductCategories;
        this.recCats = this.settings.recentlyUsedProductCategories;
        this.prefCats.sort((a, b) => a.split("::")[2].localeCompare(b.split("::")[2]));
        this.recCats.sort((a, b) => a.split("::")[2].localeCompare(b.split("::")[2]));
        this.prefCategoriesCallStatus = this.prefCats.map(() => new CallStatus());
        this.recCategoriesCallStatus = this.recCats.map(() => new CallStatus());
    }

    removePrefCat(cat: string, i: number) {
        this.appComponent.confirmModalComponent.open("Are you sure that you want to remove this category from your favorites?").then(result => {
            if(result){
                this.prefCategoriesCallStatus[i].submit();
                let userId = this.cookieService.get("user_id");
                this.userService.togglePrefCat(userId, cat).then(res => {
                    this.prefCats = res;
                    this.prefCats.sort((a, b) => a.split("::")[2].localeCompare(b.split("::")[2]));
                    this.prefCategoriesCallStatus[i].callback("Succesfully removed category from favorites", true);
                })
                    .catch(error => {
                        this.prefCategoriesCallStatus[i].error("Error while removing category from favourites", error);
                    });
            }
        });
    }

    removeRecCat(cat: string, i: number) {
        this.appComponent.confirmModalComponent.open("Are you sure that you want to remove this category from your recently used ones?").then(result => {
            if(result){
                this.recCategoriesCallStatus[i].submit();
                let userId = this.cookieService.get("user_id");
                this.userService.removeRecCat(userId, cat).then(res => {
                    this.recCats = res;
                    this.recCats.sort((a, b) => a.split("::")[2].localeCompare(b.split("::")[2]));
                    this.recCategoriesCallStatus[i].callback("Succesfully removed category from recently used", true);
                })
                    .catch(error => {
                        this.recCategoriesCallStatus[i].error("Error while removing category from recently used", error);
                    });
            }
        });
    }

}
