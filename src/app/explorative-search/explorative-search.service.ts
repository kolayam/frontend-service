/**
 * This is the Service File for the Explorative Search Component.
 * We Inject a simple HTTP GET Service which will perform a GET on
 * the User's keyword input to the backend server.
 * And return the response in JSON for further parsing.
 */

import { Injectable } from '@angular/core';
import { Http } from '@angular/http';

import 'rxjs/add/operator/toPromise';
import * as myGlobals from '../globals';

@Injectable()

export class ExplorativeSearchService {
    private url = myGlobals.endpoint;
    private logicalUrl = myGlobals.logicalViewEndpoint;
    private propEndPoint = myGlobals.propertyEndPoint;
    private sparqlEndPoint = myGlobals.sparqlEndPoint;
    private sparqlOptionEndPoint = myGlobals.sparqlOptionalSelectEndPoint;
    private  userLang = navigator.language; 



    constructor(private http: Http) { }
    // This is where the HTTP GET service is performed
    // for keyword search from user
    searchData(term: string): Promise<any> {
        console.log("Search term for language: " + this.userLang + " and used backend url " + this.url);
        let input = "{ \"keyword\":\""+term+"\", \"language\":\"" + this.userLang + "\"}";
        return this.http.get(`${this.url}?inputAsJson=${input}`)
            .toPromise()
            .then(res => res.json());
    }

    getLogicalView(term: Object): Promise<any> {
        term["language"] = this.userLang;
        return this.http.get(`${this.logicalUrl}?inputAsJson=${JSON.stringify(term)}`)
            .toPromise()
            .then(res => res.json());
    }

    getPropertyValues(term: Object): Promise<any> {
         term["language"] = this.userLang;
        return this.http.get(`${this.propEndPoint}?inputAsJson=${JSON.stringify(term)}`)
            .toPromise()
            .then(res => res.json());
    }

    getTableValues(term: String): Promise<any> {
         term = term.substring(0, term.length-1);
         term +=", \"language\":" + this.userLang + "\"}";
         console.log ("Send: " + term);
        return this.http.get(`${this.sparqlEndPoint}?inputAsJson=${(term)}`)
            .toPromise()
            .then(res => res.json());
    }

    getOptionalSelect(term: Object): Promise<any> {
         term["language"] = this.userLang;
        return this.http.get(`${this.sparqlOptionEndPoint}?inputAsJson=${JSON.stringify(term)}`)
            .toPromise()
            .then(res => res.json());
    }
}
