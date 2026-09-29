export type NodeErrorPolicy = 'fail' | 'continue' | 'fallback';

export interface NodeErrorConfig {
    policy: NodeErrorPolicy;
    fallbackNode?: string;
}

export interface WorkflowNode {
    id: string;
    type: string;
    config: Record<string, unknown>;
    onError?: NodeErrorConfig;
}

export interface WorkflowDefinition {
    id: string;
    ownerId: string;
    name: string;
    version: number;
    nodes: WorkflowNode[];
}