import { Module } from "@nestjs/common";
// import { NotificationController } from './notification.controller'; // Temporarily commented out - File missing
// import { NotificationService } from './notification.service'; // Temporarily commented out - File missing
// import { NotificationRepository } from './repositories/notification.repository'; // Temporarily commented out - File missing

@Module({
  controllers: [
    /* NotificationController */
  ], // Temporarily commented out
  providers: [
    /* NotificationService, NotificationRepository */
  ], // Temporarily commented out
  exports: [
    /* NotificationService */
  ], // Temporarily commented out
})
export class NotificationModule {}
