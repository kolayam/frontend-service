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

import { Component, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AddressSubForm } from './address.component';
import { DeliveryTerms } from '../model/delivery-terms';
import { Address } from '../model/address';
import { DEFAULT_LANGUAGE } from '../../catalogue/model/constants';

@Component({
    moduleId: module.id,
    selector: 'delivery-terms-form',
    templateUrl: 'delivery-terms.component.html',
    styleUrls: ['delivery-terms.component.css']
})

export class DeliveryTermsSubForm {

    @Input('group') deliveryTermsForm: FormGroup;

    constructor(
    ) {
    }

    public static setAddress(deliveryTermsForm, address: Address) {
        AddressSubForm.update(deliveryTermsForm.controls.deliveryAddress, address);
    }

    public static update(deliveryTermsForm: FormGroup, deliveryTerms: DeliveryTerms): FormGroup {
        this.updateSpecialTerms(deliveryTermsForm, deliveryTerms.specialTerms);
        AddressSubForm.update(deliveryTermsForm.controls["deliveryAddress"] as FormGroup, deliveryTerms.deliveryAddress);
        deliveryTermsForm.controls.estimatedDeliveryTime.setValue(deliveryTerms.estimatedDeliveryTime);
        return deliveryTermsForm;
    }

    // To handle special terms, one FormGroup is created. However, to support multilinguality properly,
    // more than one FormGroup is necessary. Currently, the user only can have one special term in the default language of browser.
    public static generateForm(builder: FormBuilder) {
        return builder.group({
            specialTerms: builder.group({
                value: [""],
                languageID: [DEFAULT_LANGUAGE()]
            }),
            deliveryAddress: AddressSubForm.generateForm(builder),
            estimatedDeliveryTime: ['', Validators.pattern('\\d+')] // only digits
        });
    }

    private static updateSpecialTerms(deliveryTermsForm: FormGroup, specialTerms: Object) {
        let keys = Object.keys(specialTerms);
        if (keys.length > 0) {
            let formGroup = deliveryTermsForm.controls.specialTerms as FormGroup;
            // For now, there might be just one special terms. This is why we use the initial key.
            formGroup.controls.value.setValue(specialTerms[keys[0]]);
            formGroup.controls.languageID.setValue(keys[0]);
        }
    }
}
