import { Controller, MessageEvent, Param, Sse } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ExecutionEventsService } from './execution-events.service.js';

@Controller('executions')
export class ExecutionStreamController {
  constructor(private readonly events: ExecutionEventsService) {}

  @Sse(':executionId/stream')
  getExecutionEvents(@Param('executionId') executionId: string): Observable<MessageEvent> {
    return this.events
      .getStream(executionId)
      .pipe(map((event) => ({ data: event })));
  }
}
