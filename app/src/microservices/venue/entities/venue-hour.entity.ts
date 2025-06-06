import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Venue } from "./venue.entity";

// Restore inline enum
export enum DayOfWeek {
  MONDAY = "monday",
  TUESDAY = "tuesday",
  WEDNESDAY = "wednesday",
  THURSDAY = "thursday",
  FRIDAY = "friday",
  SATURDAY = "saturday",
  SUNDAY = "sunday",
}

@Entity("venue_hours")
export class VenueHour {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "venue_id" })
  venueId: string;

  @ManyToOne(() => Venue, (venue) => venue.hours, { onDelete: "CASCADE" })
  @JoinColumn({ name: "venue_id" })
  venue: Venue;

  @Column({
    type: "text",
    enum: DayOfWeek,
  })
  dayOfWeek: DayOfWeek;

  @Column({ name: "open_time", type: "time" })
  openTime: string;

  @Column({ name: "close_time", type: "time" })
  closeTime: string;

  @Column({ name: "is_closed", default: false })
  isClosed: boolean;

  @Column({ name: "is_open_24_hours", default: false })
  isOpen24Hours: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamp with time zone" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp with time zone" })
  updatedAt: Date;
}
