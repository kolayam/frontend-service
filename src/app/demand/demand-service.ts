import {Demand} from '../catalogue/model/publish/demand';
import {Injectable} from '@angular/core';
import {catalogue_endpoint} from '../globals';
import {getAuthorizedHeaders} from '../common/utils';
import {Http} from '@angular/http';
import {UserService} from '../user-mgmt/user.service';
import {CookieService} from 'ng2-cookies';
import {DemandPaginationResponse} from './model/demand-pagination-response';
import {DEFAULT_LANGUAGE} from '../catalogue/model/constants';
import {Facet} from '../common/model/facet';
import {UBLModelUtils} from '../catalogue/model/ubl-model-utils';
import {DatePipe} from '@angular/common';
import {DemandLastSeenResponse} from '../catalogue/model/publish/demand-last-seen-response';

@Injectable()
export class DemandService {

    // demand last seen response for the active user
    public demandLastSeenResponse:DemandLastSeenResponse = null;

    constructor(private http: Http,
                private userService: UserService,
                public datePipe: DatePipe,
                private cookieService: CookieService) {
    }

    public publishDemand(demand: Demand): Promise<number> {
        const url = catalogue_endpoint + `/demands`;
        let headers = getAuthorizedHeaders(this.cookieService);
        let defaultLanguage = DEFAULT_LANGUAGE();
        let acceptLanguageHeader = defaultLanguage;
        if(defaultLanguage != "en"){
            acceptLanguageHeader += ",en;0.9";
        }
        headers.append("Accept-Language",acceptLanguageHeader);
        return this.http
            .post(url, demand, { headers: headers})
            .toPromise()
            .catch(this.handleError);
    }

    public getDemands(searchTerm: string = null, partyId: string = null, categoryUri: string = null, buyerCountry: string = null, deliveryCountry: string = null,
                      page = 1, pageSize = 10, circularEconomyCertificates: string = null, otherCertificates: string = null): Promise<DemandPaginationResponse> {

        let url = catalogue_endpoint + `/demands?pageNo=${page}&limit=${pageSize}`;
        if (!!searchTerm) {
           url += `&query=${encodeURIComponent(searchTerm)}&lang=${DEFAULT_LANGUAGE()}`;
        }
        if (partyId) {
            url += `&companyId=${partyId}`;
        }
        if (categoryUri) {
            url += `&categoryUri=${encodeURIComponent(categoryUri)}`;
        }
        if (buyerCountry) {
            url += `&buyerCountry=${buyerCountry}`;
        }
        if (deliveryCountry) {
            url += `&deliveryCountry=${deliveryCountry}`;
        }

        // backend service takes a list of string for circular economy and other certificates, however, we pass only a single string for now
        if(circularEconomyCertificates){
            url += `&circularEconomyCertificates=${circularEconomyCertificates}`;
        }
        if(otherCertificates){
            url += `&otherCertificates=${otherCertificates}`;
        }

        url += `&dueDate=${this.datePipe.transform(new Date(),'yyyy-MM-dd')}`;
        return this.http
            .get(url, { headers: getAuthorizedHeaders(this.cookieService) })
            .toPromise()
            .then(res => new DemandPaginationResponse(res.json()))
            .catch(this.handleError);
    }

    public getDemandFacets(searchTerm: string = null, partyId: string = null, categoryUri: string = null,
                           buyerCountry: string = null, deliveryCountry: string = null, circularEconomyCertificates: string = null, otherCertificates: string = null): Promise<Facet[]> {
        let url = catalogue_endpoint + `/demand-facets`;
        let conditionExist = false;
        if (!!searchTerm) {
            url += `?query=${encodeURIComponent(searchTerm)}&lang=${DEFAULT_LANGUAGE()}`;
            conditionExist = true;
        }
        if (partyId) {
            let operator = '&';
            if (!conditionExist) {
                operator = '?';
                conditionExist = true;
            }
            url += `${operator}companyId=${partyId}`;
        }
        if (categoryUri) {
            let operator = '&';
            if (!conditionExist) {
                operator = '?';
                conditionExist = true;
            }
            url += `${operator}categoryUri=${encodeURIComponent(categoryUri)}`;
        }
        if (buyerCountry) {
            let operator = '&';
            if (!conditionExist) {
                operator = '?';
                conditionExist = true;
            }
            url += `${operator}buyerCountry=${buyerCountry}`;
        }
        if (deliveryCountry) {
            let operator = '&';
            if (!conditionExist) {
                operator = '?';
                conditionExist = true;
            }
            url += `${operator}deliveryCountry=${deliveryCountry}`;
        }
        // backend service takes a list of string for circular economy and other certificates, however, we pass only a single string for now
        if (circularEconomyCertificates) {
            let operator = '&';
            if (!conditionExist) {
                operator = '?';
                conditionExist = true;
            }
            url += `${operator}circularEconomyCertificates=${circularEconomyCertificates}`;
        }
        if (otherCertificates) {
            let operator = '&';
            if (!conditionExist) {
                operator = '?';
                conditionExist = true;
            }
            url += `${operator}otherCertificates=${otherCertificates}`;
        }
        // due date
        let operator = conditionExist ? '&' : "?";
        url += `${operator}dueDate=${this.datePipe.transform(new Date(),'yyyy-MM-dd')}`;
        return this.http
            .get(url, { headers: getAuthorizedHeaders(this.cookieService) })
            .toPromise()
            .then(res => {
                const resultJson: any[] = res.json();
                return resultJson.map(facetResponse => new Facet(facetResponse));
            })
            .catch(this.handleError);
    }

    public updateDemand(demand: Demand): Promise<any> {
        const url = catalogue_endpoint + `/demands/${demand.hjid}`;
        return this.http
            .put(url, demand, { headers: getAuthorizedHeaders(this.cookieService) })
            .toPromise()
            .catch(this.handleError)
    }

    public deleteDemand(demandHjid: number): Promise<any> {
        let url = catalogue_endpoint + `/demands/${demandHjid}`;
        return this.http
            .delete(url, { headers: getAuthorizedHeaders(this.cookieService) })
            .toPromise()
            .catch(this.handleError);
    }

    public createInterestActivity(demandHjid: number): Promise<any> {
        let url = catalogue_endpoint + `/demands/${demandHjid}/visit?visitorCompanyId=${this.cookieService.get('company_id')}`;
        return this.http
            .post(url, null, { headers: getAuthorizedHeaders(this.cookieService) })
            .toPromise()
            .catch(this.handleError);
    }

    public addLastSeenDemandId(lastSeenDemandId:string): Promise<any> {
        return this.http
            .post(catalogue_endpoint + `/demands/last-seen`,  lastSeenDemandId,{ headers: getAuthorizedHeaders(this.cookieService) })
            .toPromise()
            .catch(this.handleError);
    }

    public getDemandLastSeenResponse(){
        this.http
            .get(catalogue_endpoint + `/demands/last-seen/response?dueDate=${this.datePipe.transform(new Date(),'yyyy-MM-dd')}`,  { headers: getAuthorizedHeaders(this.cookieService) })
            .toPromise()
            .then(res => {
                this.demandLastSeenResponse = new DemandLastSeenResponse(res.json());
            })
            .catch(this.handleError);
    }

    private handleError(error: any): Promise<any> {
        return Promise.reject(error.message || error);
    }

}
