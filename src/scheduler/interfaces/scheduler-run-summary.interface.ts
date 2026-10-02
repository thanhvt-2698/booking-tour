export interface SchedulerRunSummary {
  bookingsExpired: number;
  bookingsFailedExpiry: number;
  bookingsScannedForExpiry: number;
  departuresClosed: number;
  departuresScannedForClosure: number;
  departuresCompleted: number;
  departuresScannedForCompletion: number;
  notificationsDispatched: number;
  remindersSubmitted: number;
  remindersFailed: number;
  remindersScanned: number;
}
