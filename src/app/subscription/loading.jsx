import RouteLoadingScreen from '@/components/RouteLoadingScreen';

export default function Loading() {
  return (
    <RouteLoadingScreen
      title="Loading subscription"
      message="Reviewing your tenant plan, included limits, retention windows, and managed service access."
    />
  );
}
