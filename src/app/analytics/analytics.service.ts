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

import { Injectable } from '@angular/core';
import { Headers, Http } from '@angular/http';
import 'rxjs/add/operator/toPromise';
import * as myGlobals from '../globals';
import { CookieService } from 'ng2-cookies';
import {DEFAULT_LANGUAGE} from '../catalogue/model/constants';

@Injectable()
export class AnalyticsService {

    private headers = new Headers({ 'Content-Type': 'application/json' });
    private url_da = myGlobals.data_aggregation_endpoint;
    private url_bpe = `${myGlobals.bpe_endpoint}/statistics`;
    private url_trust = myGlobals.trust_service_endpoint;
    private url_identity = myGlobals.user_mgmt_endpoint;

    constructor(
        private http: Http,
        private cookieService: CookieService
    ) {
    }

    getPlatAnalytics(): Promise<any> {
        const url = `${this.url_da}`;
        return this.http
            .get(url, { headers: this.getAuthorizedHeaders() })
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
    }

    getPlatCollabAnalytics(): Promise<any> {
        const url = `${this.url_da}/platform/collabaration`;
        return this.http
            .get(url, { headers: this.getAuthorizedHeaders() })
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
    }

    getPerfromanceAnalytics(comp: string): Promise<any> {
        const url = `${this.url_da}/company?companyID=${comp}`;
        return this.http
            .get(url, { headers: this.getAuthorizedHeaders() })
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
    }


    getCollabAnalytics(comp: string): Promise<any> {
        const url = `${this.url_da}/company/collabaration?companyID=${comp}`;
        return this.http
            .get(url, { headers: this.getAuthorizedHeaders() })
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
    }

    getCompAnalytics(comp: string): Promise<any> {
        const url = `${this.url_da}?companyID=${comp}`;
        return this.http
            .get(url, { headers: this.headers })
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
    }

    getNonOrdered(partyId: string): Promise<any> {
        const url = `${this.url_bpe}/non-ordered?partyId=${partyId}`;
        return this.http
            .get(url, { headers: this.getAuthorizedHeaders() })
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
    }

    getTrustPolicy(): Promise<any> {
        const url = `${this.url_trust}/policy/global`;
        let headers = this.getAuthorizedHeaders();
        return this.http
            .get(url, { headers: headers, withCredentials: true })
            .toPromise()
            .then(res => {
                // the server returns empty text if there is no global trust policy
                return res.text() ? res.json(): res
            })
            .catch(this.handleError);
    }

    setTrustPolicy(policy: any): Promise<any> {
        const url = `${this.url_trust}/policy/global/update`;
        let headers = this.getAuthorizedHeaders();
        return this.http
            .post(url, JSON.stringify(policy), { headers: headers, withCredentials: true })
            .toPromise()
            .then(res => res)
            .catch(this.handleError);
    }

    initTrustPolicy(): Promise<any> {
        const url = `${this.url_trust}/policy/global/initialize`;
        let headers = this.getAuthorizedHeaders();
        return this.http
            .post(url, null, { headers: headers, withCredentials: true })
            .toPromise()
            .then(res => res)
            .catch(this.handleError);
    }

    getUnverifiedCompanies(page: number, sortBy?: string, orderBy?: string): Promise<any> {
        var url = `${this.url_identity}/admin/unverified_companies?page=${page}&sortBy=${sortBy}&orderBy=${orderBy}`;
        url += "&size=99999";
        const token = 'Bearer ' + this.cookieService.get("bearer_token");
        const headers_token = new Headers({ 'Content-Type': 'application/json', 'Authorization': token });
        return this.http
            .get(url, { headers: headers_token, withCredentials: true })
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
    }

    getVerifiedCompanies(page: number, size?: number, sortBy?: string, orderBy?: string): Promise<any> {
        var url = `${this.url_identity}/admin/verified_companies?page=${page}&sortBy=${sortBy}&orderBy=${orderBy}`;
        if (size)
            url += "&size=" + size;
        const token = 'Bearer ' + this.cookieService.get("bearer_token");
        const headers_token = new Headers({ 'Content-Type': 'application/json', 'Authorization': token });
        return this.http
            .get(url, { headers: headers_token, withCredentials: true })
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
    }

    getAllParties(page: number): Promise<any> {
        const url = `${this.url_identity}/parties/all?page=${page}`;
        const token = 'Bearer ' + this.cookieService.get("bearer_token");
        const headers_token = new Headers({ 'Content-Type': 'application/json', 'Authorization': token });
        return this.http
            .get(url, { headers: headers_token, withCredentials: true })
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
    }

    verifyCompany(companyId: string): Promise<any> {
        const url = `${this.url_identity}/admin/verify_company?companyId=${companyId}`;
        let headers = this.getAuthorizedHeaders();

        return this.http
            .post(url, {}, { headers: headers, withCredentials: true })
            .toPromise()
            .then(res => res)
            .catch(this.handleError);
    }

    rejectCompany(companyId: string): Promise<any> {
        const url = `${this.url_identity}/admin/reject_company/${companyId}`;
        let headers = this.getAuthorizedHeaders();

        return this.http
            .delete(url, { headers: headers, withCredentials: true })
            .toPromise()
            .then(res => res)
            .catch(this.handleError);
    }

    deleteCompany(companyId: string): Promise<any> {
        const userId = this.cookieService.get("user_id");
        const url = `${this.url_identity}/admin/delete_company/${companyId}?userId=${userId}`;
        let headers = this.getAuthorizedHeaders();

        return this.http
            .delete(url, { headers: headers, withCredentials: true })
            .toPromise()
            .then(res => res)
            .catch(this.handleError);
    }

    private getAuthorizedHeaders(): Headers {
        const token = 'Bearer ' + this.cookieService.get("bearer_token");
        let headers = new Headers({ 'Accept': 'application/json', 'Authorization': token });
        this.headers.keys().forEach(header => headers.append(header, this.headers.get(header)));
        let defaultLanguage = DEFAULT_LANGUAGE();
        let acceptLanguageHeader = defaultLanguage;
        if(defaultLanguage != "en"){
            acceptLanguageHeader += ",en;0.9";
        }
        headers.append("Accept-Language",acceptLanguageHeader);
        return headers;
    }

    private handleError(error: any): Promise<any> {
        return Promise.reject(error.message || error);
    }
}
