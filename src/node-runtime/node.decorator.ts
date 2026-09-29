import { SetMetadata } from '@nestjs/common';

export const NODE_TYPE_METADATA = 'node:type';
export const WorkflowNodeType = (type: string) => SetMetadata(NODE_TYPE_METADATA, type);
