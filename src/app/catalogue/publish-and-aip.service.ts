import {Injectable} from "@angular/core";

@Injectable()
export class PublishService {
    propertyBlockCollapsedStates:Map<string, boolean> = new Map<string, boolean>();

    getCollapsedStates():any {
        return this.propertyBlockCollapsedStates;
    }

    getCollapsedState(blockName:string):boolean {
        if(this.propertyBlockCollapsedStates.has(blockName)) {
            return this.propertyBlockCollapsedStates.get(blockName);
        } else {
            this.propertyBlockCollapsedStates.set(blockName, true);
            return true;
        }
    }

    resetData():void {
        this.propertyBlockCollapsedStates = new Map<string, boolean>();
    }
}