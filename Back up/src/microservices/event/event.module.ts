import { Module } from "@nestjs/common";
import { EventController } from "./event.controller";
import { EventService } from "./event.service";
import { EventRepository } from "./repositories/event.repository";
import { PlanAnalyticsService } from "./services/plan-analytics.service";
import { PlanTrendingService } from "./services/plan-trending.service";
// import { TypeOrmModule } from "@nestjs/typeorm";
// import { Event } from "./entities/event.entity";
// import { EventAttendee } from "./entities/event-attendee.entity";
import { CacheModule } from "@nestjs/cache-manager";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { InterestModule } from "../interest/interest.module";
// DatabaseModule is implicitly imported due to @Global(), no explicit import needed here

@Module({
  imports: [
    // TypeOrmModule.forFeature([Event, EventAttendee]),
    CacheModule.register(),
    EventEmitterModule.forRoot(),
    InterestModule,
  ],
  controllers: [EventController],
  providers: [
    EventService,
    EventRepository,
    PlanAnalyticsService,
    PlanTrendingService,
  ],
  exports: [EventService],
})
export class EventModule {}
