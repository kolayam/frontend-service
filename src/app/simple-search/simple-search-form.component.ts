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

import {Component, OnDestroy, OnInit} from '@angular/core';
import {Search} from './model/search';
import {SimpleSearchService} from './simple-search.service';
import {ActivatedRoute, Router} from '@angular/router';
import * as myGlobals from '../globals';
import {SearchContextService} from './search-context.service';
import {Observable, Subject} from 'rxjs';
import {debounceTime, distinctUntilChanged, map, switchMap} from 'rxjs/operators';
import {copy, getPropertyKey, roundToTwoDecimals, selectNameFromLabelObject} from '../common/utils';
import {CallStatus} from '../common/call-status';
import {CURRENCIES, DEFAULT_LANGUAGE} from '../catalogue/model/constants';
import {CategoryService} from '../catalogue/category/category.service';
import {Category} from '../common/model/category/category';
import {CatalogueService} from '../catalogue/catalogue.service';
import {PublishService} from '../catalogue/publish-and-aip.service';
import {ShoppingCartDataService} from '../bpe/shopping-cart/shopping-cart-data-service';
import {UBLModelUtils} from '../catalogue/model/ubl-model-utils';
import {deliveryPeriodUnitListId, product_base_quantity, product_base_quantity_unit} from '../common/constants';
import {TranslateService} from '@ngx-translate/core';
import {AppComponent} from '../app.component';
import {WhiteBlackListService} from '../catalogue/white-black-list.service';
import {NetworkCompanyListService} from '../user-mgmt/network-company-list.service';
import {RatingUi} from '../catalogue/model/ui/rating-ui';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {CookieService} from 'ng2-cookies';
import {Filter} from './model/filter';
import {UnitService} from '../common/unit-service';
import * as L from 'leaflet';
import 'style-loader!leaflet/dist/leaflet.css';
import {UserService} from '../user-mgmt/user.service';
import {Address} from '../user-mgmt/model/address';
import {Facet} from './model/facet';
import {FacetOption} from './model/facet-option';
import {CompanySubscriptionsComponent} from '../user-mgmt/company-settings/company-subscriptions.component';
import {CompanySubscriptionService} from '../user-mgmt/company-subscription.service';


@Component({
    selector: 'simple-search-form',
    templateUrl: './simple-search-form.component.html',
    styleUrls: ['./simple-search-form.component.css']
})

export class SimpleSearchFormComponent implements OnInit, OnDestroy {

    product_vendor = myGlobals.product_vendor;
    product_vendor_id = myGlobals.product_vendor_id;
    product_vendor_name = myGlobals.product_vendor_name;
    product_vendor_brand_name = myGlobals.product_vendor_brand_name;
    product_vendor_rating = myGlobals.product_vendor_rating;
    product_vendor_rating_seller = myGlobals.product_vendor_rating_seller;
    product_vendor_rating_fulfillment = myGlobals.product_vendor_rating_fulfillment;
    product_vendor_rating_delivery = myGlobals.product_vendor_rating_delivery;
    product_vendor_evaluation = myGlobals.product_vendor_evaluation;
    product_vendor_trust = myGlobals.product_vendor_trust;
    product_name = myGlobals.product_name;
    product_description = myGlobals.product_description;
    product_img = myGlobals.product_img;
    product_vendor_img = myGlobals.product_vendor_img;
    product_base_quantity = product_base_quantity;
    product_base_quantity_unit = product_base_quantity_unit;
    product_price = myGlobals.product_price;
    product_price_hidden = myGlobals.product_price_hidden;
    separateFilterForCircularEconomyCertificatesInCompanySearch = myGlobals.config.separateFilterForCircularEconomyCertificatesInCompanySearch;
    product_delivery_time = myGlobals.product_delivery_time;
    product_currency = myGlobals.product_currency;
    product_filter_prod = myGlobals.product_filter_prod;
    product_filter_comp = myGlobals.product_filter_comp;
    product_filter_trust = myGlobals.product_filter_trust;
    product_filter_mappings = myGlobals.product_filter_mappings;
    product_nonfilter_full = myGlobals.product_nonfilter_full;
    product_nonfilter_regex = myGlobals.product_nonfilter_regex;
    product_nonfilter_data_type = myGlobals.product_nonfilter_data_type;
    product_cat = myGlobals.product_cat;
    product_cat_mix = myGlobals.product_cat_mix;
    party_facet_field_list = myGlobals.party_facet_field_list;
    party_filter_main = myGlobals.party_filter_main;
    party_filter_trust = myGlobals.party_filter_trust;
    roundToTwoDecimals = roundToTwoDecimals;
    item_manufacturer_id = myGlobals.item_manufacturer_id;
    searchIndex = myGlobals.config.defaultSearchIndex;
    productServiceFiltersEnabled = myGlobals.config.productServiceFiltersEnabled;
    collapsiblePropertyFacets = myGlobals.config.collapsiblePropertyFacets;
    displayCategoryCounts = myGlobals.config.displayCategoryCounts;
    companyInformationInSearchResult = myGlobals.config.companyInformationInSearchResult;
    enableOtherFiltersSearch = myGlobals.config.enableOtherFiltersSearch;
    showTrustScore = myGlobals.config.showTrustScore;
    enableTenderAndBidManagementToolIntegration = myGlobals.config.enableTenderAndBidManagementToolIntegration;
    smeClusterCreateOpportunityEndpoint = myGlobals.smeClusterCreateOpportunityEndpoint;
    searchIndexes = ['Name', 'Category'];
    searchTopic = null;
    // content of the tooltip for product search
    tooltipHTML: string;

    // fields for price range
    CURRENCIES = CURRENCIES;
    selectedCurrency: any = myGlobals.config.standardCurrency;
    selectedPriceMin: any;
    selectedPriceMax: any;
    // fields for delivery period range
    deliveryPeriodUnits:any;
    selectedDeliveryTimeUnit: string;
    selectedDeliveryTimeMin: any;
    selectedDeliveryTimeMax: any;

    // keeps ratings for the Rating & Trust filter
    ratingTrustFilters: RatingUi[] = null;

    showCatSection = true;
    showTrustSection = false;

    // filters for product and company search
    // catalogue filter
    catalogueFilter: Filter = null;
    // catalogue uuid - id pairs in the form of {'uuid':'id', 'uuid2':'id2'}
    catalogueIds: any = null;
    // product/service filters
    productFilter:Filter = null;
    // vendor filters for product search
    productVendorFilter:Filter = null;
    // other filters for product search
    productOtherFilter:Filter = null;
    // circular economy certificate filters for product search
    // it is used iff the product/service filter is not enabled
    circularEconomyCertificatesFilter:Filter = null;
    // filters for company search
    companyFilter:Filter = null;
    // end of filters for product and company search

    shoppingCartCallStatuses: CallStatus[] = [];
    searchCallStatus: CallStatus = new CallStatus();
    callback = false;
    size = 0;
    page = 1;
    rows = 12;
    start = 0;
    end = 0;
    display = 'list';
    sort = 'score desc';
    cat = '';
    catID = '';
    cat_level = -1;
    cat_levels = [];
    cat_loading = true;
    searchContext = null;
    model = new Search('');
    objToSubmit = new Search('');
    // keeps the facet list set when the product/company results are received
    facetList: Facet[];
    facetQuery: any[];
    // results of product/company search
    searchResults: any;
    // company solr results for the map view
    companyResults: any[];

    // fields for map view
    // the address of active company
    companyAddress:Address = null;
    // end of fields for map view

    // keeps the images if exists for the product search results
    productImageMap: any = {};
    maxFacets = 5;
    manufacturerIdCountMap: any;

    imgEndpoint = myGlobals.user_mgmt_endpoint + '/company-settings/image/';

    config = myGlobals.config;
    getMultilingualLabel = selectNameFromLabelObject;
    // used to get labels of the ubl properties
    ublProperties = null;

    pageRef = ''; // page where the user is navigated from. empty string ('') means the search is opened directly

    productsSelectedForPublish: any[] = []; // keeps the products in the Solr format

    // selected taxonomy in the category facet
    taxonomy: string = null;
    // available ontologies on the instance
    taxonomyIDs: string[] = null;
    // category counts which are needed to build category tree
    categoryCounts: any[] = null;

    ngUnsubscribe: Subject<void> = new Subject<void>();
    // suggestions for the category search
    categorySuggestions: any = [];
    // keeps the user's login state
    private isLoggedIn: boolean;

    // fields for catalogue exchange functionality
    catalogueExchangeEnabled = myGlobals.config.catalogExchangeEnabled;
    // keeps the uuid of catalogue selected from the catalogue id filter
    selectedCatalogueUuidFromCatalogIdFilter:string = null;
    requestForCatalogExchangeDetails:string;
    requestForCatalogExchangeCallStatus:CallStatus = new CallStatus();
    // end of fields for catalogue exchange functionality

    mapView = false;

    constructor(private simpleSearchService: SimpleSearchService,
                private searchContextService: SearchContextService,
                private categoryService: CategoryService,
                private catalogueService: CatalogueService,
                private whiteBlackListService: WhiteBlackListService,
                public networkCompanyListService: NetworkCompanyListService,
                public companySubscriptionService: CompanySubscriptionService,
                private publishService: PublishService,
                public shoppingCartDataService: ShoppingCartDataService,
                private cookieService: CookieService,
                public appComponent: AppComponent,
                private unitService:UnitService,
                private modalService: NgbModal,
                public route: ActivatedRoute,
                private translate: TranslateService,
                private userService:UserService,
                public router: Router) {
    }

    ngOnInit(): void {
        // get the address of active company
        if(this.appComponent.isLoggedIn){
            this.userService.getSettingsForUser(this.cookieService.get("user_id")).then(settings => {
                this.companyAddress = settings.details.address;
            });
        }
        window.scrollTo(0, 0);
        this.unitService.getCachedUnitList(deliveryPeriodUnitListId).then(list =>{
            this.deliveryPeriodUnits = list;
            // select the first one
            this.selectedDeliveryTimeUnit = this.deliveryPeriodUnits[0]
        });
        this.route.queryParams.subscribe(params => {
            let q = params['q'];
            let fq = params['fq'];
            let p = params['p'];
            let rows = params['rows'];
            let sort = params['sort'];
            let cat = params['cat'];
            let catID = params['catID'];
            let pageRef = params['pageRef'];
            let searchContext = params['searchContext'];
            let sIdx = params['sIdx'];
            if (sIdx) {
                this.searchIndex = sIdx;
            } else {
                this.searchIndex = myGlobals.config.defaultSearchIndex;
            }
            let sTop = params['sTop'];
            if (sTop) {
                this.searchTopic = sTop;
            } else {
                this.searchTopic = null;
            }
            if (this.searchTopic == 'comp') {
                this.searchIndexes = ['Name', 'Business Keywords'];
            } else {
                this.searchIndexes = ['Name', 'Category'];
            }
            if (this.searchIndex && this.searchIndexes.indexOf(this.searchIndex) == -1) {
                this.searchIndex = this.searchIndexes[0];
            }
            let display = params['display'];
            if (display) {
                this.display = display;
            } else {
                this.display = 'list';
            }
            if (fq) {
                fq = decodeURIComponent(fq).split('_SEP_');
            } else {
                fq = [];
            }
            if (rows && !isNaN(rows)) {
                rows = parseInt(rows);
                this.rows = rows;
            } else {
                rows = 12;
            }
            if (p && !isNaN(p)) {
                p = parseInt(p);
                this.size = p * rows;
                this.page = p;
            } else {
                p = 1;
            }
            if (sort) {
                this.sort = sort;
            } else {
                sort = 'score desc';
                this.sort = sort;
            }
            if (cat) {
                this.cat = cat;
            } else {
                this.cat = '';
            }

            this.mapView = false;
            // if the standard taxonomy is 'All', then we use 'eClass' as the default taxonomy
            // and populate 'taxonomyIDs' variable with the ones available in the instance
            if (myGlobals.config.standardTaxonomy.localeCompare('All') == 0) {
                this.taxonomy = 'eClass';
                this.taxonomyIDs = Object.keys(myGlobals.config.categoryFilter);
            }
            // otherwise, we use the selected taxonomy as the default one
            else {
                this.taxonomy = myGlobals.config.standardTaxonomy;
            }

            if (catID) {
                this.catID = catID;
                // set the taxonomy according to the selected category
                for (let taxonomy of Object.keys(myGlobals.config.categoryFilter)) {
                    let ontologyPrefix = myGlobals.config.categoryFilter[taxonomy].ontologyPrefix;
                    if (catID.startsWith(ontologyPrefix)) {
                        this.taxonomy = taxonomy;
                        break;
                    }
                }
            } else {
                this.catID = '';
            }
            if (pageRef) {
                this.pageRef = pageRef;
            } else {
                this.pageRef = null;
            }
            this.searchContext = !!searchContext;
            this.rows = rows;
            // set the uuid of catalogue selected from the catalogue id filter if catalogue id query exists
            this.selectedCatalogueUuidFromCatalogIdFilter = null;
            if(fq){
                let catalogueIdFilterQuery = fq.find(fq => fq.startsWith("catalogueId:"));
                if(catalogueIdFilterQuery){
                    this.selectedCatalogueUuidFromCatalogIdFilter = catalogueIdFilterQuery.substring("catalogueId:".length).replace(new RegExp("\"", 'g'), "");
                }
            }
            if (q && sTop) {
                if (sTop == 'prod') {
                    this.getCall(q, fq, p, sort, cat, catID, sIdx, sTop);
                } else if (sTop == 'comp') {
                    this.getCompCall(q, fq, p, sort, sTop);
                }
            } else if (sTop) {
                this.callback = false;
                this.searchCallStatus.reset();
                this.model.q = '*';
                this.objToSubmit.q = '*';
                this.facetQuery = fq;
                this.page = p;
                this.sort = sort;
                this.objToSubmit = copy(this.model);
                this.page = 1;
                this.get(this.objToSubmit);
            } else {
                this.callback = false;
                this.searchCallStatus.reset();
                this.model.q = '*';
                this.objToSubmit.q = '*';
                this.facetQuery = fq;
                this.page = p;
                this.sort = sort;
            }

            // populate shoppingCartCallStatuses
            this.shoppingCartCallStatuses = [];
            for (let i = 0; i < this.rows; i++) {
                this.shoppingCartCallStatuses.push(new CallStatus());
            }
        });

        this.isLoggedIn = !!this.cookieService.get('user_id');
    }

    ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    initializeRatingAndTrustFilters() {
        if (this.ratingTrustFilters === null) {
            this.ratingTrustFilters = [];
            this.ratingTrustFilters.push(new RatingUi(this.product_vendor_rating, this.getName(this.product_vendor_rating, this.product_vendor), 0))
            this.ratingTrustFilters.push(new RatingUi(this.product_vendor_rating_seller, this.getName(this.product_vendor_rating_seller, this.product_vendor), 0))
            this.ratingTrustFilters.push(new RatingUi(this.product_vendor_rating_fulfillment, this.getName(this.product_vendor_rating_fulfillment, this.product_vendor), 0))
            this.ratingTrustFilters.push(new RatingUi(this.product_vendor_rating_delivery, this.getName(this.product_vendor_rating_delivery, this.product_vendor), 0))

            this.ratingTrustFilters.sort(function (a, b) {
                return a.displayName.localeCompare(b.displayName);
            });

            this.ratingTrustFilters.push(new RatingUi(this.product_vendor_trust, this.getName(this.product_vendor_trust, this.product_vendor), 0))
        }
    }

    get(search: Search): void {
        this.router.navigate(['/simple-search'], {
            queryParams: {
                q: search.q,
                fq: encodeURIComponent(this.facetQuery.join('_SEP_')),
                p: this.page,
                rows: this.rows,
                display: this.display,
                sort: this.sort,
                searchContext: this.searchContext,
                cat: this.cat,
                catID: this.catID,
                sIdx: this.searchIndex,
                sTop: this.searchTopic,
                pageRef: this.pageRef
            }
        });
    }

    setSearchTopic(sTop: string): void {
        this.router.navigate(['/simple-search'], {
            queryParams: {
                q: '*',
                fq: encodeURIComponent(this.facetQuery.join('_SEP_')),
                p: this.page,
                rows: this.rows,
                display: this.display,
                sort: this.sort,
                searchContext: this.searchContext,
                cat: this.cat,
                catID: this.catID,
                sIdx: this.searchIndex,
                sTop: sTop,
                pageRef: this.pageRef
            }
        });
    }

    setRows(rows: any): void {
        this.router.navigate(['/simple-search'], {
            queryParams: {
                q: this.objToSubmit.q,
                fq: encodeURIComponent(this.facetQuery.join('_SEP_')),
                p: 1,
                rows: parseInt(rows),
                display: this.display,
                sort: this.sort,
                searchContext: this.searchContext,
                cat: this.cat,
                catID: this.catID,
                sIdx: this.searchIndex,
                sTop: this.searchTopic,
                pageRef: this.pageRef
            }
        });
    }

    setDisplay(display: any): void {
        this.router.navigate(['/simple-search'], {
            queryParams: {
                q: this.objToSubmit.q,
                fq: encodeURIComponent(this.facetQuery.join('_SEP_')),
                p: this.page,
                rows: this.rows,
                display: display,
                sort: this.sort,
                searchContext: this.searchContext,
                cat: this.cat,
                catID: this.catID,
                sIdx: this.searchIndex,
                sTop: this.searchTopic,
                pageRef: this.pageRef
            }
        });
    }

    setSort(sort: any): void {
        this.router.navigate(['/simple-search'], {
            queryParams: {
                q: this.objToSubmit.q,
                fq: encodeURIComponent(this.facetQuery.join('_SEP_')),
                p: this.page,
                rows: this.rows,
                display: this.display,
                sort: sort,
                searchContext: this.searchContext,
                cat: this.cat,
                catID: this.catID,
                sIdx: this.searchIndex,
                sTop: this.searchTopic,
                pageRef: this.pageRef
            }
        });
    }

    private changeSearchIndex(indexName) {
        if (this.searchIndex != indexName) {
            this.searchIndex = indexName;
        }
    }

    getSuggestions = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            switchMap(term =>
                this.simpleSearchService.getSuggestions(term, this.searchIndex)
            )
        ).pipe(map(suggestions => {
            // for the category search, suggestions include category label and uri
            if (this.searchIndex === 'Category') {
                this.categorySuggestions = suggestions;
                return suggestions.map(suggestion => suggestion['label']);
            }
            return suggestions;
        }));

    getCompSuggestions = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            switchMap(term =>
                this.simpleSearchService.getCompSuggestions(term, this.searchIndex == 'Business Keywords' ? ['{LANG}_businessKeywords'] : [this.product_vendor_name, ('{LANG}_' + this.product_vendor_brand_name)], this.pageRef,false,true)
            )
        );

    private async buildCatTree() {

        // taxonomy prefix corresponds to the base url of the taxonomy that exists before each relevant category
        // e.g. assuming category url: http://www.aidimme.es/FurnitureSectorOntology.owl#MDFBoard
        // taxonomy prefix would be: http://www.aidimme.es/FurnitureSectorOntology.owl#
        let taxonomyPrefix = '';
        if (this.config.categoryFilter[this.taxonomy] && this.config.categoryFilter[this.taxonomy].ontologyPrefix) {
            taxonomyPrefix = this.config.categoryFilter[this.taxonomy].ontologyPrefix;
        }

        // retrieve the labels for the category uris included in the categoryCounts field
        let categoryUris: string[] = [];
        for (let categoryCount of this.categoryCounts) {
            categoryUris.push(categoryCount.label);
        }
        this.cat_loading = true;
        // here, all the information about the categories are fetched from the indexing service
        const indexCategories = await this.categoryService.getCategories(categoryUris);
        // extract only the required information in UI from the complete category information
        let categoryDisplayInfo: any = this.getCategoryDisplayInfo(indexCategories, this.categoryCounts);
        if (taxonomyPrefix != '') {
            // save the selected category
            let originalSelectedCategoryID = this.catID;
            let originalSelectedCategoryName = this.cat;
            // build the category tree until the latest level contains more than one category or
            // the category at the latest level does not have any children categories
            let previouslySelectedCategoryId = '';
            do {
                previouslySelectedCategoryId = this.catID;
                // set the level of the selected category, if any
                this.cat_level = this.getCatLevel(this.catID, indexCategories.result);
                this.cat_levels = [];
                this.constructCategoryTree(indexCategories.result, categoryDisplayInfo, this.taxonomy, taxonomyPrefix);

                this.sortCatLevels();
                this.populateOtherEntries();
                // if the latest level contains only one category, make it the selected category
                // and populate category tree again
                let catLevelSize = this.cat_levels.length;
                if (catLevelSize > 0 && this.cat_levels[catLevelSize - 1].length == 1) {
                    this.catID = this.cat_levels[catLevelSize - 1][0].id;
                    this.cat = this.cat_levels[catLevelSize - 1][0].name;
                }

            } while (this.catID != previouslySelectedCategoryId);
            // set the selected category
            this.catID = originalSelectedCategoryID;
            this.cat = originalSelectedCategoryName;
        } else {
            // set the level of the selected category, if any
            this.cat_level = this.getCatLevel(this.catID, indexCategories.result);
            this.cat_levels = [];
        }
        this.cat_loading = false;
    }

    private constructCategoryTree(indexCategories: any[],
                                  categoryDisplayInfo: any,
                                  taxonomy: string,
                                  taxonomyPrefix: string) {
        if (this.cat_level === -1) {
            // get root categories
            let rootCategories: any[] = [];
            for (let category of indexCategories) {
                if (category.allParents == null && this.isCategoryDisplayable(category.uri, categoryDisplayInfo, taxonomy, taxonomyPrefix)) {
                    rootCategories.push({
                        'name': category.uri,
                        'id': category.uri,
                        'count': categoryDisplayInfo[category.uri].count,
                        'preferredName': selectNameFromLabelObject(categoryDisplayInfo[category.uri].label)
                    });
                }
            }
            this.cat_levels.push(rootCategories);

        } else {
            let selectedIndexCategory: any = indexCategories.find(indexCategory => indexCategory.uri === this.catID);
            for (let indexCategory of indexCategories) {
                // check whether the category belongs to the active taxonomy and not hidden
                if (!this.isCategoryDisplayable(indexCategory.uri, categoryDisplayInfo, taxonomy, taxonomyPrefix)) {
                    continue;
                }

                let parentsAndChildren: string[] =
                    (selectedIndexCategory.allChildren != null ? selectedIndexCategory.allChildren : [])
                        .concat(selectedIndexCategory.allParents != null ? selectedIndexCategory.allParents : []);
                let catLevel = indexCategory.allParents != null ? indexCategory.allParents.length : 0;
                if (indexCategory.uri !== selectedIndexCategory.uri && // include the taxonomy itself no matter what
                    // do not include the category if it is not include in the hierarchy of the selected category
                    // or it is located on a two or more levels deeper in the hierarchy
                    parentsAndChildren.findIndex(uri => uri === indexCategory.uri) === -1 || (catLevel - this.cat_level > 1)) {
                    continue;
                }

                if (this.cat_levels[catLevel] == null) {
                    this.cat_levels[catLevel] = [];
                }

                let categoryUri: string = indexCategory.uri;
                this.cat_levels[catLevel].push({
                    'name': categoryUri,
                    'id': categoryUri,
                    'count': categoryDisplayInfo[categoryUri].count,
                    'preferredName': selectNameFromLabelObject(categoryDisplayInfo[categoryUri].label)
                });
            }
        }
    }

    /**
     * Decides whether a category could be displayed in the category taxonomy filter. Checks:
     * 1) whether the resultant category has appropriate labels
     * 2) whether the category belongs to the active taxonomy
     * 3) is not configured as hidden
     */
    private isCategoryDisplayable(categoryUri: string, categoryDisplayInfo: any, taxonomy: string, taxonomyPrefix: string): boolean {
        let idSplitIndex = categoryUri.lastIndexOf('#');
        let categoryName = categoryUri.substr(idSplitIndex + 1);
        return categoryDisplayInfo[categoryUri] != null &&
            categoryUri.indexOf(taxonomyPrefix) !== -1 &&
            this.config.categoryFilter[taxonomy].hiddenCategories.indexOf(categoryName) === -1;
    }

    private sortCatLevels() {
        for (let i = 0; i < this.cat_levels.length; i++) {
            this.cat_levels[i].sort(function (a, b) {
                const a_c: string = a.preferredName;
                const b_c: string = b.preferredName;
                return a_c.localeCompare(b_c);
            });
        }
    }

    private getCatLevel(categoryUri: string, indexCategories: any): number {
        if (categoryUri) {
            let category: any = indexCategories.find(indexCategory => indexCategory.uri === categoryUri);
            return category.allParents != null ? category.allParents.length : 0;
        } else {
            return -1;
        }
    }

    /**
     * When the count sum of the child categories do not sum up to count to the parent category, we add an additional entry
     * under the selected category.
     * For instance:
     * Automative technology (4)
     *  Aircraft (1)
     *  Bicycle (1)
     *
     * In this case, we add an additional entry as follows:
     * Automative technology (4)
     *  Aircraft (1)
     *  Bicycle (1)
     *  Other automative technology (2)
     *
     * This method adds this additional entry
     */
    private populateOtherEntries(): void {
        // a category should have been selected
        // and the cat_levels should non be empty. It can be empty when categories from different taxonomies are used for filtering
        if (this.cat_level === -1 || this.cat_levels.length === 0) {
            return;
        }

        // the selected category should not reside at the deepest level
        if (this.cat_level < (this.cat_levels.length - 1)) {
            let childLevelCount = 0;
            for (let levelEntry of this.cat_levels[this.cat_level + 1]) {
                childLevelCount += levelEntry.count;
            }
            let currentLevelCount: number = this.cat_levels[this.cat_level][0].count;

            let difference: number = currentLevelCount - childLevelCount;
            if (difference > 0) {
                this.cat_levels[this.cat_levels.length - 1].push({
                    'name': 'Other',
                    'id': this.catID,
                    'count': (currentLevelCount - childLevelCount),
                    'preferredName': this.appComponent.translate.instant('Other') + ' ' + this.cat_levels[this.cat_level][0].preferredName.toLowerCase(),
                    'other': true
                });
            }
            return;
        }

        // if the 'Others' entry is already selected, there should be an excluding facet query.
        // therefore, we add that entry once again
        if (this.excludingCategoryFacetQueryExists()) {
            // the innermost level should include only the parent category for which the 'other' results are presented.
            // we add an additional level including the other entry
            this.cat_levels.push([]);
            this.cat_levels[this.cat_level + 1].push({
                'name': 'Other',
                'id': this.catID,
                'count': this.cat_levels[this.cat_level][0].count,
                'preferredName': this.appComponent.translate.instant('Other') + ' ' + this.cat_levels[this.cat_level][0].preferredName.toLowerCase(),
                'other': true
            });
        }
    }

    private getCall(q: string, fq: any, p: number, sort: string, cat: string, catID: string, sIdx: string, sTop: string) {
        this.cat_loading = true;
        if (q == '*') {
            this.model.q = '';
        } else {
            this.model.q = q;
        }
        this.objToSubmit.q = q;
        this.facetQuery = fq;
        this.page = p;
        this.sort = sort;
        if (this.model.q == '' && this.sort == 'score desc') {
            sort = '{LANG}_lowercaseLabel asc';
        }
        this.searchIndex = sIdx;
        this.searchTopic = sTop;
        this.searchCallStatus.submit();
        // get all fields available in the index
        this.simpleSearchService.getFields()
            .then(fields => {
                // extract fields' (i.e. facets') labels and types
                let fieldLabels: any[] = this.getFieldNames(fields);
                let idxFields: string[] = this.getIdxFields(fields);
                // execute the query such that it includes facet results in addition to the actual results
                this.simpleSearchService.get(q, Object.keys(fieldLabels), fq, p, this.rows, sort, cat, catID, this.searchIndex)
                    .then(res => {
                        if (res.result.length == 0) {
                            this.cat_loading = false;
                            this.callback = true;
                            this.searchCallStatus.callback('Search done.', true);
                            this.searchResults = res.result;
                            this.companyResults = [];
                            this.size = res.totalElements;
                            this.page = p;
                            this.start = this.page * this.rows - this.rows + 1;
                            this.end = this.start + res.result.length - 1;
                            this.displayShoppingCartMessages();
                        } else {
                            // when there are some products in the search result, get details of fields to construct facet objects
                            this.simpleSearchService.getUblAndQuantityProperties(idxFields).then(response => {
                                this.facetList = [];
                                this.manufacturerIdCountMap = new Map();

                                for (let facet in res.facets) {
                                    if (facet == this.product_cat_mix) {
                                        this.categoryCounts = res.facets[this.product_cat_mix].entry;
                                        this.buildCatTree();
                                        this.handleFacets(fieldLabels, res.facets, response.result);
                                        // initialize rating and trust filters
                                        this.initializeRatingAndTrustFilters();
                                        break;
                                    }
                                }

                                for (let facet in res.facets) {
                                    if (facet == this.item_manufacturer_id) {
                                        let facetEntries = res.facets[this.item_manufacturer_id].entry;
                                        for (let manufacturerEntry of facetEntries) {
                                            this.manufacturerIdCountMap.set(manufacturerEntry.label, manufacturerEntry.count);
                                        }
                                        //getting the manufacturer ids list
                                        let manufacturerIds = Array.from(this.manufacturerIdCountMap.keys());
                                        this.getCompanyNameFromIds(manufacturerIds).then((res1) => {
                                            // set company results
                                            this.companyResults = res1.result;
                                            this.handleCompanyFacets(res1, 'manufacturer.', this.manufacturerIdCountMap);
                                            //this.cat_loading = false;
                                            this.callback = true;
                                            this.searchCallStatus.callback('Search done.', true);

                                            this.searchResults = res.result;
                                            this.size = res.totalElements;
                                            this.page = p;
                                            this.start = this.page * this.rows - this.rows + 1;
                                            this.end = this.start + res.result.length - 1;
                                            this.displayShoppingCartMessages()
                                        }).catch((error) => {
                                            this.searchCallStatus.error('Error while creating Vendor filters in the search.', error);
                                        });
                                        break;
                                    }
                                }

                            }).catch(error => {
                                this.searchCallStatus.error('Error while running search.', error);
                            });
                            this.fetchProductImages(res.result);
                        }

                    })
                    .catch(error => {
                        this.searchCallStatus.error('Error while running search.', error);
                    });
            })
            .catch(error => {
                this.searchCallStatus.error('Error while running search.', error);
            });
    }

    private getCompCall(q: string, fq: any, p: number, sort: string, sTop: string) {
        this.cat_loading = true;
        if (q == '*') {
            this.model.q = '';
        } else {
            this.model.q = q;
        }
        this.objToSubmit.q = q;
        this.facetQuery = fq;
        this.page = p;
        this.sort = sort;
        if (this.model.q == '' && this.sort == 'score desc') {
            sort = 'lowercaseLegalName asc';
        }
        this.searchTopic = sTop;
        this.searchCallStatus.submit();
        this.simpleSearchService.getCompFields()
            .then(res => {
                let fieldLabels: string[] = this.getFieldNames(res);
                this.simpleSearchService.getComp(q, Object.keys(fieldLabels), fq, p, this.rows, sort, this.searchIndex, this.pageRef)
                    .then(res => {
                        if (res.result.length == 0) {
                            this.cat_loading = false;
                            this.callback = true;
                            this.searchCallStatus.callback('Company search done.', true);
                            this.searchResults = res.result;
                            this.companyResults = [];
                            this.size = res.totalElements;
                            this.page = p;
                            this.start = this.page * this.rows - this.rows + 1;
                            this.end = this.start + res.result.length - 1;
                        } else {
                            this.simpleSearchService.getUblAndQuantityProperties(Object.keys(fieldLabels)).then(response => {
                                this.facetList = [];
                                this.handleFacets(fieldLabels, res.facets, response.result);
                                this.callback = true;
                                // initialize rating and trust filters
                                this.initializeRatingAndTrustFilters();
                                this.searchCallStatus.callback('Company search done.', true);

                                this.searchResults = copy(res.result);
                                this.size = res.totalElements;
                                this.page = p;
                                this.start = this.page * this.rows - this.rows + 1;
                                this.end = this.start + res.result.length - 1;
                                // set company results
                                for (let facet in res.facets) {
                                    if (facet == this.product_vendor_id) {
                                        let facetEntries = res.facets[this.product_vendor_id].entry;
                                        let companyIds = [];
                                        for (let manufacturerEntry of facetEntries) {
                                            companyIds.push(manufacturerEntry.label)
                                        }
                                        this.getCompanyNameFromIds(companyIds).then((res1) => {
                                            this.companyResults = res1.result;
                                        }).catch((error) => {
                                            this.searchCallStatus.error('Error while getting company names in the search.', error);
                                        });
                                        break;
                                    }
                                }
                            }).catch(error => {
                                this.searchCallStatus.error('Error while running company search.', error);
                            })
                        }

                    })
                    .catch(error => {
                        this.searchCallStatus.error('Error while running company search.', error);
                    });
            })
            .catch(error => {
                this.searchCallStatus.error('Error while running company search.', error);
            });
    }

    /**
     * Fetches images for the given product search results
     * */
    fetchProductImages(searchResults: any[]): void {
        // fetch images asynchronously
        this.productImageMap = {};

        let imageMap: any = {};
        for (let result of searchResults) {
            let productImages: string[] = result[this.product_img];
            if (productImages != null && productImages.length > 0) {
                imageMap[result.uri] = productImages[0];
            }
        }

        let imageUris: string[] = [];
        for (let productUri in imageMap) {
            imageUris.push(imageMap[productUri]);
        }
        if (imageUris.length > 0) {
            this.catalogueService.getBinaryObjects(imageUris).then(images => {
                for (let image of images) {
                    for (let productUri in imageMap) {
                        if (imageMap[productUri] == image.uri) {
                            this.productImageMap[productUri] = 'data:' + image.mimeCode + ';base64,' + image.value
                        }
                    }
                }
            }, () => {
            });
        }
    }

    /**
     * Creates the company facets for the product search
     * */
    handleCompanyFacets(res, prefix: string, manufacturerIdCountMap: any) {
        // map for keeping the value counts for each company facet
        // the facet name is the key of the map
        // The value of the map is another map which store the counts for each facet value
        let companyFacetMap = new Map();
        // get available facets
        let companyFacets = this.party_facet_field_list.map(value => value.replace('{LANG}_', (DEFAULT_LANGUAGE() + '_')).replace('{NULL}_', '_'));
        // initialize the companyFacetMap
        companyFacets.forEach(filter => companyFacetMap.set(filter, new Map()));
        // for each result in the response, populate the companyFacetMap
        for (let i = 0; i < res.result.length; i++) {
            let manufacturerId = res.result[i].id;
            // check the response for each facet
            for (let facet of companyFacets) {
                let values = res.result[i][facet];
                // if the facet has an underscore, it means that its value is a Label object
                // therefore, we need to call selectNameFromLabelObject method to retrieve its values properly
                let underscoreIndex = facet.indexOf('_');
                if (underscoreIndex != -1) {
                    let resultFieldForFacet = facet.substring(underscoreIndex + 1);
                    let labels = res.result[i][resultFieldForFacet];
                    values = selectNameFromLabelObject(labels);
                    // append the language id to value for brand names
                    if (facet.endsWith('_brandName') && labels) {
                        let keys = Object.keys(labels);
                        for (let key of keys) {
                            if (labels[key] == values) {
                                values = key + '@' + values;
                            }
                        }
                    }
                }
                // if the facet values are not an array, make it an array
                if (!Array.isArray(values)) {
                    values = [values];
                }

                for (let fieldValue of values) {
                    // we store the values as string to make comparision easier
                    if (typeof fieldValue == 'number') {
                        fieldValue = fieldValue.toString();
                    }
                    if (companyFacetMap.get(facet).has(fieldValue)) {
                        companyFacetMap.get(facet).set(fieldValue, companyFacetMap.get(facet).get(fieldValue) + manufacturerIdCountMap.get(manufacturerId))
                    } else {
                        companyFacetMap.get(facet).set(fieldValue, manufacturerIdCountMap.get(manufacturerId));
                    }
                }

            }
        }

        let inFacetQuery = false;
        let facetQueries = this.facetQuery.map(facet => facet.split(':')[0]);
        // create a facet obj for brand name
        // need to handle it separately since the facet may not be available due to the values coming from different languages
        if (this.party_facet_field_list.indexOf('{LANG}_brandName') != -1) {
            let total = 0;
            let selected = false;
            let genName = 'manufacturer.brandName';
            let name = 'manufacturer.' + DEFAULT_LANGUAGE() + '_brandName';
            let brandNameMap = companyFacetMap.get(DEFAULT_LANGUAGE() + '_brandName');
            let options: FacetOption[] = [];
            brandNameMap.forEach((count, brandName) => {
                if (brandName != '') {
                    let delimiterIndex = brandName.indexOf('@');
                    let languageId = brandName.substring(0, delimiterIndex);
                    brandName = brandName.substring(delimiterIndex + 1);
                    total += count;
                    let name = 'manufacturer.' + languageId + '_brandName';
                    let isValueSelected = false;
                    if (this.isFacetValueSelected(name, brandName)) {
                        selected = true;
                        isValueSelected = true;
                    }
                    let fq = 'manufacturer.' + languageId + '_brandName';
                    if (facetQueries.indexOf(fq) != -1) {
                        inFacetQuery = true;
                    }
                    options.push(new FacetOption({
                        'name': brandName,
                        'realName': brandName,
                        'count': count,
                        'languageId': languageId,
                        "selected": isValueSelected
                    }));
                }
            });
            if (total == 0) {
                total = 1;
            }
            this.facetList.push(new Facet({
                'name': name,
                'genName': genName,
                'realName': this.getName(genName, this.product_vendor),
                'options': options,
                'showContent': !this.collapsiblePropertyFacets || inFacetQuery,
                'total': total,
                'selected': selected,
                'expanded': false
            }));

            this.sortFacetObj(this.facetList[this.facetList.length - 1]);
        }
        for (let facet in res.facets) {
            if (this.simpleSearchService.isFieldDisplayed(facet, prefix)) {
                let facet_innerLabel;
                let facet_innerCount;
                let facetCount = 0;

                let name = prefix + res.facets[facet].fieldName;

                let genName = name;
                if (genName.indexOf(DEFAULT_LANGUAGE() + '_') != -1) {
                    genName = genName.replace(DEFAULT_LANGUAGE() + '_', '');
                } else if (genName.indexOf('{NULL}_') != -1) {
                    genName = genName.replace('{NULL}_', '');
                } else if (genName.indexOf(prefix + '_') == 0) {
                    genName = genName.replace('_', '');
                }

                let total = 0;
                let selected = false;

                // skip brand name facet, we handle it separately
                if (genName == 'manufacturer.brandName') {
                    continue;
                }
                //creating options[]
                let options: FacetOption[] = [];

                for (let facet_inner of res.facets[facet].entry) {
                    facet_innerLabel = facet_inner.label;
                    facet_innerCount = facet_inner.count;
                    // get the count of values for the facet using companyFacetMap
                    if (companyFacetMap.has(facet)) {
                        facetCount = companyFacetMap.get(facet).get(facet_innerLabel);
                    }

                    if (facet_innerLabel != '' && facet_innerLabel != ':' && facet_innerLabel != ' ' && facet_innerLabel.indexOf('urn:oasis:names:specification:ubl:schema:xsd') == -1) {
                        total += facetCount;
                        let isValueSelected = false;
                        if (this.isFacetValueSelected(name, facet_inner.label)) {
                            selected = true;
                            isValueSelected = true;
                        }
                        options.push(new FacetOption({
                            'name': facet_inner.label,
                            'realName': facet.endsWith("activitySectors") ? this.translate.instant(facet_innerLabel) : facet_innerLabel, // use the translation of activity sector
                            'count': facetCount,
                            'selected': isValueSelected
                        }));
                    }
                }

                if (total == 0) {
                    total = 1;
                }
                this.facetList.push(new Facet({
                    'name': name,
                    'genName': genName,
                    'realName': this.getName(genName, this.product_vendor),
                    'options': options,
                    'showContent': !this.collapsiblePropertyFacets || facetQueries.indexOf(name) != -1,
                    'total': total,
                    'selected': selected,
                    'expanded': false
                }));
                this.sortFacetObj(this.facetList[this.facetList.length - 1]);
            }
        }
        // create filters
        this.createFilters();
    }

    onFacetClicked(facet: any) {
        if (this.collapsiblePropertyFacets) {
            facet.showContent = !facet.showContent;
        }
    }

    handleFacets(facetMetadata: any[], facets: any, allProperties) {
        this.ublProperties = [];
        let quantityPropertiesLocalNameMap = new Map();
        // populate ublProperties and quantityPropertiesLocalNameMap
        for (let property of allProperties) {
            // ubl properties
            if (property.nameSpace == 'http://www.nimble-project.org/resource/ubl#') {
                this.ublProperties.push(property);
            }
            // quantity properties
            else {
                property.itemFieldNames.forEach(itemField => quantityPropertiesLocalNameMap.set(itemField, property.localName));
            }
        }

        this.facetList = [];
        let index = 0;
        let facetQueries = this.facetQuery.map(facet => facet.split(':')[0]);
        for (let facet in facets) {
            if (this.simpleSearchService.isFieldDisplayed(facet, '', facetMetadata[facet])) {
                let genName = facet;
                if (genName.indexOf(DEFAULT_LANGUAGE() + '_') != -1) {
                    genName = genName.replace(DEFAULT_LANGUAGE() + '_', '');
                } else if (genName.indexOf('{NULL}_') != -1) {
                    genName = genName.replace('{NULL}_', '');
                } else if (genName.indexOf('_') == 0) {
                    genName = genName.replace('_', '');
                }
                let propertyLabel;
                if (this.checkCompMainCat(genName)) {
                    propertyLabel = this.getName(genName, this.product_vendor);
                } else {
                    propertyLabel = this.getName(genName);
                }

                // facet's translated label
                const facetTranslatedLabel: string =
                    (facetMetadata[facet] != null && facetMetadata[facet].label != null) ? selectNameFromLabelObject(facetMetadata[facet].label) : propertyLabel;

                // flag to show facet's content
                const showContent: boolean = !this.collapsiblePropertyFacets || facetQueries.indexOf(facet) !== -1;

                // we need to check decimal values separately since they might be the value of a quantity property
                if (facet.endsWith('_dvalues')) {
                    let fieldName = facet.substring(0, facet.length - 8);
                    // if we have this field in quantityPropertiesLocalNameMap, then it's a quantity
                    // otherwise, it's a simple number property
                    if (quantityPropertiesLocalNameMap.has(fieldName)) {
                        // quantity property
                        let localName = quantityPropertiesLocalNameMap.get(fieldName);
                        // get corresponding facet
                        let facetObj = this.facetList.find(f => f.localName === localName);
                        // quantity unit
                        let unit = fieldName.substring(fieldName.lastIndexOf(localName) + localName.length).toLocaleLowerCase();
                        // we have already created a facet for this property
                        if (facetObj) {
                            facetObj.units.push(unit);
                            this.setFacetValues(facets, facetObj, facet, unit, facetMetadata,genName);
                        }
                        // create a facet for this quantity property
                        else {
                            this.createNewFacetObject(facet, genName, facetTranslatedLabel, unit, showContent, localName, facets, facetMetadata);
                        }
                    } else {
                        continue;
                    }
                }
                // handle packaging amount and base quantity amount
                else if(facet.endsWith("package") || facet.endsWith("baseQuantity")){
                    let isPackageFacet = facet.endsWith("package");
                    // translation key for the facet name
                    let translationKey = null;
                    // local name of facet
                    let localName = null;
                    if(isPackageFacet){
                        translationKey = "Packaging";
                        localName = "package";
                    } else{
                        translationKey = "Base Quantity";
                        localName = "baseQuantity";
                    }

                    // get the unit for the packaging amount
                    let packagingUnitFacet = facets[facet+"Unit"];
                    // get corresponding facet
                    let facetObj = this.facetList.find(f => f.localName === localName);
                    // quantity unit
                    let unit = packagingUnitFacet.entry[0].label;
                    // we have already created a facet for this property
                    if (facetObj) {
                        facetObj.units.push(unit);
                        this.setFacetValues(facets, facetObj, facet, unit, facetMetadata,genName);
                    }
                    // create a facet for this quantity property
                    else {
                        this.createNewFacetObject(facet, genName, this.translate.instant(translationKey), unit, showContent, localName, facets, facetMetadata);
                    }
                }
                else {
                    this.createNewFacetObject(facet, genName, facetTranslatedLabel, null, showContent, null, facets, facetMetadata);
                }
            }
        }
        // create filters
        this.createFilters();
    }

    private createNewFacetObject(facet: string, genName: string, facetTranslatedLabel: string, unit: string, showContent: boolean, localName: string,
                                 facets: any, facetMetadata: any[]): void {
        const facetObj: Facet = new Facet({
            'name': facet,
            'genName': genName,
            'realName': facetTranslatedLabel,
            'options': [],
            'units': unit !== null ? [unit] : null, // available units for this quantity properties
            'selectedUnit': unit, // selected unit in the facet
            'total': 0,
            'showContent': showContent,
            'selected': false,
            'expanded': false,
            'localName': localName,
            'dataType': facetMetadata[facet] ? facetMetadata[facet].dataType : null
        });
        this.facetList.push(facetObj);

        this.setFacetValues(facets, facetObj, facet, unit, facetMetadata,genName);
    }

    /**
     * Updates an existing facet object with values from a new facet having the same local name. This is valid for facets representing
     * same property with different units.
     * @param facets
     * @param facetObj
     * @param facet
     * @param unit
     * @param facetMetadata
     * @param unitGenName
     */
    private setFacetValues(facets: any, facetObj: any, facet: string, unit: string, facetMetadata: any[], unitGenName:string): void {
        for (let facet_inner of facets[facet].entry) {
            let displayedFacetValue = this.getDisplayedFacetValue(facet_inner.label, facets, facet, facetMetadata, unit);
            if (!displayedFacetValue) {
                continue;
            }
            let facet_innerCount = facet_inner.count;

            if (displayedFacetValue !== '' && displayedFacetValue !== ':' && displayedFacetValue !== ' ' && displayedFacetValue.indexOf('urn:oasis:names:specification:ubl:schema:xsd') === -1) {
                facetObj.total += facet_innerCount;
                let isValueSelected = false;
                if (this.isFacetValueSelected(unitGenName ? unitGenName :facetObj.name, facet_inner.label)) {
                    facetObj.selected = true;
                    isValueSelected = true;
                }
                facetObj.options.push(new FacetOption({
                    'name': facet_inner.label, // the label with the language id, if there is any
                    'realName': displayedFacetValue, // the displayed label
                    'count': facet_innerCount,
                    'unit': unit, // unit
                    'selected': isValueSelected,
                    "unitGenName": unit ? unitGenName : null // solr index field name for the option
                }));
            }
        }
        this.sortFacetObj(facetObj);
    }

    /**
     * Normalizes the facet value considering the most relevant language
     * @param facet_innerLabel
     * @param facetMetadata
     * @param facet
     */
    private getDisplayedFacetValue(facet_innerLabel: string, facets: any, facet: string, facetMetadata: any[], unit): string {
        const lang = this.getMostRelevantLang(facets, facet);
        if (lang) {
            let idx = facet_innerLabel.lastIndexOf('@' + lang);
            if (idx !== -1) {
                facet_innerLabel = facet_innerLabel.substring(0, idx);
                return facet_innerLabel;
            } else {
                return null;
            }
        }

        // remove '.0' parts of numerical facets
        if (facetMetadata[facet] != null && facetMetadata[facet].dataType === 'double' && facet_innerLabel.endsWith('.0')) {
            facet_innerLabel = facet_innerLabel.substring(0, facet_innerLabel.length - 2)
        }

        if (unit) {
            return facet_innerLabel + ' ' + unit;
        }

        // special check for activity sector labels
        if (facet.endsWith('activitySectors')) {
            return this.translate.instant(facet_innerLabel) // return translated activity sector
        }

        return facet_innerLabel;
    }

    /**
     * Checks whether the facet has a value annotated with the current language, english or any other language respectively.
     * Returns the index of that label among the facet values
     * @param facets
     * @param facet
     */
    private getMostRelevantLang(facets, facet: string): string {
        // current language
        let labelExists: boolean = facets[facet].entry.some(facetInner => {
            const idx = facetInner.label.lastIndexOf('@' + DEFAULT_LANGUAGE());
            return (idx !== -1 && idx + 3 === facetInner.label.length);
        });
        if (labelExists) {
            return DEFAULT_LANGUAGE();
        }

        // english
        labelExists = facets[facet].entry.some(facetInner => {
            const idx = facetInner.label.lastIndexOf('@en');
            return (idx !== -1 && idx + 3 === facetInner.label.length);
        });
        if (labelExists) {
            return 'en';
        }

        // any other language
        const label: any = facets[facet].entry.find(facetInner => {
            const idx = facetInner.label.lastIndexOf('@');
            return (idx !== -1 && idx + 3 === facetInner.label.length);
        });
        if (label) {
            return label.label.substring(label.label.lastIndexOf('@') + 1);
        }

        return null;
    }

    private sortFacetObj(facetObj: Facet) {
        facetObj.options.sort(function (a, b) {
            const a_c = a.realName;
            const b_c = b.realName;
            return a_c.localeCompare(b_c);
        });

        this.facetList.sort(function (a, b) {
            const a_c = a.realName;
            const b_c = b.realName;
            return a_c.localeCompare(b_c);
        });
        this.facetList.sort(function (a, b) {
            let ret = 0;
            if (a.selected && !b.selected) {
                ret = -1;
            } else if (!a.selected && b.selected) {
                ret = 1;
            }
            return ret;
        });
    }

    private changeTaxonomyId(taxonomyId) {
        if (this.taxonomy != taxonomyId) {
            this.taxonomy = taxonomyId;
            this.buildCatTree();
        }
    }

    private getFieldNames(fields: any[]): any {
        let fieldLabes = {};
        for (let field of fields) {
            fieldLabes[field.fieldName] = {};
            fieldLabes[field.fieldName].label = field.label;
            fieldLabes[field.fieldName].dataType = field.dataType;
        }
        return fieldLabes;
    }

    // we need idx fields only for the double properties
    getIdxFields(fields: any[]): string[] {
        let idxFields = [];
        for (let field of fields) {
            if (field.dynamicBase == '*_dvalues') {
                idxFields.push(field.dynamicPart);
            }
        }
        return idxFields;
    }

    onSubmit(selectedItemEvent = null) {
        // selectedItemEvent is the event emitted when a product/company is selected from the suggestion list
        if (selectedItemEvent) {
            this.model.q = selectedItemEvent.item;
        }
        // for the category search, set the selected category if possible
        if (this.searchIndex === 'Category') {
            // find the suggested category for the search term
            let suggestion = this.categorySuggestions.filter(suggestion => suggestion.label === this.model.q);
            // set the selected category if there is a suggested category for the search term
            // and there is only one category with this label
            if (suggestion.length > 0 && suggestion[0].uris.length == 1 && suggestion[0].label.localeCompare(this.model.q) == 0) {
                this.objToSubmit = copy(this.model);
                this.setCat(this.model.q, suggestion[0].uris[0], false, null);
                return;
            }
        }
        if (this.model.q == '') {
            this.model.q = '*';
        }
        this.objToSubmit = copy(this.model);
        this.page = 1;
        this.get(this.objToSubmit);
    }

    onSearchResultClicked(event): void {
        // if the page reference is publish, we don't let users navigating to product details
        // if the page reference is catalogue, we do not let users navigating to the company details
        if (this.pageRef === 'publish' || this.pageRef === 'network' || this.pageRef === 'offering' || this.pageRef === 'catalogue' || this.pageRef === 'subscription') {
            event.preventDefault();
        }
    }

    getName(name: string, prefix?: string) {
        // if it is a ubl property, then get its label from the ublProperties
        let prefName = name;
        if (prefix) {
            prefName = prefix + '.' + name;
        }
        for (let ublProperty of this.ublProperties) {
            if (prefName == ublProperty.localName || name == ublProperty.localName) {
                return selectNameFromLabelObject(ublProperty.label);
            }
        }
        // otherwise, use product_filter_mappings
        let ret = prefName;
        if (this.product_filter_mappings[prefName]) {
            ret = this.product_filter_mappings[prefName];
        } else if (this.product_filter_mappings[name]) {
            ret = this.product_filter_mappings[name];
        } else{
            ret = this.translate.instant(prefName);
        }
        return ret;
    }

    checkPriceFilter() {
        let check = false;
        if (this.selectedCurrency && (this.selectedPriceMin || this.selectedPriceMax)) {
            check = !(this.selectedPriceMin && this.selectedPriceMax && this.selectedPriceMin > this.selectedPriceMax);
        }
        return check;
    }

    checkDeliveryTimeFilter() {
        let check = false;
        if (this.selectedDeliveryTimeUnit && (this.selectedDeliveryTimeMin || this.selectedDeliveryTimeMax)) {
            check = !(this.selectedDeliveryTimeMin && this.selectedDeliveryTimeMax && this.selectedDeliveryTimeMin > this.selectedDeliveryTimeMax);
        }
        return check;
    }

    checkTrustFilter() {
        let check = false;
        if (this.ratingTrustFilters.filter(filter => filter.rating > 0).length > 0) {
            check = true;
        }
        return check;
    }

    checkPriceFacet() {
        let found = false;
        for (let i = 0; i < this.facetQuery.length; i++) {
            const comp = this.facetQuery[i].split(':')[0];
            if (comp.localeCompare(this.lowerFirstLetter(this.selectedCurrency) + '_' + this.product_price) == 0) {
                found = true;
            }
        }
        return found;
    }

    checkTrustFacet() {
        let found = false;
        for (let i = 0; i < this.facetQuery.length; i++) {
            const comp = this.facetQuery[i].split(':')[0];
            if (comp.localeCompare(this.product_vendor + '.' + this.product_vendor_rating) == 0 || comp.localeCompare(this.product_vendor + '.' + this.product_vendor_rating_seller) == 0 || comp.localeCompare(this.product_vendor + '.' + this.product_vendor_rating_fulfillment) == 0 || comp.localeCompare(this.product_vendor + '.' + this.product_vendor_rating_delivery) == 0 || comp.localeCompare(this.product_vendor + '.' + this.product_vendor_trust) == 0) {
                found = true;
            }
        }
        return found;
    }

    checkCompTrustFacet() {
        let found = false;
        for (let i = 0; i < this.facetQuery.length; i++) {
            const comp = this.facetQuery[i].split(':')[0];
            if (comp.localeCompare(this.product_vendor_rating) == 0 || comp.localeCompare(this.product_vendor_rating_seller) == 0 || comp.localeCompare(this.product_vendor_rating_fulfillment) == 0 || comp.localeCompare(this.product_vendor_rating_delivery) == 0 || comp.localeCompare(this.product_vendor_trust) == 0) {
                found = true;
            }
        }
        return found;
    }

    setPriceFilter() {
        // use default (0 for min price, Number.MAX_SAFE_INTEGER for max price) min/max prices in case no min/max prices are specified
        let priceMin = this.selectedPriceMin ? this.selectedPriceMin : 0;
        let priceMax = this.selectedPriceMax ? this.selectedPriceMax : Number.MAX_SAFE_INTEGER;
        this.clearFacet(this.lowerFirstLetter(this.selectedCurrency) + '_' + this.product_price);
        this.setRangeWithoutQuery(this.lowerFirstLetter(this.selectedCurrency) + '_' + this.product_price, priceMin, priceMax);
        this.get(this.objToSubmit);
    }

    setDeliveryTimeFilter() {
        let deliveryTimeMin = this.selectedDeliveryTimeMin ? this.selectedDeliveryTimeMin : 0;
        let deliveryTimeMax = this.selectedDeliveryTimeMax ? this.selectedDeliveryTimeMax : Number.MAX_SAFE_INTEGER;
        this.clearFacet(this.camelize(this.selectedDeliveryTimeUnit) + '_' + this.product_delivery_time);
        this.setRangeWithoutQuery(this.camelize(this.selectedDeliveryTimeUnit) + '_' + this.product_delivery_time, deliveryTimeMin, deliveryTimeMax);
        this.get(this.objToSubmit);
    }

    setTrustFilter() {
        this.clearFacet(this.product_vendor_rating, this.product_vendor);
        this.clearFacet(this.product_vendor_rating_seller, this.product_vendor);
        this.clearFacet(this.product_vendor_rating_fulfillment, this.product_vendor);
        this.clearFacet(this.product_vendor_rating_delivery, this.product_vendor);
        this.clearFacet(this.product_vendor_trust, this.product_vendor);

        this.ratingTrustFilters.forEach(filter => {
            if (filter.rating > 0) {
                let max = 5;
                let rating = filter.rating;
                if (filter.name === this.product_vendor_trust) {
                    rating = (filter.rating / 5);
                    max = 1;
                }
                this.setRangeWithoutQuery(filter.name, rating, max, this.product_vendor);
            }
        });
        this.get(this.objToSubmit);
    }

    setCompTrustFilter() {
        this.clearFacet(this.product_vendor_rating);
        this.clearFacet(this.product_vendor_rating_seller);
        this.clearFacet(this.product_vendor_rating_fulfillment);
        this.clearFacet(this.product_vendor_rating_delivery);
        this.clearFacet(this.product_vendor_trust);
        this.ratingTrustFilters.forEach(filter => {
            if (filter.rating > 0) {
                let max = 5;
                let rating = filter.rating;
                if (filter.name === this.product_vendor_trust) {
                    rating = (filter.rating / 5);
                    max = 1;
                }
                this.setRangeWithoutQuery(filter.name, rating, max);
            }
        });
        this.get(this.objToSubmit);
    }

    resetPriceFilter() {
        this.selectedCurrency = myGlobals.config.standardCurrency;
        this.selectedPriceMin = null;
        this.selectedPriceMax = null;
        this.clearFacet(this.lowerFirstLetter(this.selectedCurrency) + '_' + this.product_price);
        this.get(this.objToSubmit);
    }

    resetDeliveryTimeFilter() {
        this.selectedDeliveryTimeUnit = null;
        this.selectedDeliveryTimeMin = null;
        this.selectedDeliveryTimeMax = null;
        this.clearFacet(this.camelize(this.selectedDeliveryTimeUnit) + '_' + this.product_delivery_time);
        this.get(this.objToSubmit);
    }

    resetTrustFilter() {
        this.ratingTrustFilters.forEach(filter => filter.rating = 0);
        if (this.checkTrustFacet()) {
            this.clearFacet(this.product_vendor_rating, this.product_vendor);
            this.clearFacet(this.product_vendor_rating_seller, this.product_vendor);
            this.clearFacet(this.product_vendor_rating_fulfillment, this.product_vendor);
            this.clearFacet(this.product_vendor_rating_delivery, this.product_vendor);
            this.clearFacet(this.product_vendor_trust, this.product_vendor);
            this.get(this.objToSubmit);
        }
    }

    resetCompTrustFilter() {
        this.ratingTrustFilters.forEach(filter => filter.rating = 0);
        this.clearFacet(this.product_vendor_rating);
        this.clearFacet(this.product_vendor_rating_seller);
        this.clearFacet(this.product_vendor_rating_fulfillment);
        this.clearFacet(this.product_vendor_rating_delivery);
        this.clearFacet(this.product_vendor_trust);
        this.get(this.objToSubmit);
    }

    checkProdCat(categoryName: string) {
        let found = false;
        if (this.productServiceFiltersEnabled) {
            if (this.product_filter_prod.indexOf(categoryName) != -1) {
                found = true;
            }
        } else {
            for (let nonFilter of this.product_nonfilter_regex) {
                if (categoryName.search(nonFilter) != -1) {
                    return false;
                }
            }
            return this.product_filter_prod.indexOf(categoryName) == -1 && !this.checkCompCat(name) && !this.checkTrustCat(name);
        }
        return found;
    }

    checkProdCatCount() {
        // if product/service filters are enabled, we have the price filter by default
        let count = this.productServiceFiltersEnabled ? 1 : 0;
        if (this.facetList) {
            for (let i = 0; i < this.facetList.length; i++) {
                if (this.checkProdCat(this.facetList[i].name)) {
                    count++;
                }
            }
        }
        return count;
    }

    checkCompCat(categoryName: string) {
        let found = false;
        if (this.product_filter_comp.indexOf(categoryName) != -1) {
            found = true;
        }
        return found;
    }

    checkCompCatCount() {
        let count = 0;
        if (this.facetList) {
            for (let i = 0; i < this.facetList.length; i++) {
                if (this.checkCompCat(this.facetList[i].genName)) {
                    count++;
                }
            }
        }
        return count;
    }

    checkTrustCat(name: string) {
        let found = false;
        if (this.product_filter_trust.indexOf(name) != -1) {
            found = true;
        }
        return found;
    }

    checkOtherCat(name: string) {
        for (let nonFilter of this.product_nonfilter_regex) {
            if (name.search(nonFilter) != -1) {
                return false;
            }
        }
        return (!this.checkProdCat(name) && !this.checkCompCat(name) && !this.checkTrustCat(name));
    }

    checkOtherCatCount() {
        if (!this.productServiceFiltersEnabled) {
            return 0;
        }
        let count = 0;
        if (this.facetList) {
            for (let i = 0; i < this.facetList.length; i++) {
                if (this.checkOtherCat(this.facetList[i].name)) {
                    count++;
                }
            }
        }
        return count;
    }

    checkCompMainCat(name: string) {
        let found = false;
        if (this.party_filter_main.indexOf(name) != -1) {
            found = true;
        }
        return found;
    }

    checkCompTrustCat(name: string) {
        let found = false;
        if (this.party_filter_trust.indexOf(name) != -1) {
            found = true;
        }
        return found;
    }

    checkCompTrustCatCount() {
        let count = 0;
        if (this.facetList) {
            for (let i = 0; i < this.facetList.length; i++) {
                if (this.checkCompTrustCat(this.facetList[i].name)) {
                    count++;
                }
            }
        }
        return count;
    }

    isFacetSelectable(fieldQuery: string): boolean {
        // eliminate the field queries that are used to filter results when the 'Others' entry is selected in the category panel
        return !fieldQuery.startsWith(`-${this.product_cat_mix}`);

    }

    clearFacet(outer: string, prefix?: string) {
        if (prefix) {
            outer = prefix + '.' + outer;
        }
        let idx = -1;
        for (let i = 0; i < this.facetQuery.length; i++) {
            const comp = this.facetQuery[i].split(':')[0];
            if (comp.localeCompare(outer) == 0) {
                idx = i;
            }
        }
        if (idx >= 0) {
            this.facetQuery.splice(idx, 1);
        }
    }

    getFacetName(facet: string): string {
        for (let i = 0; i < this.facetList.length; i++) {
            const comp = this.facetList[i].name;
            // check the facet name
            if (comp.localeCompare(facet) == 0) {
                return this.getName(this.facetList[i].realName);
            }
            // check the facet option names
            else if(this.facetList[i].units){
                for(let option of this.facetList[i].options){
                    if (option.unitGenName.localeCompare(facet) == 0) {
                        return this.getName(this.facetList[i].realName);
                    }
                }
            }
        }
        return this.getName(facet);
    }

    getFacetQueryName(facet: string): string {
        let name = facet.split(':')[0];
        let containsLanguageId = false;
        // check whether the facet contains any language id
        for (let languageId of this.config.languageSettings.available) {
            if (name.indexOf(languageId + '_') != -1) {
                name = name.replace(languageId + '_', '');
                containsLanguageId = true;
            }
        }
        if (!containsLanguageId) {
            if (name.indexOf('{NULL}_') != -1) {
                name = name.replace('{NULL}_', '');
            } else if (name.indexOf('_') == 0) {
                name = name.replace('_', '');
            } else if (name.indexOf('._') != -1) {
                name = name.replace('._', '.');
            }
        }
        name = this.getFacetName(name);
        return name;
    }

    getFacetQueryValue(facet: string): string {
        let facetNameValue = facet.split(':');
        let facetName = facetNameValue[0];
        let value = facetNameValue[1];
        // handle the facets with quantity type
        if(facetName.endsWith("_dvalues")){
            let facetDetails = this.facetList.find(f => facetName.startsWith(f.localName))
            return facetDetails.options.find(option => option.unitGenName === facetName).realName;
        }
        if(facetName.endsWith("package") || facetName.endsWith("baseQuantity")){
            let facetDetails = this.facetList.find(f => facetName.endsWith(f.localName))
            return facetDetails.options.find(option => option.unitGenName === facetName).realName;
        }
        value = value.split('@')[0];
        value = value.replace(/"/g, '');
        // use the translation of activity sector
        if(facetName.endsWith("activitySectors")){
             return this.translate.instant(value);
        }
        return value;
    }

    clearFacetQuery(facet: string) {
        this.facetQuery.splice(this.facetQuery.indexOf(facet), 1);
        this.get(this.objToSubmit);
    }

    setFacet(outer: string, inner: string, genName: string, languageId?: string) {
        let fq = outer + ':"' + inner + '"';
        // handle brand name facet separately since it can contain values for different languages
        if (genName == 'manufacturer.brandName') {
            fq = 'manufacturer.' + languageId + '_brandName:"' + inner + '"';
        }
        if (this.facetQuery.indexOf(fq) == -1) {
            this.facetQuery.push(fq);
        } else {
            this.facetQuery.splice(this.facetQuery.indexOf(fq), 1);
        }
        this.get(this.objToSubmit);
    }

    setRangeWithoutQuery(outer: string, min: number, max: number, prefix?: string) {
        if (prefix) {
            outer = prefix + '.' + outer;
        }
        const fq = outer + ':[' + min + ' TO ' + max + ']';
        this.facetQuery.push(fq);
    }

    excludingCategoryFacetQueryExists(): boolean {
        for (let facetQuery of this.facetQuery) {
            if ((<string>facetQuery).indexOf(`-${this.product_cat_mix}`) !== -1) {
                return true;
            }
        }
        return false;
    }

    /**
     * Sets the category name and category id and initiate a new search request.
     * @param name category name
     * @param id category id
     * @param excludeCategoriesAtCurrentLevel indicates that user has selected the "Other" entry in the category hierarchy.
     * This requires that the search must be performed with the parent category by excluding all the children
     * @param level the level of the selected category
     */
    setCat(name: string, id: string, excludeCategoriesAtCurrentLevel = false, level: number) {
        this.cat = name;
        this.catID = id;
        this.cat_level = level;

        if (!excludeCategoriesAtCurrentLevel) {
            // remove the category related filters
            let newFacetQueryList: any[] = [];
            for (let facetQuery of this.facetQuery) {
                if ((<string>facetQuery).indexOf(`-${this.product_cat_mix}`) === -1) {
                    newFacetQueryList.push(facetQuery);
                }
            }
            this.facetQuery = newFacetQueryList;

        } else {
            // others entry clicked and selected
            if (id !== '') {
                // child categories of the selected are excluded via the field query
                let catLevel: number = this.cat_level;
                // do not add the "Other" entry to the filter query
                for (let i = 0; i < this.cat_levels[catLevel].length - 1; i++) {
                    this.facetQuery.push(`-${this.product_cat_mix}:"${this.cat_levels[catLevel][i].id}"`);
                }

                // others entry clicked and deselected
            } else {
                // remove the category related filters
                let newFacetQueryList: any[] = [];
                for (let facetQuery of this.facetQuery) {
                    if ((<string>facetQuery).indexOf(`-${this.product_cat_mix}`) === -1) {
                        newFacetQueryList.push(facetQuery);
                    }
                }
                this.facetQuery = newFacetQueryList;
            }
        }

        this.get(this.objToSubmit);
    }

    resetFilter() {
        this.facetQuery = [];
        this.selectedCurrency = myGlobals.config.standardCurrency;
        this.selectedPriceMin = null;
        this.selectedPriceMax = null;
        this.selectedDeliveryTimeUnit = this.deliveryPeriodUnits[0];
        this.selectedDeliveryTimeMin = null;
        this.selectedDeliveryTimeMax = null;
        this.ratingTrustFilters.forEach(filter => filter.rating = 0);
        this.get(this.objToSubmit);
    }

    resetSearch() {
        this.model.q = '*';
        this.objToSubmit.q = '*';
        this.get(this.objToSubmit);
    }

    /**
     * Checks the given facet value is selected (i.e. included in the facet query)
     * @param outer corresponds to facet name
     * @param inner corresponds to facet value
     * @param languageId
     */
    isFacetValueSelected(outer: string, inner: string): boolean {
        let match = false;
        let fq = outer + ':"' + inner + '"';
        if (this.facetQuery.indexOf(fq) != -1) {
            match = true;
        }
        return match;
    }

    getCurrency(price: any): string {
        if (price[this.selectedCurrency]) {
            return this.selectedCurrency;
        }
        if (this.selectedCurrency != myGlobals.config.standardCurrency && price[myGlobals.config.standardCurrency]) {
            return myGlobals.config.standardCurrency;
        }
        if (this.selectedCurrency != 'EUR' && price['EUR']) {
            return 'EUR';
        }
        return Object.keys(price)[0];
    }

    getCurrencySort(order: any): string {
        let currency = myGlobals.config.standardCurrency;
        let currentFirstLower = currency.charAt(0).toLowerCase() + currency.slice(1);
        return (currentFirstLower + '_price ' + order);
    }

    getCategoryDisplayInfo(indexCategories: any, categoryCounts: any): any {
        let labelMap = {};
        for (let category of indexCategories.result) {
            labelMap[category.uri] = {};
            labelMap[category.uri].label = category.label;
            labelMap[category.uri].code = category.code;
            labelMap[category.uri].isRoot = category.allParents == null;
            let searchCategory: any = categoryCounts.find(categoryCount => category.uri === categoryCount.label);
            if (searchCategory) {
                labelMap[category.uri].count = searchCategory.count;
            }
        }
        return labelMap;
    }

    checkNaN(rating: any): boolean {
        let nan = false;
        if (isNaN(parseFloat(rating))) {
            nan = true;
        }
        return nan;
    }

    checkEmpty(obj: any): boolean {
        return (Object.keys(obj).length === 0);
    }

    calcRating(rating: any, multiplier: number): number {
        const result = parseFloat(rating) * multiplier;
        return Math.round(result * 10) / 10;
    }

    lowerFirstLetter(string) {
        return string.charAt(0).toLowerCase() + string.slice(1);
    }

    getCompanyNameFromIds(idList: any[]): Promise<any> {
        let facets = this.party_facet_field_list.slice();
        for (let i = 0; i < facets.length; i++) {
            facets[i] = facets[i].replace('{LANG}_', (DEFAULT_LANGUAGE() + '_'));
            facets[i] = facets[i].replace('{NULL}_', '_');
        }
        let query = '';
        let length = idList.length;
        while (length--) {
            query = query + 'id:' + idList[length];
            if (length != 0) {
                query = query + ' OR ';
            }
        }
        return this.simpleSearchService.getCompanies(query, facets, idList.length);
    }

    getProdLink(res: any): string {
        let link = '';
        if (res && res.catalogueId && res.manufactuerItemId) {
            // when the seller is navigated to the search to find a transport service for the ordered products, searchContextService is set.
            // however, since we do not clear searchContextService, need to check whether its context is valid or not and pass this info as query param to product-details page
            // to check its validity, we use this.searchContext variable which is not null iff the seller is navigated to the search page to find a transport service provider
            let isSearchContextValid = this.searchContext && this.searchContext == 'orderbp';
            link += '#/product-details?catalogueId=' + res.catalogueId + '&id=' + encodeURIComponent(res.manufactuerItemId) + '&contextValid=' + isSearchContextValid;
        }
        return link;
    }

    getCompLink(res: any): string {
        let link = '';
        if (res && res.id) {
            if (!res.isFromLocalInstance && res.nimbleInstanceName && res.nimbleInstanceName != '') {
                link += '#/user-mgmt/company-details?id=' + res.id + '&delegateId=' + res.nimbleInstanceName;
            } else {
                link += '#/user-mgmt/company-details?id=' + res.id;
            }
        }
        return link;
    }

    productSelected(productHjid): boolean {
        let i: number = this.productsSelectedForPublish.findIndex(product => product.uri === productHjid);
        return i !== -1;
    }

    onToggleProductSelectForPublish(toggledProduct: any, event): void {
        event.preventDefault();
        // set timeout is required since the default checkbox implementation prevents updating status of the checkbox
        setTimeout(() => {
            let i: number = this.productsSelectedForPublish.findIndex(product => product.uri === toggledProduct.uri);
            if (i === -1) {
                this.productsSelectedForPublish.push(toggledProduct);
            } else {
                this.onRemoveSelectedProduct(toggledProduct.uri);
            }
        });
    }

    onRemoveSelectedProduct(removedProductHjid: any): void {
        let selectedIndex: number = this.productsSelectedForPublish.findIndex(product => product.uri === removedProductHjid);
        this.productsSelectedForPublish.splice(selectedIndex, 1);
    }

    onContinuePublishing(): void {
        this.publishService.selectedProductsInSearch = this.productsSelectedForPublish.map(product => {
            return {hjid: product.uri, label: product.label};
        });
        this.router.navigate(['catalogue/publish-single'], {queryParams: {searchRef: 'true'}});
    }

    // methods for network functionality
    isCompanySelectedForNetwork(vatNumber): boolean {
        return this.networkCompanyListService.isCompanySelected(vatNumber);
    }

    onToggleCompanySelectForNetwork(toggledCompany: any, event): void {
        event.preventDefault();
        // set timeout is required since the default checkbox implementation prevents updating status of the checkbox
        setTimeout(() => {
            if (this.networkCompanyListService.isCompanySelected(toggledCompany.vatNumber)) {
                this.onRemoveSelectedCompanyFromNetwork(toggledCompany.vatNumber);
            } else {
                this.networkCompanyListService.onAddSelectedCompany(toggledCompany)
            }
        });
    }

    onRemoveSelectedCompanyFromNetwork(company: any): void {
        this.networkCompanyListService.onRemoveSelectedCompany(company);
    }

    // the end of methods for network functionality

    // methods for subscription functionality

    onToggleCompanySelectForSubscription(toggledCompany: any, event): void {
        event.preventDefault();
        // set timeout is required since the default checkbox implementation prevents updating status of the checkbox
        setTimeout(() => {
            if (this.companySubscriptionService.isCompanySelected(toggledCompany.id)) {
                this.onRemoveSelectedCompanyFromSubscriptionList(toggledCompany);
            } else {
                this.companySubscriptionService.onAddSelectedCompany(toggledCompany)
            }
        });
    }

    isCompanySelectedForSubscription(id): boolean {
        return this.companySubscriptionService.isCompanySelected(id);
    }

    onRemoveSelectedCompanyFromSubscriptionList(company: any): void {
        this.companySubscriptionService.onRemoveSelectedCompany(company.id);
    }
    // the end of methods for subscription functionality

    // methods for white list/black list functionality
    isCompanySelected(vatNumber: string): boolean {
        return this.whiteBlackListService.isCompanySelected(vatNumber);
    }

    onToggleCompanySelectForWhiteBlackList(toggledCompany: any, event): void {
        event.preventDefault();
        // set timeout is required since the default checkbox implementation prevents updating status of the checkbox
        setTimeout(() => {
            if (this.whiteBlackListService.isCompanySelected(toggledCompany.vatNumber)) {
                this.onRemoveSelectedCompany(toggledCompany.vatNumber);
            } else {
                this.whiteBlackListService.onAddSelectedCompany(toggledCompany)
            }
        });
    }

    onRemoveSelectedCompany(removedCompanyVatNumber: any): void {
        this.whiteBlackListService.onRemoveSelectedCompany(removedCompanyVatNumber);
    }

    // the end of methods for white list/black list functionality
    onNavigateToCatalogue(): void {
        this.router.navigate(['dashboard'], {queryParams: {tab: 'CATALOGUE', searchRef: 'true'}})
    }

    onNavigate(tab: "NETWORK" | "SUBSCRIPTIONS" = null) {
        if(tab === "NETWORK"){
            this.router.navigate(['/user-mgmt/company-settings'], {queryParams: {tab: 'NETWORK', searchRef: 'true'}})
        } else if(tab === "SUBSCRIPTIONS"){
            this.router.navigate(['/user-mgmt/company-settings'], {queryParams: {tab: 'SUBSCRIPTIONS', searchRef: 'true'}})
        } else {
            this.router.navigate(['/dashboard'], {queryParams: {tab: 'CATALOGUE', searchRef: 'true'}})
        }
    }

    onAddToCart(result: any, index: number, event: any): void {
        event.preventDefault();
        // check whether the item can be added to the cart
        let isProductAddable: boolean = this.shoppingCartDataService.isProductAddableToCart(result.catalogueId, result.manufactuerItemId);
        if (!isProductAddable) {
            return;
        }

        // do not add item to the cart if a process is still being added
        for (let shoppingCartCallStatus of this.shoppingCartCallStatuses) {
            if (shoppingCartCallStatus.isLoading()) {
                return;
            }
        }
        // get corresponding call status for product
        let shoppingCartCallStatus = this.getShoppingCartStatus(index);
        shoppingCartCallStatus.submit();

        this.shoppingCartDataService.addItemToCart(result.uri, 1, result.nimbleInstanceName).then(() => {
            shoppingCartCallStatus.callback(this.translate.instant('Product is added to shopping cart.'), false);
        }).catch(() => {
            shoppingCartCallStatus.error(null);
        });
    }

    getShoppingCartStatus(index: number): CallStatus {
        return this.shoppingCartCallStatuses[index % this.rows];
    }

    // display a message for the products included in the shopping cart
    displayShoppingCartMessages() {
        if (!this.isLoggedIn) {
            return;
        }

        this.shoppingCartDataService.getShoppingCart().then(shoppingCart => {
            // reset all call statuses
            for (let callStatus of this.shoppingCartCallStatuses) {
                callStatus.reset();
            }

            let size = this.searchResults.length;
            for (let i = 0; i < size; i++) {
                let result = this.searchResults[i];
                if (UBLModelUtils.isProductInCart(shoppingCart, result.catalogueId, result.manufactuerItemId)) {
                    this.getShoppingCartStatus(i).callback(this.translate.instant('Product is added to shopping cart.'), false);
                }
            }
        });
    }

    showSearchTT(content) {
        let translationKey = this.searchTopic == "prod" ? "Product Search Tooltip" : "Company Search Tooltip";
        this.tooltipHTML = this.translate.instant(translationKey);
        this.modalService.open(content);
    }

    /**
     * Returns the rating summary for the given company search result
     * */
    getRatingSummaryForCompany(result){
        let summary = this.getName(this.product_vendor_rating,this.product_vendor)+':\n'+
            this.calcRating(result[this.product_vendor_rating],1)+'/5\n\n';
        let ratingSeller = this.calcRating(result[this.product_vendor_rating_seller],1);
        let ratingFulfilment = this.calcRating(result[this.product_vendor_rating_fulfillment],1);
        let ratingDelivery = this.calcRating(result[this.product_vendor_rating_delivery],1);
        if(ratingSeller){
            summary += this.getName(this.product_vendor_rating_seller,this.product_vendor)+':\n'+ ratingSeller+'/5\n\n';
        }
        if(ratingFulfilment){
            summary += this.getName(this.product_vendor_rating_fulfillment,this.product_vendor)+':\n'+ ratingFulfilment +'/5\n\n';
        }
        if(ratingDelivery){
            summary += this.getName(this.product_vendor_rating_delivery,this.product_vendor)+':\n'+ ratingDelivery +'/5';
        }
        return summary;
    }

    /**
     * Returns the rating summary for the given product search result
     * */
    getRatingsSummaryForProduct(result){
        let summary = this.getName(this.product_vendor_rating,this.product_vendor)+':\n'+
            this.calcRating(result[this.product_vendor][this.product_vendor_rating],1)+'/5\n\n';
        let ratingSeller = this.calcRating(result[this.product_vendor][this.product_vendor_rating_seller],1);
        let ratingFulfilment = this.calcRating(result[this.product_vendor][this.product_vendor_rating_fulfillment],1);
        let ratingDelivery = this.calcRating(result[this.product_vendor][this.product_vendor_rating_delivery],1);
        if(ratingSeller){
            summary += this.getName(this.product_vendor_rating_seller,this.product_vendor)+':\n'+ ratingSeller +'/5\n\n';
        }
        if(ratingFulfilment){
            summary += this.getName(this.product_vendor_rating_fulfillment,this.product_vendor)+':\n'+ ratingFulfilment +'/5\n\n';
        }
        if(ratingDelivery){
            summary += this.getName(this.product_vendor_rating_delivery,this.product_vendor)+':\n'+ ratingDelivery +'/5';
        }
        summary += 'Total No OF Trust Evaluations' +':\n'+ this.calcRating(result[this.product_vendor][this.product_vendor_evaluation],1)+'';
        return summary;
    }

    /**
     * Creates the filters based on the product/company facets
     * It's called when the facet list is populated
     * */
    createFilters(){
        // initialize filters
        this.productFilter = new Filter();
        this.productVendorFilter = new Filter();
        this.productOtherFilter = new Filter();
        this.companyFilter = new Filter();
        this.catalogueFilter = new Filter();
        this.circularEconomyCertificatesFilter = new Filter();
        // add each facet to proper filter
        for(let facet of this.facetList){
            if(facet.total > 0){
                if (facet.name === 'catalogueId') {
                    this.catalogueFilter.facets.push(facet);
                    this.catalogueService.getCatalogueIds(facet.options.map(opt => opt.name)).then(ids => {
                        this.catalogueIds = ids;
                    });
                    if(facet.selected){
                        this.catalogueFilter.isCollapsed = false;
                    }
                    // when a company specific facet is selected and the company has only one catalogue,
                    // set selectedCatalogueUuidFromCatalogIdFilter to its catalogue id
                    if(this.isCompanySpecificFacetSelected() && facet.options && facet.options.length == 1){
                        this.selectedCatalogueUuidFromCatalogIdFilter = facet.options[0].realName;
                    }
                }
                if(!this.config.productServiceFiltersEnabled && facet.name === this.config.circularEconomy.indexField){
                    // add facet
                    this.circularEconomyCertificatesFilter.facets.push(facet);
                    // uncollapse the filter if it has selected facets
                    if(facet.selected){
                        this.circularEconomyCertificatesFilter.isCollapsed = false;
                    }
                }
                if(this.checkProdCat(facet.name)){
                    // add facet
                    this.productFilter.facets.push(facet);
                    // uncollapse the filter if it has selected facets
                    if(facet.selected){
                        this.productFilter.isCollapsed = false;
                    }
                }
                if(this.checkCompCat(facet.genName)){
                    // add facet
                    this.productVendorFilter.facets.push(facet);
                    // uncollapse the filter if it has selected facets
                    if(facet.selected){
                        this.productVendorFilter.isCollapsed = false;
                    }
                }
                if(this.checkCompMainCat(facet.genName)){
                    // add facet
                    this.companyFilter.facets.push(facet);
                    // uncollapse the filter if it has selected facets
                    if(facet.selected){
                        this.companyFilter.isCollapsed = false;
                    }
                }
                if (this.checkOtherCat(facet.name)){
                    // add facet
                    this.productOtherFilter.facets.push(facet);
                    // uncollapse the filter if it has selected facets
                    if(facet.selected){
                        this.productOtherFilter.isCollapsed = false;
                    }
                }

                // each facet displays the first "maxFacets" values and then it shows the rest if it is expanded
                // make it expanded if the selected value is not at the top "maxFacets" results
                if(facet.selected){
                    // find the last index of selected value
                    var index = facet.options.slice().reverse().findIndex(value => value.selected == true);
                    var count = facet.options.length - 1;
                    var finalIndex = index >= 0 ? count - index : index;
                    // expand the facet if required
                    if(finalIndex >= this.maxFacets){
                        facet.expanded = true;
                    }
                }
            }
        }
        // for company search, circular economy certificate facet is included in the company main filter
        // Depending on the config, we can create a separate filter for circular economy certificates
        if(this.separateFilterForCircularEconomyCertificatesInCompanySearch){
            let circularEconomyFacetIndex = this.companyFilter.facets.findIndex(facet => facet.genName === this.config.circularEconomy.indexField);
            if(circularEconomyFacetIndex !== -1){
                this.companyFilter.facets.splice(circularEconomyFacetIndex,1);
            }
        }
        // set the facets names for other filters
        // they are used in the filter search component
        if(this.productOtherFilter.facets.length){
            this.productOtherFilter.facetNames = this.productOtherFilter.facets.map(facet => facet.realName);
        }
    }

    /**
     * Changes the visibility of other filter facets.
     * @param facetNames facet names which are filtered and visible to the user
     * */
    onOtherFilterFacetsFiltered(facetNames): void {
        this.productOtherFilter.facets.forEach(facet => {
            facet.visible = facetNames.indexOf(facet.realName) !== -1 ;
        })
    }
    /**
     * Checks whether a facet identifying a specific company such brand name or legal name is selected
     */
    isCompanySpecificFacetSelected(): boolean {
        for (let fq of this.facetQuery) {
            for (let companyFacet of myGlobals.party_identifying_regex_filters) {
                const facet: string = fq;
                if (facet.search(companyFacet) === 0) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Returns the facet options for the selected unit if the facet options belong to a quantity facet.
     * Otherwise, returns the given facet options.
     * */
    getFacetOptions(options:FacetOption[],selectedUnit:string){
        if(selectedUnit !== null){
            return options.filter(option => option.unit === selectedUnit);
        }
        return options;
    }

    // methods for catalogue exchange functionality

    /**
     * Opens the modal for catalogue exchange request
     * */
    showRequestCatalogueExchangeModal(modal: any) {
        // clear the request details and reset the call status
        this.requestForCatalogExchangeDetails = null;
        this.requestForCatalogExchangeCallStatus.reset();
        // open the modal
        this.modalService.open(modal);
    }

    /**
     * Sends the request for catalogue exchange
     * */
    requestCatalogueExchange(){
        this.requestForCatalogExchangeCallStatus.submit();
        this.catalogueService.requestCatalogueExchange(this.selectedCatalogueUuidFromCatalogIdFilter,this.requestForCatalogExchangeDetails).then(() => {
            this.requestForCatalogExchangeCallStatus.callback(this.translate.instant("Requested catalogue exchange successfully"))
        }).catch(error => {
            this.requestForCatalogExchangeCallStatus.error(this.translate.instant("Failed to request catalogue exchange"),error);
        })
    }
    // end of methods for catalogue exchange functionality

    /**
     * Camelizes the given string
     * */
    camelize(str) {
        str = str.replace(new RegExp("[()]", 'g'),"")
        return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
            if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
            return index === 0 ? match.toLowerCase() : match.toUpperCase();
        });
    }

    /**
     * Navigates users to SME cluster to initiate a business opportunity for the search product.
     * We pass the search query, selected category and other filters to SME cluster.
     * */
    onInitiateBusinessOpportunity(){
        // selected category name
        let categoryName = null;
        // filter queries
        let fq = null;
        // search query
        let q = null;

        // if the search index is Name, the search query is the name of product
        if(this.searchIndex === "Name"){
            // set the selected category name
            for(let categories of this.cat_levels){
                for(let category of categories){
                    if(category.id === this.catID){
                        categoryName = encodeURIComponent(category.preferredName);
                        break;
                    }
                }
            }
            // set the search query
            if(this.model.q && this.model.q != ""){
                q = encodeURIComponent((this.model.q));
            }

        }
        // if search index is Category, the search query is the name of category
        else{
            // set the selected category name
            if(this.model.q && this.model.q != ""){
                categoryName = encodeURIComponent((this.model.q));
            }
        }
        // set the selected facet queries
        let facetQueryParam = this.facetQuery.map(fq => this.getFacetQueryName(fq) + ":" + this.getFacetQueryValue(fq));
        if(facetQueryParam.length > 0){
            fq = encodeURIComponent(facetQueryParam.join("_SEP_"));
        }
        // create the url to SME cluster
        let url = this.smeClusterCreateOpportunityEndpoint;
        if(q){
            url +=`?q=${q}`
        }
        if(fq){
            if(q){
                url +=`&fq=${fq}`
            } else{
                url +=`?fq=${fq}`
            }
        }
        if(categoryName){
            if(q || fq){
                url +=`&category=${categoryName}`
            } else{
                url +=`?category=${categoryName}`
            }
        }
        // navigate to the url
        window.open(url,'_blank')
    }
}
