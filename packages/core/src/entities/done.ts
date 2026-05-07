import { BaseDoc } from './base';

export type DoneStatus = 'done';

export interface DoneDoc extends BaseDoc<DoneStatus> {
    type: 'done';
    status: DoneStatus;
}
