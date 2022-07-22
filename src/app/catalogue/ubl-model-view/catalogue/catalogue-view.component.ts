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

import {Component, Input, OnInit, ViewChild} from '@angular/core';
import { Location } from '@angular/common';
import { CookieService } from 'ng2-cookies';
import { CatalogueService } from "../../catalogue.service";
import { CallStatus } from "../../../common/call-status";
import { ActivatedRoute, Params, Router } from "@angular/router";
import { PublishService } from "../../publish-and-aip.service";
import { CategoryService } from "../../category/category.service";
import {copy, isLogisticsService, selectPreferredNameForSolrCategory, sortSolrCategories} from '../../../common/utils';
import { UserService } from "../../../user-mgmt/user.service";
import { CompanySettings } from "../../../user-mgmt/model/company-settings";
import { CataloguePaginationResponse } from '../../model/publish/catalogue-pagination-response';
import { Item } from '../../model/publish/item';
import { selectDescription, selectName } from '../../../common/utils';
import { ItemProperty } from '../../model/publish/item-property';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs/Observable';
import {CATALOGUE_LINE_SORT_OPTIONS, CATALOGUE_LINE_STATUS, NON_PUBLIC_FIELD_ID} from '../../model/constants';
import { Catalogue } from '../../model/publish/catalogue';
import { CatalogueLine } from "../../model/publish/catalogue-line";
import { TranslateService } from '@ngx-translate/core';
import { DeleteExportCatalogueModalComponent } from "./delete-export-catalogue-modal.component";
import {WhiteBlackListService} from '../../white-black-list.service';
import {NetworkCompanyListService} from '../../../user-mgmt/network-company-list.service';
import {AppComponent} from '../../../app.component';
import * as myGlobals from '../../../globals';
import {SimpleSearchService} from '../../../simple-search/simple-search.service';
import {ProductOfferingDetails} from '../../model/publish/product-offering-details';

@Component({
    selector: 'catalogue-view',
    templateUrl: './catalogue-view.component.html',
    styleUrls: ["./catalogue-view.component.css"],
    providers: [CookieService]
})

export class CatalogueViewComponent implements OnInit {

    @Input() viewMode:"OwnerView"|"ContractView"|"OfferView" = "OwnerView";
    product_vendor_name = myGlobals.product_vendor_name;

    catalogueResponse: CataloguePaginationResponse;
    settings: CompanySettings;

    // available catalogue lines with respect to the selected category
    catalogueLinesWRTTypes: any = [];
    // catalogue lines which are available to the user after search operation
    catalogueLinesArray: CatalogueLine[] = [];

    // categories of the catalogue lines retrieved from indexing-service
    categoriesInSolrFormat: any = [];
    selectedCategory = "All";

    // necessary info for pagination
    collectionSize = 0;
    page = 1;
    // default
    pageSize = 10;
    addCatalogue = false;

    // variables for white/black list functionality
    // whether the white/black list panel is visible
    whiteBlackListPanelVisible:boolean = false;
    // selected companies for white list
    whiteListCompanies:any[] = [];
    // selected companies for black list
    blackListCompanies:any[] = [];
    // party name map for the ones included in white/black list
    partyNameMap:Map<string,string> = null;
    // call status for white/black list operations
    whiteBlackListCallStatus:CallStatus = new CallStatus();
    // the end of variables for white/black list functionality
    // Flag indicating that the source page is the search page.
    searchRef:boolean = false;

    // check whether catalogue-line-panel should be displayed for a specific catalogue line
    catalogueLineView = {};

    selectedCatalogue: string = "all";
    catalogueUuid: string = 'all';
    cataloguesIds: string[] = [];
    catalogueUuids: string[] = [];

    productStatus = "All";
    sortOption = null;
    catalogueText: string = "";
    getCatalogueStatus = new CallStatus();
    productCatalogueRetrievalStatus: CallStatus = new CallStatus();

    callStatus = new CallStatus();
    deleteStatuses: CallStatus[] = [];

    // variables for product offering functionality
    // whether the product selection is enabled for offering
    productSelectionForOffering:boolean = false;
    // call status for party names
    getPartyNameCallStatus:CallStatus = new CallStatus();
    // details of the product offer
    productOfferingDetails:ProductOfferingDetails = null;
    // whether the companies are selected from the network groups or not
    companyListInput:boolean = true;
    // the end of variables for product offering functionality
    public config = myGlobals.config;

    catalogueIdForContractCreation:string = null;
    catalogueUuidForContractCreation:string = null;
    @ViewChild(DeleteExportCatalogueModalComponent)
    private deleteCatalogueModal: DeleteExportCatalogueModalComponent;

    CATALOGUE_LINE_SORT_OPTIONS = CATALOGUE_LINE_SORT_OPTIONS;
    CATALOGUE_LINE_STATUS = CATALOGUE_LINE_STATUS;

    public searchText: string = "";

    encodeURIComponent = encodeURIComponent;
    selectPreferredNameForSolrCategory = selectPreferredNameForSolrCategory;

    constructor(private cookieService: CookieService,
        private publishService: PublishService,
        public appComponent: AppComponent,
        private catalogueService: CatalogueService,
        private categoryService: CategoryService,
        public networkCompanyListService: NetworkCompanyListService,
        private translate: TranslateService,
        private simpleSearchService: SimpleSearchService,
        private route: ActivatedRoute,
        private whiteBlackListService: WhiteBlackListService,
        private userService: UserService,
        private router: Router,
        private location: Location) {
    }

    ngOnInit() {
        this.route.queryParams.subscribe((params: Params) => {
            // searchRef is true if the source page is search page
            this.searchRef = !!params['searchRef'];

            this.searchText = "";
            this.deleteStatuses = [];
            this.catalogueText = "";
            this.sortOption = null;
            this.cataloguesIds = [];
            this.catalogueUuid = this.searchRef && this.whiteBlackListService.catalogueId ? this.whiteBlackListService.catalogueId :"all";
            // if the user is coming from the search page and a catalogue id is set, set the catalogue id again
            if (this.searchRef && this.whiteBlackListService.catalogueId) {
                this.catalogueUuid = this.whiteBlackListService.catalogueId;

            // if a specific catalogue id is available in the query parameters, set it to the active catalogue name
            } else if (params['cUuid']) {
                this.catalogueUuid = params['cUuid'];
            } else {
                this.catalogueUuid = 'all';
            }
            this.selectedCatalogue = this.catalogueUuid;
            this.catalogueLinesWRTTypes = [];
            this.catalogueLinesArray = [];
            this.categoriesInSolrFormat = [];
            this.selectedCategory = "All";
            this.productStatus = "All";
            this.collectionSize = 0;
            this.page = 1;
            this.pageSize = 10;
            this.addCatalogue = false;
            this.whiteBlackListPanelVisible = this.searchRef && this.whiteBlackListService.catalogueId != null;
            this.catalogueLineView = {};
            this.sortOption = this.sortOption == null ? CATALOGUE_LINE_SORT_OPTIONS[0].name : this.sortOption;
            this.initDataRetrieval();
            for (let i = 0; i < this.pageSize; i++) {
                this.deleteStatuses.push(new CallStatus());
            }

        });
    }

    setSelectedPartiesAndPopulatePartyNameMap(){
        // retrieve selected company vat numbers
        let selectedPartyVatNumbers: string[] = [];
        if(this.settings.negotiationSettings.company.network && this.settings.negotiationSettings.company.network.length > 0){
            for (let network of this.settings.negotiationSettings.company.network) {
                for (let vatNumber of network.vatNumber) {
                    if(selectedPartyVatNumbers.indexOf(vatNumber) == -1){
                        selectedPartyVatNumbers.push(vatNumber);
                    }
                }
            }
        }
        if(this.productOfferingDetails.vatNumber.length > 0){
            for (let vatNumber of this.productOfferingDetails.vatNumber) {
                if(selectedPartyVatNumbers.indexOf(vatNumber) == -1){
                    selectedPartyVatNumbers.push(vatNumber);
                }
            }
        }

        if(selectedPartyVatNumbers.length > 0){
            this.getPartyNameCallStatus.submit();
            this.simpleSearchService.getEFactoryCompanies(selectedPartyVatNumbers).then(parties => {
                this.partyNameMap = new Map<string,string>();

                for (let party of parties.result) {
                    this.partyNameMap.set(party.vatNumber,party.legalName);
                }

                this.getPartyNameCallStatus.callback("Retrieved party names",true);
            }).catch(error => {
                this.getPartyNameCallStatus.error(this.translate.instant("Failed to get party names"),error);
            })
        }
    }

    setWhiteBlackListAndPopulatePartyNameMap(whiteListParties:any[],blackListParties:any[]){

        let selectedParties = [].concat(whiteListParties).concat(blackListParties);
        let vatNumbers = selectedParties.map(value => value.vatNumber);

        if(vatNumbers.length > 0){
            this.whiteBlackListCallStatus.submit();
            this.simpleSearchService.getEFactoryCompanies(vatNumbers).then(response => {
                let parties = response.result;
                this.partyNameMap = new Map<string, string>();

                for (let party of parties) {
                    this.partyNameMap.set(party.vatNumber,party.legalName);
                }

                this.whiteListCompanies = [];
                for (let whiteListParty of whiteListParties) {
                    this.whiteListCompanies.push({"vatNumber":whiteListParty.vatNumber,"legalName":this.partyNameMap.get(whiteListParty.vatNumber)});
                }
                this.blackListCompanies = [];
                for (let blackListParty of blackListParties) {
                    this.blackListCompanies.push({"vatNumber":blackListParty.vatNumber,"legalName":this.partyNameMap.get(blackListParty.vatNumber)});
                }

                this.whiteBlackListCallStatus.callback("Retrieved party names",true);
            }).catch(error => {
                this.whiteBlackListCallStatus.error("Failed to get party names",error);
            })
        } else{
            this.whiteListCompanies = [];
            this.blackListCompanies = [];
        }
    }

    isWhiteBlackListCallStatusLoading(): boolean {
        return this.whiteBlackListCallStatus.fb_submitted;
    }

    selectName(ip: ItemProperty | Item) {
        return selectName(ip);
    }

    selectDescription(item: Item) {
        return selectDescription(item);
    }

    changeCat() {
        this.catalogueUuid = this.selectedCatalogue;
        this.whiteBlackListPanelVisible = false;
        this.requestCatalogue();
    }

    requestCatalogue(): void {
        const userId = this.cookieService.get("user_id");
        // check whether the user chose a category to filter the catalogue lines
        let categoryName = this.selectedCategory == "All" ? null : this.selectedCategory;
        // do not need to pass a request param for 'All' option of status
        let productStatus = this.productStatus == "All" ? null : this.productStatus;
        // get selected catalogue id
        let catalogueId = this.catalogueUuid;
        if (catalogueId !== 'all') {
            let index = this.catalogueUuids.indexOf(catalogueId);
            if (index !== -1) {
                catalogueId = this.cataloguesIds[index];
                this.location.replaceState(
                    this.router.createUrlTree(['/dashboard'], {queryParams: {tab: 'CATALOGUE', 'cUuid': this.catalogueUuid}}).toString()
                );
            } else {
                this.location.replaceState(
                    this.router.createUrlTree(['/dashboard'], {queryParams: {tab: 'CATALOGUE'}}).toString()
                );
                return;
            }
        }

        this.getCatalogueStatus.submit();
        Promise.all([
            this.catalogueService.getCatalogueResponse(userId, categoryName, this.searchText, this.pageSize, (this.page - 1) * this.pageSize, this.sortOption, catalogueId, productStatus),
            this.getCompanySettings(userId)
        ])
            .then(([catalogueResponse, settings]) => {
                // promise to retrieve categories used in the catalogue
                const categoryPromise = catalogueResponse.categoryUris && catalogueResponse.categoryUris.length ? this.categoryService.getCategories(catalogueResponse.categoryUris): Promise.resolve(null);
                categoryPromise.then(categories => {
                    this.catalogueResponse = catalogueResponse;
                    this.settings = settings;
                    this.updateView(categories ? categories.result : null);
                    this.getCatalogueStatus.callback(null, true);
                }).catch(error => {
                    this.getCatalogueStatus.error("Failed to get catalogue", error);
                })
            },
                error => {
                    this.getCatalogueStatus.error("Failed to get catalogue", error);
                }
            )
    }

    private getCompanySettings(userId: string): Promise<CompanySettings> {
        if (this.settings) {
            return Promise.resolve(this.settings);
        }

        return this.userService.getSettingsForUser(userId);
    }

    // called when the catalogue pagination response is retrieved to update the view
    private updateView(categoriesInSolrFormat = null): void {
        let len = this.catalogueResponse.catalogueLines.length;
        this.categoriesInSolrFormat = categoriesInSolrFormat ? sortSolrCategories(categoriesInSolrFormat) : [];
        this.collectionSize = this.catalogueResponse.size;
        this.catalogueLinesArray = [...this.catalogueResponse.catalogueLines];
        this.catalogueLinesWRTTypes = this.catalogueLinesArray;
        // if the white/black list functionality is available,
        // we need to set white/black lists using:
        //  - either the ones in the catalogue pagination response if the source page is not the company search page or new catalogue is selected
        //  - or the ones in the whiteBlackListService if the source page is the company search page
        if(this.config.whiteBlackListForCatalogue){
            // the source page is the company search page
            if(this.searchRef && this.whiteBlackListService.catalogueId){
                this.setWhiteBlackListAndPopulatePartyNameMap(this.whiteBlackListService.getSelectedCompanies('White'),this.whiteBlackListService.getSelectedCompanies('Black'));
                // reset whiteBlackListService service
                this.whiteBlackListService.reset()
            }
            else{
                this.setWhiteBlackListAndPopulatePartyNameMap(this.catalogueResponse.permittedParties ? this.catalogueResponse.permittedParties.map(value =>  this.getVatNumberObject(value)):[],
                    this.catalogueResponse.restrictedParties ? this.catalogueResponse.restrictedParties.map(value => this.getVatNumberObject(value)) : [])
            }
        }
        let i = 0;
        // Initialize catalogueLineView
        for (; i < len; i++) {
            this.catalogueLineView[this.catalogueResponse.catalogueLines[i].id] = false;
        }
        if(this.viewMode == 'OfferView'){
            this.productOfferingDetails = copy(this.networkCompanyListService.productOfferingDetails);
            this.setSelectedPartiesAndPopulatePartyNameMap();
        }
    }

    getVatNumberObject(vatNumber:string){
        return {"vatNumber":vatNumber}
    }

    onDeleteCatalogue(): void {
        this.deleteCatalogueModal.open('delete');
    }

    onHidePriceForCatalogue(){
        let hidden = !this.catalogueResponse.priceHidden;
        this.productCatalogueRetrievalStatus.submit();
        this.catalogueService.hidePriceForCatalogue(this.catalogueResponse.catalogueUuid, hidden).then( () => {
            this.catalogueResponse.priceHidden = hidden;
            this.productCatalogueRetrievalStatus.callback(this.translate.instant(this.catalogueResponse.priceHidden ? "Hid prices for the catalogue successfully" :"Exposed prices for the catalogue successfully") ,false);
        }).catch(error => {
            this.productCatalogueRetrievalStatus.error(this.translate.instant(hidden ? "Failed to hide prices for the catalogue" : "Failed to expose prices for the catalogue"),error);
        })
    }

    // methods for white/black list functionality
    onAddWhiteBlackListToCatalogue(){
        this.whiteBlackListPanelVisible = true;
        this.productSelectionForOffering = false;
    }

    onRemoveCompanyFromWhiteBlackList(listMode:'White'|'Black', index:number) {
        if(listMode=='White'){
            this.whiteListCompanies.splice(index,1);
        } else {
            this.blackListCompanies.splice(index,1);
        }
    }

    onAddCompanyToWhiteBlackList(listMode:'White'|'Black'): void {
        this.whiteBlackListService.listMode = listMode;
        this.whiteBlackListService.catalogueId = this.selectedCatalogue;

        this.whiteBlackListService.setSelectedPartiesInSearchForWhiteList(this.whiteListCompanies);
        this.whiteBlackListService.setSelectedPartiesInSearchForBlackList(this.blackListCompanies);

        this.router.navigate(['/simple-search'], { queryParams: { sTop: 'comp', pageRef: 'catalogue' } });
    }

    onSaveBlackWhiteLists(){
        let blackList = this.blackListCompanies.map(value => value.vatNumber);
        let whiteList = this.whiteListCompanies.map(value => value.vatNumber);

        this.whiteBlackListCallStatus.submit();
        this.catalogueService.addBlackWhiteListToCatalog(this.selectedCatalogue,blackList,whiteList).then(() => {
            this.whiteBlackListCallStatus.callback(this.translate.instant("Added black/white list to catalogue successfully"))
        }).catch(error => {
            this.whiteBlackListCallStatus.error("Failed to add black/white list to catalogue",error)
        })
    }
    // the end of methods for white/black list functionality

    // methods for product offering functionality
    onOfferCatalogueButtonClicked(): void {
        this.productSelectionForOffering = true;
        this.whiteBlackListPanelVisible = false;
    }

    offerProduct(line){
        this.viewMode = 'OfferView';

        this.productOfferingDetails = new ProductOfferingDetails();
        this.productOfferingDetails.selectedProduct = line;

        // to retrieve party names for the ones in the network
        this.setSelectedPartiesAndPopulatePartyNameMap();
    }

    offerCatalog(selectedCatalogueUuid:string){
        this.productOfferingDetails = new ProductOfferingDetails();

        if(selectedCatalogueUuid == 'all'){
            this.productOfferingDetails.selectedCatalogueUuids = copy(this.catalogueUuids);
            this.productOfferingDetails.selectedCatalogIds = this.cataloguesIds.map(catalogueId => catalogueId == "default" ? this.translate.instant("Main Catalogue"):catalogueId).join();
        } else{
            let index = this.catalogueUuids.findIndex(uuid => uuid == selectedCatalogueUuid);
            this.productOfferingDetails.selectedCatalogueUuids = [selectedCatalogueUuid];
            this.productOfferingDetails.selectedCatalogIds = this.cataloguesIds[index] == "default" ? this.translate.instant("Main Catalogue"): this.cataloguesIds[index];
        }

        this.viewMode = 'OfferView';

        // to retrieve party names for the ones in the network
        this.setSelectedPartiesAndPopulatePartyNameMap();
    }

    onRemoveCompanyFromList(companyIndex:number) {
        this.productOfferingDetails.vatNumber.splice(companyIndex,1);
    }

    onAddCompanyToList(): void {
        this.networkCompanyListService.reset();
        this.networkCompanyListService.productOfferingDetails = this.productOfferingDetails;
        this.router.navigate(['/simple-search'], { queryParams: { sTop: 'comp', pageRef: 'offering' } });
    }

    isPartyNamesLoading(): boolean {
        return this.getPartyNameCallStatus.fb_submitted;
    }

    onSendOffer(){
        this.callStatus.submit();

        if(this.productOfferingDetails.vatNumber.length == 0){
            this.callStatus.error(this.translate.instant("Select at least one company to send your offer!"));
            return;
        }

        let catalogIds = this.productOfferingDetails.selectedCatalogueUuids;
        let lineIds = null;
        if(this.productOfferingDetails.selectedProduct){
            catalogIds = [this.productOfferingDetails.selectedProduct.goodsItem.item.catalogueDocumentReference.id];
            lineIds = [this.productOfferingDetails.selectedProduct.goodsItem.item.manufacturersItemIdentification.id]
        }
        this.catalogueService.offerCatalogsOrLines(catalogIds,lineIds,this.productOfferingDetails.vatNumber,this.productOfferingDetails.description).then(() => {
            this.callStatus.callback(this.translate.instant("Offered the product details to specified companies successfully"));
        }).catch(error => {
            this.callStatus.error(this.translate.instant("Failed to offer your products"),error);
        });
    }

    cancelProductOffering(){
        this.viewMode = "OwnerView";
        this.productSelectionForOffering = false;
        // reset call status
        this.callStatus.reset();
    }

    onListInputUpdated(){
        this.companyListInput = !this.companyListInput;
        this.productOfferingDetails.vatNumber = [];
    }
    onSelectedNetwork(networkId:string){
        let network = this.settings.negotiationSettings.company.network.find(network => network.id == networkId);
        if(network){
            this.productOfferingDetails.vatNumber = copy(network.vatNumber);
        } else{
            this.productOfferingDetails.vatNumber = [];
        }
    }
    // the end of methods for product offering functionality
    onDeleteCatalogueImages(): void {
        this.deleteCatalogueModal.open('delete-images');
    }

    onGenerateContractForCatalogue(): void {
        const index = this.catalogueUuids.findIndex(uuid => uuid == this.selectedCatalogue);
        // save the selected catalogue id
        this.catalogueIdForContractCreation = this.cataloguesIds[index];
        // save the selected catalogue uuid
        this.catalogueUuidForContractCreation = this.selectedCatalogue;
        // change the view
        this.viewMode = "ContractView";

        this.whiteBlackListPanelVisible = false;
    }

    onContractCreationCompleted(){
        // change the view
        this.viewMode = "OwnerView";
        // reset the selected catalogue id and uuid
        this.catalogueIdForContractCreation = null;
        this.catalogueUuidForContractCreation = null;
    }

    onAddCatalogue() {
        const userId = this.cookieService.get("user_id");
        this.userService.getUserParty(userId).then(userParty => {

            let catalogue: Catalogue = new Catalogue(this.catalogueText, null, userParty, "", "", []);
            // add catalogue line to the end of catalogue
            this.catalogueService.postCatalogue(catalogue)
                .then(() => {
                    this.catalogueText = "";
                    this.cancelAddingCatalogue();
                    this.ngOnInit();

                })
                .catch(() => {
                })
        }).catch(() => {
        });
    }

    cancelAddingCatalogue() {
        this.addCatalogue = false;
    }

    onAddingCatalogue() {
        this.addCatalogue = true;
    }

    onOpenCatalogueLine(e: Event) {
        e.stopImmediatePropagation();
    }

    redirectToEdit(catalogueLine) {
        this.catalogueService.editCatalogueLine(catalogueLine);
        this.publishService.resetData("edit");
        this.categoryService.resetSelectedCategories();
        this.catalogueService.getCatalogueFromUuid(catalogueLine.goodsItem.item.catalogueDocumentReference.id)
            .then(res => {
                if (isLogisticsService(catalogueLine))
                    this.router.navigate(['catalogue/publish-logistic'], { queryParams: { cat: res.id} });
                else
                    this.router.navigate(['catalogue/publish-single'], { queryParams: { cat: res.id } });
            })
            .catch(() => {
                if (isLogisticsService(catalogueLine))
                    this.router.navigate(['catalogue/publish-logistic'], { queryParams: { cat: 'default' } });
                else
                    this.router.navigate(['catalogue/publish-single'], { queryParams: { cat: 'default' } });
            });
    }

    redirectToCopy(catalogueLine) {
        this.catalogueService.editCatalogueLine(catalogueLine);
        this.publishService.resetData("copy");
        this.categoryService.resetSelectedCategories();
        if (this.catalogueUuid == "all") {
            this.catalogueService.getCatalogueFromUuid(catalogueLine.goodsItem.item.catalogueDocumentReference.id)
                .then(res => {
                    if (isLogisticsService(catalogueLine))
                        this.router.navigate(['catalogue/publish-logistic'], { queryParams: { cat: res.id} });
                    else
                        this.router.navigate(['catalogue/publish-single'], { queryParams: { cat: res.id } });
                })
                .catch(() => {
                    if (isLogisticsService(catalogueLine))
                        this.router.navigate(['catalogue/publish-logistic'], { queryParams: { cat: 'default' } });
                    else
                        this.router.navigate(['catalogue/publish-single'], { queryParams: { cat: 'default' } });
                });
        } else {
            if (isLogisticsService(catalogueLine))
                this.router.navigate(['catalogue/publish-logistic'], { queryParams: { cat: this.catalogueUuid } });
            else
                this.router.navigate(['catalogue/publish-single'], { queryParams: { cat: this.catalogueUuid} });
        }

    }

    deleteCatalogueLine(catalogueLine: CatalogueLine, i: number): void {
        this.appComponent.confirmModalComponent.open("Are you sure that you want to delete this catalogue item?").then(result => {
            if(result){
                const status = this.getDeleteStatus(i);
                status.submit();
                let catalogue_uuid = "";

                if (this.catalogueService.catalogueResponse.catalogueUuid === "" || this.catalogueService.catalogueResponse.catalogueUuid == null) {
                    catalogue_uuid = catalogueLine.goodsItem.item.catalogueDocumentReference.id;
                } else {
                    catalogue_uuid = this.catalogueService.catalogueResponse.catalogueUuid;
                }

                this.catalogueService.deleteCatalogueLine(catalogue_uuid, catalogueLine.id)
                    .then(() => {
                        this.requestCatalogue();
                        status.callback("Catalogue line deleted", true);
                    })
                    .catch(() => {
                        status.error("Error while deleting catalogue line");
                    });
            }
        });
    }

    getDeleteStatus(index: number): CallStatus {
        return this.deleteStatuses[index % this.pageSize];
    }

    onExportCatalogue(): void {
        this.deleteCatalogueModal.open('export');
    }

    onChangeProductStatus(): void {
        this.deleteCatalogueModal.open('product-status');
    }

    onUploadImage(): void {
        this.deleteCatalogueModal.open('upload-image');
    }

    navigateToThePublishPage() {
        this.router.navigate(['/catalogue/publish-single']);
    }

    navigateToBulkUploadPage() {
        this.router.navigate(["/catalogue/publish-bulk"]);
    }

    initDataRetrieval() {
        this.productCatalogueRetrievalStatus.submit();
        // first retrieve the identifiers
        this.catalogueService.getCatalogueIdsUUidsForParty().then((catalogueIds) => {
            var idList = [];
            var uuidList = [];

            for (var obj in catalogueIds) {
                idList.push(catalogueIds[obj][0]);
                uuidList.push(catalogueIds[obj][1]);
            }

            this.cataloguesIds = idList;
            this.catalogueUuids = uuidList;

            // once the ids are available, get the actual data
            this.requestCatalogue();
            this.productCatalogueRetrievalStatus.callback("Successfully loaded catalogueId list", true);
        }).catch(() => {
            this.productCatalogueRetrievalStatus.error('Failed to get product catalogues');
        });
    }

    isPricePublicInformation(catLine:CatalogueLine){
        return !(catLine.nonPublicInformation && catLine.nonPublicInformation.findIndex(value => value.id === NON_PUBLIC_FIELD_ID.DEFAULT_PRICE) !== -1);
    }
}
