import { Injectable } from '@nestjs/common';
import { ReplaySubject } from 'rxjs';
import { ExecutionEvent } from '../common/interfaces/execution-event.interface.js';


@Injectable()
export class ExecutionEventsService {
  private readonly streams = new Map<string, ReplaySubject<ExecutionEvent>>();
  private readonly cleanupTimers = new Map<string, NodeJS.Timeout>();

  getStream(executionId: string): ReplaySubject<ExecutionEvent> {
    if (!this.streams.has(executionId)) {
      // Replay recent events so late subscribers still receive execution history.
      this.streams.set(executionId, new ReplaySubject<ExecutionEvent>(50));
    }
    return this.streams.get(executionId)!;
  }

  emit(event: ExecutionEvent): void {
    this.getStream(event.executionId).next(event);
  }

  complete(executionId: string): void {
    const stream = this.streams.get(executionId);
    if (!stream) {
      return;
    }
    stream.complete();

    const existingTimer = this.cleanupTimers.get(executionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Keep completed streams briefly so clients connecting right after completion can replay events.
    const timer = setTimeout(() => {
      this.streams.delete(executionId);
      this.cleanupTimers.delete(executionId);
    }, 5 * 60 * 1000);
    this.cleanupTimers.set(executionId, timer);
  }

}