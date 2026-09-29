import { Module } from "@nestjs/common";
import { ExecutionStreamController } from "./execution-stream.controller.js";
import { ExecutionEventsService } from "./execution-events.service.js";


@Module({
    controllers: [ExecutionStreamController],
    providers: [ExecutionEventsService],
    exports: [ExecutionEventsService],
})
export class ExecutionStreamModule {}