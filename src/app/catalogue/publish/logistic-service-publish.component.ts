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

import {Component, OnDestroy, OnInit} from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { UBLModelUtils } from '../model/ubl-model-utils';
import { Location } from '@angular/common';
import { PublishService } from '../publish-and-aip.service';
import { CatalogueService } from '../catalogue.service';
import { UserService } from '../../user-mgmt/user.service';
import { CookieService } from 'ng2-cookies';
import { CategoryService } from '../category/category.service';
import { CallStatus } from '../../common/call-status';
import { copy, removeHjids } from '../../common/utils';
import { CataloguePaginationResponse } from '../model/publish/catalogue-pagination-response';
import { CompanyNegotiationSettings } from '../../user-mgmt/model/company-negotiation-settings';
import { PublishMode } from '../model/publish/publish-mode';
import { CatalogueLine } from '../model/publish/catalogue-line';
import { Attachment } from '../model/publish/attachment';
import { BinaryObject } from '../model/publish/binary-object';
import { DocumentReference } from '../model/publish/document-reference';
import { Item } from '../model/publish/item';
import { ItemProperty } from '../model/publish/item-property';
import { TransportationService } from '../model/publish/transportation-service';
import { Catalogue } from '../model/publish/catalogue';
import * as myGlobals from '../../globals';
import { Category } from '../../common/model/category/category';
import { PublishingPropertyService } from './publishing-property.service';
import { AppComponent } from "../../app.component";
import { Subject } from 'rxjs';
import 'rxjs/add/operator/takeUntil';
import {NonPublicInformation} from '../model/publish/non-public-information';
import {MultiTypeValue} from '../model/publish/multi-type-value';
import {Text} from '../model/publish/text';
import {Quantity} from '../model/publish/quantity';

@Component({
    selector: "logistic-service-publish",
    templateUrl: "./logistic-service-publish.component.html",
    styleUrls: ["./logistic-service-publish.component.css"]
})
export class LogisticServicePublishComponent implements OnInit , OnDestroy{

    constructor(public categoryService: CategoryService,
        private catalogueService: CatalogueService,
        public publishStateService: PublishService,
        private userService: UserService,
        private route: ActivatedRoute,
        private router: Router,
        private location: Location,
        private cookieService: CookieService,
        private logisticPublishingService: PublishingPropertyService,
        private appComponent: AppComponent) {
    }

    config = myGlobals.config;
    // check whether product id conflict exists or not
    sameIdError = false;
    // the value of the erroneousID
    erroneousID = "";

    // represents the logistic service in 'edit' and 'copy' publish modes
    catalogueLine: CatalogueLine = null;

    publishMode: PublishMode;
    publishStatus: CallStatus = new CallStatus();
    companyNegotiationSettings: CompanyNegotiationSettings;

    callStatus: CallStatus = new CallStatus();

    // selected tab
    selectedTabSinglePublish = "TRANSPORT";
    // publish mode of each logistic services
    logisticPublishMode: Map<string, string> = null;
    // catalogue lines of each logistic services
    logisticCatalogueLines: Map<string, CatalogueLine> = null;
    // this is the object which is taken from the catalog service and it gives us the logistic service-category uri pairs for each taxonomy id
    logisticRelatedServices = null;
    // available logistics services
    availableLogisticsServices = [];
    dialogBox = true;
    // furniture ontology categories which are used to represent Logistic Services
    furnitureOntologyLogisticCategories: Category[] = null;

    showRoadTransportService: boolean = true;
    showMaritimeTransportService: boolean = false;
    showAirTransportService: boolean = false;
    showRailTransportService: boolean = false;

    ngUnsubscribe: Subject<void> = new Subject<void>();
    private translations: any;

    ngOnInit() {
        this.appComponent.translate.get(['Successfully saved. You can now continue.', 'Successfully saved. You are now getting redirected.']).takeUntil(this.ngUnsubscribe).subscribe((res: any) => {
            this.translations = res;
        });
        const userId = this.cookieService.get("user_id");
        this.callStatus.submit();

        Promise.all([
            this.userService.getUserParty(userId),
            this.logisticPublishingService.getCachedLogisticRelatedServices(this.config.standardTaxonomy)
        ]).then(([party, logisticRelatedServices]) => {
            this.logisticRelatedServices = logisticRelatedServices;
            let keys = Object.keys(this.logisticRelatedServices);
            // get category uris for logistic services
            let eClassCategoryUris = keys.indexOf("eClass") != -1 ? this.getCategoryUrisForTaxonomyId("eClass") : null;
            let furnitureOntologyCategoryUris = keys.indexOf("FurnitureOntology") != -1 ? this.getCategoryUrisForTaxonomyId("FurnitureOntology") : null;
            return Promise.all([
                Promise.resolve(party),
                this.catalogueService.getCatalogueResponse(userId),
                this.userService.getCompanyNegotiationSettingsForParty(UBLModelUtils.getPartyId(party), party.federationInstanceID),
                eClassCategoryUris ? this.categoryService.getCategoriesForIds(new Array(eClassCategoryUris.length).fill("eClass"), eClassCategoryUris) : Promise.resolve(null),
                furnitureOntologyCategoryUris ? this.categoryService.getCategoriesForIds(new Array(furnitureOntologyCategoryUris.length).fill("FurnitureOntology"), furnitureOntologyCategoryUris) : Promise.resolve(null)
            ]).then(([party, catalogueResponse, settings, eClassLogisticCategories, furnitureOntologyLogisticCategories]) => {
                // set furniture ontology logistic categories
                this.furnitureOntologyLogisticCategories = furnitureOntologyLogisticCategories;
                this.initView(party, catalogueResponse, settings, eClassLogisticCategories);
                this.callStatus.callback("Successfully initialized.", true);
            })
                .catch(error => {
                    this.callStatus.error("Error while initializing the publish view.", error);
                });
        });
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    getCategoryUrisForTaxonomyId(taxonomyId: string) {
        let serviceCategoryUriMap = this.logisticRelatedServices[taxonomyId];

        let categoryUris = [];
        for (let key of Object.keys(serviceCategoryUriMap)) {
            categoryUris.push(serviceCategoryUriMap[key]);
        }
        return categoryUris;
    }

    populateLogisticPublishMode() {
        this.logisticPublishMode = new Map<string, string>();
        for (let serviceType of this.availableLogisticsServices) {
            this.logisticPublishMode.set(serviceType, this.publishStateService.publishMode);
        }
    }

    getServiceTypesFromLogisticsCatalogueLines() {
        let numberOfCatalogueLines = this.logisticCatalogueLines.size;
        let iterator = this.logisticCatalogueLines.keys();
        for (let i = 0; i < numberOfCatalogueLines; i++) {
            this.availableLogisticsServices.push(iterator.next().value);
        }
    }

    // switching between tabs
    onSelectTabSinglePublish(event: any, id: any) {
        event.preventDefault();
        this.selectedTabSinglePublish = id;
    }

    onTransportServiceCategorySelected(transportService: string): void {
        this.showMaritimeTransportService = false;
        this.showRoadTransportService = false;
        this.showAirTransportService = false;
        this.showRailTransportService = false;
        switch (transportService) {
            case 'ROADTRANSPORT': this.showRoadTransportService = true; break;
            case 'AIRTRANSPORT': this.showAirTransportService = true; break;
            case 'MARITIMETRANSPORT': this.showMaritimeTransportService = true; break;
            case 'RAILTRANSPORT': this.showRailTransportService = true; break;
        }
    }

    isLoading(): boolean {
        return !this.publishStatus.isAllComplete();
    }

    canDeactivate(): boolean|Promise<boolean> {
        if (this.dialogBox) {
            return this.appComponent.confirmModalComponent.open('You will lose any changes you made, are you sure you want to quit ?').then(result => {
                if(result){
                    this.publishStateService.publishMode = 'create';
                }
                return result;
            });

        } else {
            this.publishStateService.publishMode = 'create';
            return true;
        }
    }

    private initView(userParty, catalogueResponse: CataloguePaginationResponse, settings, eClassLogisticCategories): void {
        this.companyNegotiationSettings = settings;
        // Following "if" block is executed when redirected by an "edit" button
        // "else" block is executed when redirected by "publish" tab
        this.publishMode = this.publishStateService.publishMode;

        if (this.publishMode == 'edit' || this.publishMode == 'copy') {
            if (this.publishMode == 'copy') {
                // clear the ids
                this.catalogueService.draftCatalogueLine.id = null;
                this.catalogueService.draftCatalogueLine.goodsItem.id = null;
                this.catalogueService.draftCatalogueLine.goodsItem.item.manufacturersItemIdentification.id = null;
                this.catalogueService.draftCatalogueLine = removeHjids(this.catalogueService.draftCatalogueLine);
            }
            this.catalogueLine = this.catalogueService.draftCatalogueLine;
            // add missing additional item properties to catalogue line
            this.addMissingAdditionalItemProperties(this.catalogueLine);
            if (this.catalogueLine == null) {
                this.publishStateService.publishMode = 'create';
                this.router.navigate(['catalogue/publish-logistic']);
                return;
            }

            this.selectedTabSinglePublish = this.getSelectedTabForLogisticServices();
            this.availableLogisticsServices.push(this.selectedTabSinglePublish);

        } else {
            // new publishing is the first entry to the publishing page
            // i.e. publishing from scratch
            this.logisticCatalogueLines = UBLModelUtils.createCatalogueLinesForLogistics(catalogueResponse.catalogueUuid, userParty, settings, this.logisticRelatedServices, eClassLogisticCategories, this.furnitureOntologyLogisticCategories);
            this.getServiceTypesFromLogisticsCatalogueLines();
            this.populateLogisticPublishMode();
        }
    }

    // this method is used to add missing additional item properties to catalogue line in 'edit' mode
    addMissingAdditionalItemProperties(catalogueLine: CatalogueLine) {
        if (this.furnitureOntologyLogisticCategories) {
            let category: Category = null;
            for (let commodityClassification of catalogueLine.goodsItem.item.commodityClassification) {
                for (let logisticCategory of this.furnitureOntologyLogisticCategories) {
                    if (commodityClassification.itemClassificationCode.uri == logisticCategory.categoryUri) {
                        category = logisticCategory;
                        break;
                    }
                }
            }
            // add missing additional item properties to catalogue line
            for (let property of category.properties) {
                let missing: boolean = true;
                for (let itemProperty of catalogueLine.goodsItem.item.additionalItemProperty) {
                    if (itemProperty.uri == property.uri) {
                        missing = false;
                        break;
                    }
                }
                if (missing) {
                    catalogueLine.goodsItem.item.additionalItemProperty.push(UBLModelUtils.createAdditionalItemProperty(property, category));
                }
            }
        }
    }

    // getters
    getLogisticCatalogueLine(serviceType: string): CatalogueLine {
        if (this.publishMode == 'create') {
            return this.logisticCatalogueLines.get(serviceType);
        }
        return this.catalogueLine;
    }

    private getSelectedTabForLogisticServices() {
        let serviceCategoryMap;
        if (this.config.standardTaxonomy == "All" || this.config.standardTaxonomy == "FurnitureOntology") {
            serviceCategoryMap = this.logisticRelatedServices["FurnitureOntology"];
        }
        else {
            serviceCategoryMap = this.logisticRelatedServices["eClass"];
        }

        for (let commodityClassification of this.catalogueLine.goodsItem.item.commodityClassification) {
            let serviceTypes = Object.keys(serviceCategoryMap);
            for (let serviceType of serviceTypes) {
                if (commodityClassification.itemClassificationCode.uri == serviceCategoryMap[serviceType]) {
                    return serviceType;
                }
            }
        }
    }


    getButtonLabel(exit: boolean = false) {
        if (this.publishStateService.publishMode === "edit")
            return exit ? "Save & Exit" : "Save & Continue";
        else if (this.publishStateService.publishMode === "copy")
            return exit ? "Publish & Exit" : "Publish & Continue";

        // if the publish mode is 'edit' for at least one of the logistics services, set isPublishModeEdit to true.
        let isPublishModeEdit = false;
        this.logisticPublishMode.forEach(value => {
            if (value == 'edit') {
                isPublishModeEdit = true;
            }
        });

        if (isPublishModeEdit) {
            return exit ? "Save & Exit" : "Save & Continue";
        }

        return exit ? "Publish & Exit" : "Publish & Continue";
    }

    isProductIdEditable(serviceType: string) {
        // handling of 'edit' and 'copy' publish modes
        if (this.publishStateService.publishMode === 'edit') {
            return false;
        }
        else if (this.publishStateService.publishMode === 'copy') {
            return true;
        }
        // handling of 'create' publish mode
        return this.logisticPublishMode.get(serviceType) == 'create';

    }

    getBinaryObjectsForLogisticService() {
        const serviceType: string = this.getSelectedTransportServiceType();
        let binaryObjects: BinaryObject[] = [];

        if (this.publishStateService.publishMode == 'create') {
            binaryObjects = this.logisticCatalogueLines.get(serviceType).goodsItem.item.itemSpecificationDocumentReference.map(doc => doc.attachment.embeddedDocumentBinaryObject)
        } else {
            binaryObjects = this.catalogueLine.goodsItem.item.itemSpecificationDocumentReference.map(doc => doc.attachment.embeddedDocumentBinaryObject)
        }

        return binaryObjects;
    }

    getProductTypeProperty() {
        const serviceType: string = this.getSelectedTransportServiceType();
        let item: Item = this.getLogisticCatalogueLine(serviceType).goodsItem.item;
        for (let property of item.additionalItemProperty) {
            if (property.uri == "http://www.aidimme.es/FurnitureSectorOntology.owl#managedProductType") {
                return property;
            }
        }
    }

    getIndustrySpecializationProperty() {
        const serviceType: string = this.getSelectedTransportServiceType();
        let item: Item = this.getLogisticCatalogueLine(serviceType).goodsItem.item;
        for (let property of item.additionalItemProperty) {
            if (property.uri == "http://www.aidimme.es/FurnitureSectorOntology.owl#industrySpecialization") {
                return property;
            }
        }
    }

    getLogisticProperties(serviceType: string) {
        let properties = [];
        let item: Item = this.getLogisticCatalogueLine(serviceType).goodsItem.item;
        for (let property of item.additionalItemProperty) {
            if (property.uri != "http://www.aidimme.es/FurnitureSectorOntology.owl#industrySpecialization" && property.uri != "http://www.aidimme.es/FurnitureSectorOntology.owl#managedProductType"
                && property.uri != "http://www.aidimme.es/FurnitureSectorOntology.owl#originTransport" && property.uri != 'http://www.aidimme.es/FurnitureSectorOntology.owl#destinationTransport' && property.itemClassificationCode.listID != 'Custom') {
                properties.push(property);
            }
        }
        return properties
    }

    getOriginAddressForLogistics(serviceType: string) {
        let item: Item = this.getLogisticCatalogueLine(serviceType).goodsItem.item;
        for (let itemProperty of item.additionalItemProperty) {
            if (itemProperty.uri == "http://www.aidimme.es/FurnitureSectorOntology.owl#originTransport") {
                return itemProperty;
            }
        }
    }

    getDestinationAddressForLogistics(serviceType: string) {
        let item: Item = this.getLogisticCatalogueLine(serviceType).goodsItem.item;
        for (let itemProperty of item.additionalItemProperty) {
            if (itemProperty.uri == "http://www.aidimme.es/FurnitureSectorOntology.owl#destinationTransport") {
                return itemProperty;
            }
        }
    }

    // methods to select/unselect files for Transport logistic services
    onSelectFileForLogisticService(binaryObject: BinaryObject) {
        const serviceType: string = this.getSelectedTransportServiceType();
        const document: DocumentReference = new DocumentReference();
        const attachment: Attachment = new Attachment();
        attachment.embeddedDocumentBinaryObject = binaryObject;
        document.attachment = attachment;

        if (this.publishStateService.publishMode == 'create') {
            this.logisticCatalogueLines.get(serviceType).goodsItem.item.itemSpecificationDocumentReference.push(document);
        } else {
            this.catalogueLine.goodsItem.item.itemSpecificationDocumentReference.push(document);
        }
    }

    onUnSelectFileForLogisticService(binaryObject: BinaryObject) {
        const serviceType: string = this.getSelectedTransportServiceType();
        if (this.publishStateService.publishMode == 'create') {
            const i = this.logisticCatalogueLines.get(serviceType).goodsItem.item.itemSpecificationDocumentReference.findIndex(doc => doc.attachment.embeddedDocumentBinaryObject === binaryObject);
            if (i >= 0) {
                this.logisticCatalogueLines.get(serviceType).goodsItem.item.itemSpecificationDocumentReference.splice(i, 1);
            }

        } else {
            const i = this.catalogueLine.goodsItem.item.itemSpecificationDocumentReference.findIndex(doc => doc.attachment.embeddedDocumentBinaryObject === binaryObject);
            if (i >= 0) {
                this.catalogueLine.goodsItem.item.itemSpecificationDocumentReference.splice(i, 1);
            }
        }
    }

    // methods used to validate catalogue lines
    isValidCatalogueLineForLogistics(): boolean {
        if (this.publishMode == 'create') {
            let isValid = false;
            // if at least of the logistics services has a valid name, then set 'isValid' to true.
            this.logisticCatalogueLines.forEach(catalogueLine => {
                if (this.isItemValid(catalogueLine.goodsItem.item)) {
                    isValid = true;
                }
            });
            return isValid;
        }
        return this.isItemValid(this.catalogueLine.goodsItem.item);
    }

    isItemValid(item: Item) {
        // must have a name and id
        return item.name[0] && item.name[0].value !== "" && item.manufacturersItemIdentification.id && item.manufacturersItemIdentification.id !== "";
    }

    // Removes empty properties from catalogueLines about to be sent
    private removeEmptyProperties(catalogueLine: CatalogueLine): CatalogueLine {

        // Make deep copy of catalogue line so we can remove empty fields without disturbing UI model
        // This is required because there is no redirect after publish action
        let catalogueLineCopy: CatalogueLine = copy(catalogueLine);

        if (catalogueLineCopy.goodsItem.item.lifeCyclePerformanceAssessmentDetails != null) {
            if (!UBLModelUtils.isFilledLCPAInput(catalogueLineCopy.goodsItem.item.lifeCyclePerformanceAssessmentDetails)) {
                catalogueLineCopy.goodsItem.item.lifeCyclePerformanceAssessmentDetails.lcpainput = null;
            }
            if (!UBLModelUtils.isFilledLCPAOutput(catalogueLineCopy.goodsItem.item.lifeCyclePerformanceAssessmentDetails)) {
                catalogueLineCopy.goodsItem.item.lifeCyclePerformanceAssessmentDetails.lcpaoutput = null;
            }
        }

        // splice out properties that are unfilled
        let properties: ItemProperty[] = catalogueLineCopy.goodsItem.item.additionalItemProperty;
        let propertiesToBeSpliced: ItemProperty[] = [];
        for (let property of properties) {
            let valueQualifier: string = property.valueQualifier.toLocaleLowerCase();
            if (valueQualifier == "int" ||
                valueQualifier == "double" ||
                valueQualifier == "number") {
                property.valueDecimal = property.valueDecimal.filter(function(el) {
                    return (el != null && el.toString() != "");
                });
                if (property.valueDecimal.length == 0 || property.valueDecimal[0] == undefined) {
                    propertiesToBeSpliced.push(property);
                }

            } else if (valueQualifier == "file") {
                if (property.valueBinary.length == 0) {
                    propertiesToBeSpliced.push(property);
                }

            } else if (valueQualifier.toLowerCase() == 'quantity') {
                if (property.valueQuantity.length == 0 || !property.valueQuantity[0].value) {
                    propertiesToBeSpliced.push(property);
                }

            } else {
                if (property.value.length == 0 || property.value[0].value == '') {
                    propertiesToBeSpliced.push(property);
                }
            }
        }

        for (let property of propertiesToBeSpliced) {
            properties.splice(properties.indexOf(property), 1);
        }

        return catalogueLineCopy;
    }

    private copyMissingAdditionalItemPropertiesAndAddresses(catalogueLine: CatalogueLine) {
        let originAddress = this.getOriginAddressForLogistics('TRANSPORT');
        let destinationAddress = this.getDestinationAddressForLogistics('TRANSPORT');
        for (let itemProperty of catalogueLine.goodsItem.item.additionalItemProperty) {
            if (itemProperty.uri == "http://www.aidimme.es/FurnitureSectorOntology.owl#originTransport") {
                itemProperty.value = originAddress.value;
            }
            else if (itemProperty.uri == "http://www.aidimme.es/FurnitureSectorOntology.owl#destinationTransport") {
                itemProperty.value = destinationAddress.value;
            }
        }
    }

    /**
     * Creates {@link NonPublicInformation} for each non-public property of given catalogue lines
     * The created {@link NonPublicInformation} includes the all values of property
     * */
    processNonPublicProductProperties(catalogueLines:CatalogueLine[]){
        if(this.config.nonPublicInformationFunctionalityEnabled){
            for (let catalogueLine1 of catalogueLines) {
                let nonPublicInformationList = []

                for (let catalogueLineNonPublicInformation of catalogueLine1.nonPublicInformation) {
                    let nonPublicInformation:NonPublicInformation = new NonPublicInformation();
                    nonPublicInformation.id = catalogueLineNonPublicInformation.id;

                    let property = catalogueLine1.goodsItem.item.additionalItemProperty.find(value => value.id === catalogueLineNonPublicInformation.id);

                    if(property){
                        let multiTypeValue = new MultiTypeValue();
                        multiTypeValue.valueQualifier = property.valueQualifier;
                        switch (multiTypeValue.valueQualifier){
                            case "STRING":
                                for (let value of property.value) {
                                    multiTypeValue.value.push(new Text(value.value,value.languageID));
                                }
                                break;
                            case "QUANTITY":
                                for (let quantity of property.valueQuantity) {
                                    multiTypeValue.valueQuantity.push(new Quantity(quantity.value,quantity.unitCode));
                                }
                                break;
                            case "NUMBER":
                                for (let decimal of property.valueDecimal) {
                                    multiTypeValue.valueDecimal.push(decimal);
                                }
                        }
                        nonPublicInformation.value = multiTypeValue;

                        nonPublicInformationList.push(nonPublicInformation)
                    }

                }
                catalogueLine1.nonPublicInformation =  nonPublicInformationList;
            }
        }

    }
    // publish or save

    onPublish(exitThePage: boolean) {
        this.publishStatus = new CallStatus();
        if (this.publishStateService.publishMode === 'edit' || this.publishStateService.publishMode === 'copy') {

            if (this.publishStateService.publishMode === 'edit') {
                // update existing service
                this.saveEditedProduct(exitThePage, [this.catalogueLine]);
            }
            else {
                // publish the new service
                this.publish([this.catalogueLine], exitThePage);
            }
        }
        else {
            let catalogueLines: CatalogueLine[] = [];
            let cataloguePublishModes: string[] = [];
            // get valid catalogue lines and their publish modes
            if (this.logisticCatalogueLines.has("ROADTRANSPORT") && this.isItemValid(this.logisticCatalogueLines.get("ROADTRANSPORT").goodsItem.item)) {
                this.copyMissingAdditionalItemPropertiesAndAddresses(this.logisticCatalogueLines.get("ROADTRANSPORT"));
                // be sure that its transportation service details is not null
                this.logisticCatalogueLines.get("ROADTRANSPORT").goodsItem.item.transportationServiceDetails = new TransportationService();
                catalogueLines.push(this.logisticCatalogueLines.get("ROADTRANSPORT"));
                cataloguePublishModes.push(this.logisticPublishMode.get("ROADTRANSPORT"));
            }
            if (this.logisticCatalogueLines.has("MARITIMETRANSPORT") && this.isItemValid(this.logisticCatalogueLines.get("MARITIMETRANSPORT").goodsItem.item)) {
                this.copyMissingAdditionalItemPropertiesAndAddresses(this.logisticCatalogueLines.get("MARITIMETRANSPORT"));
                // be sure that its transportation service details is not null
                this.logisticCatalogueLines.get("MARITIMETRANSPORT").goodsItem.item.transportationServiceDetails = new TransportationService();
                catalogueLines.push(this.logisticCatalogueLines.get("MARITIMETRANSPORT"));
                cataloguePublishModes.push(this.logisticPublishMode.get("MARITIMETRANSPORT"));
            }
            if (this.logisticCatalogueLines.has("AIRTRANSPORT") && this.isItemValid(this.logisticCatalogueLines.get("AIRTRANSPORT").goodsItem.item)) {
                this.copyMissingAdditionalItemPropertiesAndAddresses(this.logisticCatalogueLines.get("AIRTRANSPORT"));
                // be sure that its transportation service details is not null
                this.logisticCatalogueLines.get("AIRTRANSPORT").goodsItem.item.transportationServiceDetails = new TransportationService();
                catalogueLines.push(this.logisticCatalogueLines.get("AIRTRANSPORT"));
                cataloguePublishModes.push(this.logisticPublishMode.get("AIRTRANSPORT"));
            }
            if (this.logisticCatalogueLines.has("RAILTRANSPORT") && this.isItemValid(this.logisticCatalogueLines.get("RAILTRANSPORT").goodsItem.item)) {
                this.copyMissingAdditionalItemPropertiesAndAddresses(this.logisticCatalogueLines.get("RAILTRANSPORT"));
                // be sure that its transportation service details is not null
                this.logisticCatalogueLines.get("RAILTRANSPORT").goodsItem.item.transportationServiceDetails = new TransportationService();
                catalogueLines.push(this.logisticCatalogueLines.get("RAILTRANSPORT"));
                cataloguePublishModes.push(this.logisticPublishMode.get("RAILTRANSPORT"));
            }
            this.logisticCatalogueLines.forEach((catalogueLine, key) => {
                if (key != "ROADTRANSPORT" && key != "MARITIMETRANSPORT" && key != "AIRTRANSPORT" && key != "RAILTRANSPORT" && this.isItemValid(catalogueLine.goodsItem.item)) {
                    catalogueLines.push(catalogueLine);
                    cataloguePublishModes.push(this.logisticPublishMode.get(key));
                }
            });

            let catalogueLinesToBePublished: CatalogueLine[] = [];
            let catalogueLinesToBeUpdated: CatalogueLine[] = [];
            // get catalogue lines to be published and catalogue lines to be updated
            for (let i = 0; i < catalogueLines.length; i++) {
                if (cataloguePublishModes[i] == 'edit') {
                    catalogueLinesToBeUpdated.push(catalogueLines[i]);
                } else {
                    catalogueLinesToBePublished.push(catalogueLines[i]);
                }
            }

            // make sure that we exit after publishing new services and updating existing ones
            if (exitThePage && catalogueLinesToBePublished.length > 0 && catalogueLinesToBeUpdated.length > 0) {
                this.publish(catalogueLinesToBePublished, false);
                this.saveEditedProduct(true, catalogueLinesToBeUpdated);
                return;
            }
            if (catalogueLinesToBePublished.length > 0) {
                this.publish(catalogueLinesToBePublished, exitThePage);
            }
            if (catalogueLinesToBeUpdated.length > 0) {
                this.saveEditedProduct(exitThePage, catalogueLinesToBeUpdated);
            }
        }
    }

    private publish(catalogueLines: CatalogueLine[], exitThePage: boolean) {
        let splicedCatalogueLines: CatalogueLine[] = [];
        // remove unused properties from catalogueLine
        for (let catalogueLine of catalogueLines) {
            splicedCatalogueLines.push(this.removeEmptyProperties(catalogueLine));
        }

        if(this.config.nonPublicInformationFunctionalityEnabled){
            this.processNonPublicProductProperties(splicedCatalogueLines)
        }
        if (this.catalogueService.catalogueResponse.catalogueUuid == null) {
            const userId = this.cookieService.get("user_id");
            this.userService.getUserParty(userId).then(userParty => {
                // create the catalogue
                let catalogue: Catalogue = new Catalogue("default", null, userParty, "", "", []);
                // add catalogue lines to the end of catalogue
                for (let catalogueLine of splicedCatalogueLines) {
                    catalogue.catalogueLine.push(catalogueLine);
                }

                this.publishStatus.aggregatedSubmit();
                this.catalogueService.postCatalogue(catalogue)
                    .then(() => this.onSuccessfulPublish(exitThePage, splicedCatalogueLines))
                    .catch(err => {
                        this.onFailedPublish(err);
                    })
            }).catch(err => {
                this.onFailedPublish(err);
            });

        } else {
            // TODO: create a service to add multiple catalogue lines
            for (let catalogueLine of splicedCatalogueLines) {
                this.publishStatus.aggregatedSubmit();
                this.catalogueService.addCatalogueLine(this.catalogueService.catalogueResponse.catalogueUuid, JSON.stringify(catalogueLine))
                    .then(() => {
                        this.onSuccessfulPublish(exitThePage, [catalogueLine]);
                    })
                    .catch(err => this.onFailedPublish(err))
            }
        }
    }

    // Should be called on save
    private saveEditedProduct(exitThePage: boolean, catalogueLines: CatalogueLine[]): void {

        let splicedCatalogueLines: CatalogueLine[] = [];
        // remove unused properties from catalogueLine
        for (let catalogueLine of catalogueLines) {
            splicedCatalogueLines.push(this.removeEmptyProperties(catalogueLine));
        }

        if(this.config.nonPublicInformationFunctionalityEnabled){
            this.processNonPublicProductProperties(splicedCatalogueLines)
        }
        // TODO: create a service to update multiple catalogue lines
        for (let catalogueLine of splicedCatalogueLines) {
            this.publishStatus.aggregatedSubmit();
            this.catalogueService.updateCatalogueLine(this.catalogueService.catalogueResponse.catalogueUuid, JSON.stringify(catalogueLine))
                .then(() => this.onSuccessfulPublish(exitThePage, [catalogueLine]))
                // .then(() => this.changePublishModeToCreate())
                .catch(err => {
                    this.onFailedPublish(err);
                });
        }
    }

    private onFailedPublish(err): void {
        this.publishStatus.aggregatedError(err._body ? err._body : err);
        // this.submitted = false;
        // this.error_detc = true;
        if (err.status == 406) {
            this.sameIdError = true;
            this.erroneousID = this.catalogueLine.id;
        }
        else {
            this.sameIdError = false;
        }
    }

    // catalogueLineId is the id of catalogue line created or edited
    private onSuccessfulPublish(exitThePage: boolean, catalogueLines: CatalogueLine[]): void {
        let catalogueLineIds: string[] = catalogueLines.map(catalogueLine => catalogueLine.id);

        let userId = this.cookieService.get("user_id");
        this.userService.getUserParty(userId).then(party => {
            this.catalogueService.getCatalogueResponse(userId).then(catalogueResponse => {
                this.catalogueService.getCatalogueLines(catalogueResponse.catalogueUuid, catalogueLineIds).then(catalogueLines => {
                    // go to the dashboard - catalogue tab
                    if (exitThePage) {
                        this.catalogueLine = UBLModelUtils.createCatalogueLine(catalogueResponse.catalogueUuid,
                            party, this.companyNegotiationSettings);

                        // since every changes is saved,we do not need a dialog box
                        this.dialogBox = false;
                        alert(this.translations["Successfully saved. You are now getting redirected."]);
                        this.router.navigate(['dashboard'], {
                            queryParams: {
                                tab: "CATALOGUE",
                            }
                        });
                    }
                    // stay in this page and allow the user to edit his product/service
                    else {

                        if (this.publishStateService.publishMode == 'create') {
                            for (let catalogueLine of catalogueLines) {
                                for (let serviceType of this.availableLogisticsServices) {
                                    if (catalogueLine.id == this.logisticCatalogueLines.get(serviceType).id) {
                                        // add missing additional item properties
                                        this.addMissingAdditionalItemProperties(catalogueLine);
                                        this.logisticCatalogueLines.set(serviceType, catalogueLine);
                                        this.logisticPublishMode.set(serviceType, 'edit');
                                        break;
                                    }
                                }
                            }
                            // be sure that each logistics catalogue line has a reference to the catalogue
                            for (let serviceType of this.availableLogisticsServices) {
                                this.logisticCatalogueLines.get(serviceType).goodsItem.item.catalogueDocumentReference.id = catalogueResponse.catalogueUuid;
                            }
                        } else {
                            // since there is only one catalogue line
                            this.catalogueLine = catalogueLines[0];
                            // add missing additional item properties
                            this.addMissingAdditionalItemProperties(this.catalogueLine);
                            // we need to change publish mode to 'edit' since we published the product/service
                            this.publishStateService.publishMode = "edit";
                        }
                    }
                    this.catalogueService.draftCatalogueLine = this.catalogueLine;

                    this.publishStatus.aggregatedCallBack(this.translations["Successfully saved. You can now continue."], false);
                    if (this.publishStatus.isAllSuccessful()) {
                        this.dialogBox = false;
                    }
                }).
                    catch(error => {
                        this.publishStatus.aggregatedError("Error while publishing product", error);
                    });
            })
                .catch(error => {
                    this.publishStatus.aggregatedError("Error while publishing product", error);
                });
        })
            .catch(error => {
                this.publishStatus.aggregatedError("Error while publishing product", error);
            });
    }

    private getSelectedTransportServiceType(): string {
        if (this.selectedTabSinglePublish === 'TRANSPORT') {
            if (this.showRoadTransportService) {
                return 'ROADTRANSPORT';
            }
            if (this.showRailTransportService) {
                return 'RAILTRANSPORT';
            }
            if (this.showMaritimeTransportService) {
                return 'MARITIMETRANSPORT';
            }
            return 'AIRTRANSPORT';
        } else {
            return this.selectedTabSinglePublish;
        }
    }

    onBack() {
        this.location.back();
    }

}
