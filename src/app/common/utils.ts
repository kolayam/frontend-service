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

import {ItemProperty} from '../catalogue/model/publish/item-property';
import {Quantity} from '../catalogue/model/publish/quantity';
import {Period} from '../catalogue/model/publish/period';
import {Price} from '../catalogue/model/publish/price';
import {Category} from './model/category/category';
import {Property} from './model/category/property';
import {PropertyValueQualifier} from '../catalogue/model/publish/property-value-qualifier';
import {CUSTOM_PROPERTY_LIST_ID, DEFAULT_LANGUAGE, SOCIAL_MEDIA_CLASSES} from '../catalogue/model/constants';
import {Item} from '../catalogue/model/publish/item';
import {Text} from '../catalogue/model/publish/text';
import {CatalogueLine} from '../catalogue/model/publish/catalogue-line';
import {Amount} from '../catalogue/model/publish/amount';
import {CookieService} from 'ng2-cookies';
import {Headers} from '@angular/http';
import {PartyName} from '../catalogue/model/publish/party-name';
import {maximumDecimalsForPrice, MONTHS} from './constants'

const UI_NAMES: any = {
    STRING: 'TEXT'
};

export function sanitizeLink(link: any): any {
    let parsed_link = '';
    if (link && link != '') {
        if (link.indexOf('http://') == -1 && link.indexOf('https://') == -1) {
            parsed_link = 'http://' + link;
        } else {
            parsed_link = link;
        }
        if (!checkURL(parsed_link)) {
            parsed_link = '';
        }
    }
    return parsed_link;
}

function checkURL(url: string): boolean {
    const expression = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
    const regex = new RegExp(expression);
    let match = false;
    if (url.match(regex)) {
        match = true;
    }
    return match;
}

export function sanitizeDataTypeName(dataType: PropertyValueQualifier): string {
    if (UI_NAMES[dataType]) {
        return UI_NAMES[dataType]
    }
    return dataType;
}

export function sanitizePropertyName(name: string): string {
    if (!name || name.length === 0) {
        return '(no name)';
    }
    const result = name.replace(/([a-z])([A-Z])/g, '$1 $2');
    return result.substr(0, 1).toUpperCase() + result.substr(1);
}

export function copy<T = any>(object: T): T {
    return JSON.parse(JSON.stringify(object));
}

function isItemProperty(property: any): property is ItemProperty {
    return !!property.name; // preferredName for Property
}

/**
 * label object in the form of:
 * {
 *    "en": "English label",
 *    "es": "Spanish label"
 * }
 *
 * tries first to get label in the preferred language, then English label, then the first label.
 * If the label is not a json object, then the label itself is returned
 * @param label
 * @param lang
 */
export function selectNameFromLabelObject(label: any, lang?: string): string {
    if (label == null) {
        return '';
    }
    let defaultLanguage = DEFAULT_LANGUAGE();
    if (lang) {
        defaultLanguage = lang;
    }
    if (label[defaultLanguage] != null) {
        return label[defaultLanguage];
    }
    if (label['en'] != null) {
        return label['en'];
    }
    if (Object.keys.length > 0) {
        return label[Object.keys(label)[0]];
    } else {
        return label;
    }
}

export function selectPreferredName(cp: Category | Property, lang?: string): string {
    if (!cp) {
        return '';
    }
    let defaultLanguage = DEFAULT_LANGUAGE();
    if (lang) {
        defaultLanguage = lang;
    }
    let englishName = null;
    for (let pName of cp.preferredName) {
        if (pName.languageID === defaultLanguage) {
            return pName.value;
        } else if (pName.languageID == 'en') {
            englishName = pName.value;
        }
    }

    if (englishName) {
        return englishName;
    }

    return cp.preferredName[0].value;
}

export function selectPreferredNameForSolrCategory(category): string {
    if (!category) {
        return '';
    }

    let name = category.label[DEFAULT_LANGUAGE()];
    if(name){
        return name;
    }
    let englishName = category.label["en"];
    if (englishName) {
        return englishName;
    }

    return category.label[Object.keys(category.label)[0]];
}

// returns the all values for the default language of the browser
// if there's no value for the default language of the browser, then returns english values if possible
export function selectPreferredValues(texts: Text[], lang?: string): string[] {
    let values = [];
    let defaultLanguage = DEFAULT_LANGUAGE();
    if (lang) {
        defaultLanguage = lang;
    }
    let englishValues = [];
    for (let text of texts) {
        if (text.languageID === defaultLanguage) {
            values.push(text.value);
        } else if (text.languageID == 'en') {
            englishValues.push(text.value);
        }
    }
    // there are values for the default language of the browser
    if (values.length > 0) {
        return values;
    }
    // there are english values
    if (englishValues.length > 0) {
        return englishValues;
    }

    if (texts.length > 0 && texts[0].value) {
        return [texts[0].value];
    } else {
        return [''];
    }
}

// return the value for the default language of the browser
export function selectPreferredValue(texts: Text[], lang?: string): string {
    let defaultLanguage = DEFAULT_LANGUAGE();
    if (lang) {
        defaultLanguage = lang;
    }
    let englishValue = null;
    for (let text of texts) {
        if (text.languageID === defaultLanguage) {
            return text.value;
        } else if (text.languageID == 'en') {
            englishValue = text.value;
        }
    }
    // there is an english value
    if (englishValue) {
        return englishValue;
    }

    if (texts.length > 0 && texts[0].value) {
        return texts[0].value;
    } else {
        return '';
    }
}

export function selectName(ip: ItemProperty | Item, lang?: string) {
    let defaultLanguage = DEFAULT_LANGUAGE();
    if (lang) {
        defaultLanguage = lang;
    }
    let englishName = null;
    for (let pName of ip.name) {
        if (pName.languageID === defaultLanguage && pName.value) {
            return pName.value;
        } else if (pName.languageID == 'en') {
            englishName = pName.value;
        }
    }

    if (englishName) {
        return englishName;
    }

    if (ip.name.length === 0) {
        return '';
    }

    return ip.name[0].value;
}

export function getSocialMediaClass(url: string, addRightSpace: boolean = false) {
    if (url != null) {
        let socialMedia = SOCIAL_MEDIA_CLASSES.filter(socialMedia => url.includes(socialMedia.url));
        if (socialMedia.length > 0) {
            return socialMedia[0].class + (addRightSpace ? ' space-right' : '');
        }
    }
    return null;
}

// textObject represents an object which contains languageId-value pairs
// this function is used to get value according to the default language of browser
export function selectValueOfTextObject(textObject, lang?: string): string {
    let defaultLanguage = DEFAULT_LANGUAGE();
    if (lang) {
        defaultLanguage = lang;
    }
    let englishName = null;
    // get the keys
    let keys = Object.keys(textObject);
    for (let key of keys) {
        // if there is a value for the default language, simply return it
        if (key == defaultLanguage) {
            return textObject[defaultLanguage];
        } else if (key == 'en') {
            englishName = textObject[key];
        }
    }
    // if there's no value for default language, but an english value is available, then return it
    if (englishName) {
        return englishName;
    }
    // if there's no value for default language and english, then return the first value if possible
    if (keys.length > 0) {
        return textObject[keys[0]];
    }
    // if it is an empty object, return empty string.
    return '';
}

// for the given value, it creates a languageId-value pair.
// for now, languageId is the default language of the browser
export function createTextObject(value: string, lang?: string): Object {
    let defaultLanguage = DEFAULT_LANGUAGE();
    if (lang) {
        defaultLanguage = lang;
    }
    let textObject = {};
    textObject[defaultLanguage] = value;
    return textObject;
}

// For a given TextObject get an array of objects with text and lang keys
export function getArrayOfTextObject(textObject): any {
    let arr = [];
    let keys = Object.keys(textObject);
    for (let key of keys) {
        arr.push({'text': textObject[key], 'lang': key});
    }
    if (arr.length == 0) {
        arr = [{'text': '', 'lang': DEFAULT_LANGUAGE()}];
    }
    return arr;
}

/**
 *  Returns an array of TextObject for the given language map
 *  @param languageMap the map containing the new line separated values for language ids
 *  @return an array of TextObject
 */
export function getArrayOfTextObjectFromLanguageMap(languageMap): any {
    let arr = [];
    let keys = Object.keys(languageMap);
    for (let key of keys) {
        let values = languageMap[key].split('\n');
        values.forEach(value => arr.push({'text': value, 'lang': key}));
    }
    if (arr.length == 0) {
        arr = [{'text': '', 'lang': DEFAULT_LANGUAGE()}];
    }
    return arr;
}

/**
 *  Returns the language map for the given TextObject array
 *  @param arr TextObject array
 *  @return a language map containing the new line separated values for language ids
 */
export function createLanguageMapFromArrayOfTextObject(arr): Object {
    let languageMap = {};
    for (let i = 0; i < arr.length; i++) {
        if (arr[i].lang != '' && arr[i].text != '') {
            if (languageMap[arr[i].lang]) {
                languageMap[arr[i].lang] = languageMap[arr[i].lang] + '\n' + arr[i].text;
            } else {
                languageMap[arr[i].lang] = arr[i].text;
            }
        }
    }
    return languageMap;
}

// Transform an array created using the getArrayOfTextObject function back to a TextObject
export function createTextObjectFromArray(arr): Object {
    let textObject = {};
    for (let i = 0; i < arr.length; i++) {
        if (arr[i].lang != '' && arr[i].text != '') {
            textObject[arr[i].lang] = arr[i].text;
        }
    }
    return textObject;
}

// For the given PartyName array, it finds the correct name of the party according to the default language of the browser.
export function selectPartyName(partyNames: PartyName[], lang?: string): string {
    let defaultLanguage = DEFAULT_LANGUAGE();
    if (lang) {
        defaultLanguage = lang;
    }
    let englishName = null;
    for (let partyName of partyNames) {
        // if the party has a name for the default language of the browser, return it
        if (partyName.name.languageID == defaultLanguage) {
            return partyName.name.value;
        } else if (partyName.name.languageID == 'en') {
            englishName = partyName.name.value;
        }
    }
    // if the party does not have a name for the default language of the browser, but english name is available, then return it
    if (englishName) {
        return englishName;
    }
    // if there's no value for default language and english, then return the first value if possible
    if (partyNames.length > 0) {
        return partyNames[0].name.value;
    }
    // if the party has no names, return empty string
    return '';
}

export function createText(value: string, lang?: string): Text {
    let defaultLanguage = DEFAULT_LANGUAGE();
    if (lang) {
        defaultLanguage = lang;
    }
    return new Text(value, defaultLanguage);
}

export function selectDescription(item: Item, lang?: string) {
    if (item.description.length == 0) {
        return null;
    }
    let defaultLanguage = DEFAULT_LANGUAGE();
    if (lang) {
        defaultLanguage = lang;
    }
    let englishName = null;
    for (let pName of item.description) {
        if (pName.languageID === defaultLanguage) {
            return pName.value;
        } else if (pName.languageID == 'en') {
            englishName = pName.value;
        }
    }

    if (englishName) {
        return englishName;
    }

    return item.description[0].value;
}

export function getPropertyKey(property: Property | ItemProperty): string {
    if (isItemProperty(property)) {
        return selectName(property) + '___' + property.valueQualifier;
    }
    return selectPreferredName(property) + '___' + property.dataType;
}

export function quantityToString(quantity: Quantity): string {
    if (quantity.value) {
        return `${quantity.value} ${quantity.unitCode}`;
    }
    return '';
}

export function amountToString(amount: Amount): string {
    if (amount.value) {
        return `${amount.value} ${amount.currencyID}`;
    }
    return '';
}

export function durationToString(duration: Quantity): string {
    if (duration.value > 0) {
        return quantityToString(duration);
    }
    if (duration.value === 0) {
        return 'None';
    }
    return 'None';
}

export function periodToString(period: Period): string {
    return durationToString(period.durationMeasure);
}

// this method converts the date (YYYY-MM-DD) to MM/DD/YYYY format
export function dateToString(date: string): string {
    if (date && date != '') {
        let dateParts = date.split('-');
        return dateParts[1] + '/' + dateParts[2] + '/' + dateParts[0];
    }
    return '';
}

const MAX_PRICE = 100000;

const STEPS_FOR_PRICE = 100;

export function getMaximumQuantityForPrice(price: Price): number {
    if (!price || !price.priceAmount.value) {
        return 100;
    }

    return Math.round(Math.ceil(MAX_PRICE / price.priceAmount.value) * price.baseQuantity.value);
}

export function getStepRangeForPrice(price: Price): number {
    if (!price || !price.priceAmount.value) {
        return 1;
    }

    let priceBasedStep: number = getMaximumQuantityForPrice(price) / STEPS_FOR_PRICE;
    let step: number;
    if (priceBasedStep < price.baseQuantity.value) {
        step = price.baseQuantity.value;
    } else {
        step = Math.floor(priceBasedStep / price.baseQuantity.value) * price.baseQuantity.value;
    }
    return step;
}

interface CurrenciesStringValues {
    [currencyId: string]: string
}

const CURRENCIES_STRING_VALUES: CurrenciesStringValues = {
    // EUR: "€", // disabled for now
    // USD: "$",
    // GBP: "₤"
};

export function getFileExtension(filename: string): string {
    let ext = /^.+\.([^.]+)$/.exec(filename);
    return ext == null ? '' : ext[1];
}

export function roundToTwoDecimals(value): any {
    if (!isNaN(value) && value !== null && value != 0) {
        // round to minimum possible decimal >= 2
        let roundedValue: number = 0;
        let power = 1;
        do {
            power++;
            roundedValue = Math.round(value * Math.pow(10, power)) / Math.pow(10, power);
        } while (roundedValue == 0);

        return roundedValue.toFixed(power);
    }
    return value;
}

export function roundToTwoDecimalsNumber(value: number): number {
    return Number(value.toFixed(2));
}

export function isNaNNullAware(number: number): boolean {
    return isNaN(number) || number == null;

}

export function isValidPrice(value: any, maximumDecimals: number = maximumDecimalsForPrice) {
    if (value != null && !isNaN(value) && value !== '') {
        let decimals = countDecimals(value);
        return (decimals <= maximumDecimals);
    } else {
        return false;
    }
}

export function countDecimals(value: any): number {
    if (Math.floor(value) === value) {
        return 0;
    }
    return value.toString().split('.')[1].length || 0;
}

export function currencyToString(currencyId: string): string {
    return CURRENCIES_STRING_VALUES[currencyId] || currencyId;
}

export function sortCategories(categories: Category[]): Category[] {
    return categories.sort((a, b) => selectPreferredName(a).localeCompare(selectPreferredName(b)));
}

export function sortSolrCategories(categories: any): any {
    return categories.sort((a, b) => selectPreferredNameForSolrCategory(a).localeCompare(selectPreferredNameForSolrCategory(b)));
}

export function sortProperties(properties: Property[]): Property[] {
    return properties.sort((a, b) => selectPreferredName(a).localeCompare(selectPreferredName(b)));
}

export function scrollToDiv(divId: string): void {
    if (document.getElementById(divId)) {
        document.getElementById(divId).scrollIntoView();
    }
}

export function isCustomProperty(property: ItemProperty): boolean {
    return property && property.itemClassificationCode.listID === CUSTOM_PROPERTY_LIST_ID;
}

export function getPropertyValues(property: ItemProperty): any[] {
    switch (property.valueQualifier) {
        case 'INT':
        case 'DOUBLE':
        case 'NUMBER':
            return property.valueDecimal;
        case 'FILE':
            return property.valueBinary;
        case 'QUANTITY':
            return property.valueQuantity;
        case 'STRING':
        case 'BOOLEAN':
            return property.value;
    }
}

export function getPropertyValuesAsStrings(property: ItemProperty): string[] {
    switch (property.valueQualifier) {
        case 'INT':
        case 'DOUBLE':
        case 'NUMBER':
            return property.valueDecimal.map(num => String(num));
        case 'FILE':
            return property.valueBinary.map(bin => bin.fileName);
        case 'QUANTITY':
            return property.valueQuantity.map(qty => `${qty.value} ${qty.unitCode}`);
        case 'STRING':
            return selectPreferredValues(property.value);
        case 'BOOLEAN':
            if (property.value.length === 0) {
                return ['false'];
            } else {
                return [property.value[0].value];
            }
    }
}

export function getPropertyValueAsString(value: any, valueQualifier: string): string {
    switch (valueQualifier) {
        case 'INT':
        case 'DOUBLE':
        case 'NUMBER':
            return String(value);
        case 'FILE':
            return value.fileName;
        case 'QUANTITY':
            return `${value.value} ${value.unitCode}`;
        case 'STRING':
            return value.value;
        case 'BOOLEAN':
            return value[0].value;
    }
}

export function areTransportServices(products: CatalogueLine[]): boolean {
    if (products) {
        for (let product of products) {
            if (!isTransportService(product)) {
                return false;
            }
        }
    }
    return true;
}

export function isTransportService(product: CatalogueLine): boolean {
    if (product) {
        for (let commodityClassification of product.goodsItem.item.commodityClassification) {
            if (commodityClassification.itemClassificationCode.listID == 'Default' && commodityClassification.itemClassificationCode.value == 'Transport Service') {
                return true;
            }
        }
    }
    return false;
}

export function areLogisticsService(products: CatalogueLine[]): boolean {
    if (products) {
        for (let product of products) {
            if (!isLogisticsService(product)) {
                return false;
            }
        }
    }
    return true;
}

export function isLogisticsService(product: CatalogueLine): boolean {
    if (product) {
        for (let commodityClassification of product.goodsItem.item.commodityClassification) {
            if (commodityClassification.itemClassificationCode.listID == 'Default') {
                if (commodityClassification.itemClassificationCode.value == 'Logistics Service' || commodityClassification.itemClassificationCode.value == 'Transport Service') {
                    return true;
                }
            }

        }
    }
    return false;
}

export function deepEquals(obj1: any, obj2: any): boolean {

    if (obj1 == null && obj2 == null) {
        return true;
    } else if (obj1 == null || obj2 == null) {
        return false;
    }

    if (obj1 === obj2) {
        return true;
    }

    // simple cases should be compared with obj1 === obj2
    // let's consider functions immutable here...
    if (typeof obj1 !== 'object') {
        return false;
    }

    // array case
    if (Array.isArray(obj1)) {
        if (!Array.isArray(obj2)) {
            return false;
        }

        if (obj1.length !== obj2.length) {
            return false;
        }

        for (let i = 0; i < obj1.length; i++) {
            if (!deepEquals(obj1[i], obj2[i])) {
                return false;
            }
        }

        return true;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) {
        return false;
    }

    for (let i = 0; i < keys1.length; i++) {
        // obj2[keys1[i]] is NOT a mistake, keys may be ordered differently...
        if (!deepEquals(obj1[keys1[i]], obj2[keys1[i]])) {
            return false;
        }
    }

    return true;
}

export function validateNumberInput(event: any): boolean {
    const charCode = (event.which) ? event.which : event.keyCode;
    return !(charCode > 31 && (charCode < 48 || charCode > 57));
}

export function removeHjids(json): any {
    let ret = JSON.parse(JSON.stringify(json));
    let keys = Object.keys(ret);
    for (let i = 0; i < keys.length; i++) {
        if (keys[i] == 'hjid') {
            ret[keys[i]] = null;
        } else if (ret[keys[i]] && typeof (ret[keys[i]]) === 'object') {
            let keys_inner = Object.keys(ret[keys[i]]);
            if (keys_inner.length > 0) {
                ret[keys[i]] = this.removeHjids(ret[keys[i]]);
            }
        }
    }
    return ret;
}

export function getAuthorizedHeaders(cookieService: CookieService): Headers {
    const token = 'Bearer ' + cookieService.get('bearer_token');
    return new Headers({'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': token});
}

export function findCategoryInArray(categoryArray: Category[], category: Category): number {
    return categoryArray.findIndex(c => c.id == category.id);
}

export function getTimeLabel(timeInDays){
    if(timeInDays <= 0){
        return null;
    }
    if(timeInDays < 0.0417){
        return Math.round(timeInDays * 10 * 1440) / 10 + " M";
    }
    else if(timeInDays < 1){
        return Math.round(timeInDays * 10 * 24) / 10 + " H";
    }
    return Math.round(timeInDays * 10) / 10 + " D";
}

export function populateValueObjectForMonthGraphs(map): any[]{
    var obj = [];

    if(map){
        // get the current month
        let currentMonth = new Date().getMonth();
        // populate the data for each month starting from the current one
        while(map[currentMonth] != undefined){
            obj.push({
                "value": map[currentMonth],
                "name": MONTHS[currentMonth]
            })
            currentMonth--;
            if(currentMonth < 0){
                currentMonth = 11;
            }
        }
        // reverse the array so that the current month is the last one in the graph
        obj.reverse();
    }
    return obj;
}
