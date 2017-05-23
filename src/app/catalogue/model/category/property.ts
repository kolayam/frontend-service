/**
 * Created by suat on 12-May-17.
 */
import {Unit} from "./unit";
import {KeywordSynonym} from "./keyword-synonym";
import {Value} from "./value";

export class Property {
    constructor(
        public id: string,
        public preferredName: string,
        public shortName: string,
        public definition: string,
        public note: string,
        public remark: string,
        public preferredSymbol: string,
        public unit: Unit,
        public iecCategory: string,
        public attributeType: string,
        public dataType: string,
        public synonyms: KeywordSynonym[],
        public values: Value[]
    ) {  }
}