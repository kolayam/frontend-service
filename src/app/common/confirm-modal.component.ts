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

import {Component, ElementRef, ViewChild} from '@angular/core';
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";

@Component({
    selector: "confirm-modal",
    templateUrl: "./confirm-modal.component.html",
    styleUrls: ["./confirm-modal.component.css"]
})
export class ConfirmModalComponent {

    private text: string = null;

    @ViewChild("modal") modal: ElementRef;

    constructor(private modalService: NgbModal) {
    }


    open(text:string):Promise<boolean> {
        this.text = text;
        return this.modalService.open(this.modal,{windowClass: 'high-z-index'}).result.then(() => {
            return true;
        }).catch(error => {
            return false;
        });
    }
}
