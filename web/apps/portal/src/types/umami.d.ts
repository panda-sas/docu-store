interface UmamiTracker {
  track(event_name: string, data?: Record<string, string | number>): void;
}

interface Window {
  umami?: UmamiTracker;
}
