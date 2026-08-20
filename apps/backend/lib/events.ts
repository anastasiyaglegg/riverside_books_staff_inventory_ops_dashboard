export function isEventFull(reservedCount: number, capacity: number | null): boolean {
  return capacity !== null && reservedCount >= capacity;
}
