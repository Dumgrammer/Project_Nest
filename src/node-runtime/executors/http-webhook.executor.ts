import { Injectable } from '@nestjs/common';
import { NodeExecutor } from '../node-executor.interface.js';
import { WorkflowNodeType } from '../node.decorator.js';

@Injectable()
@WorkflowNodeType('http.webhook')
export class HttpWebhookExecutor implements NodeExecutor {
  async execute(config: Record<string, unknown>, input: Record<string, unknown>) {
    const url = String(config.url ?? '');
    const method = String(config.method ?? 'POST');

    const response = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });

    const body = await response.text();
    return { status: response.status, body };
  }
}
