/*
 * Copyright 2020
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

import { ProcessInstanceGroup } from '../../bpe/model/process-instance-group';
import { CollaborationGroup } from '../../bpe/model/collaboration-group';

export class ProcessInstanceGroupResults {
    constructor(
        public processInstanceGroups: ProcessInstanceGroup[] = null,
        public collaborationGroupIds: string[] = null, // ids associated with the resultant process instance groups
        public hasArchivedGroups = false,
        public resultCount = 0
    ) { }
}