import { IdeaDoc } from './idea';
import { DesignDoc } from './design';
import { PlanDoc } from './plan';
import { CtxDoc } from './ctx';
import { ChatDoc } from './chat';
import { DoneDoc } from './done';
import { ReferenceDoc } from './reference';
import { ReqDoc } from './req';

export type Document = IdeaDoc | DesignDoc | PlanDoc | CtxDoc | ChatDoc | DoneDoc | ReferenceDoc | ReqDoc;

export type DocumentStatus = IdeaDoc['status'] | DesignDoc['status'] | PlanDoc['status'] | CtxDoc['status'] | ChatDoc['status'] | DoneDoc['status'] | ReferenceDoc['status'] | ReqDoc['status'];