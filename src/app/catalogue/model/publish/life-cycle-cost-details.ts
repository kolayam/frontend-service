import {Quantity} from "./quantity";
import {Amount} from "./amount";
import {ItemProperty} from "./item-property";
export class LifeCyclePerformanceAssessmentDetails {
    constructor(
        public lifeCycleLength: Quantity = new Quantity(),
        public purchasingPrice: Amount = new Amount(),
        public assemblyCost: Amount = new Amount(),
        public transportCost: Amount = new Amount(),
        public consumableCost: Amount = new Amount(),
        public energyConsumptionCost: Amount = new Amount(),
        public maintenanceCost: Amount = new Amount(),
        public sparePartCost: Amount = new Amount(),
        public endOfLifeCost: Amount = new Amount(),
        public additionalLCPADetail: ItemProperty[] = []
        ) {  }
}