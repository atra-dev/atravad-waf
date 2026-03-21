import RouteLoadingScreen from '@/components/RouteLoadingScreen';

export default function Loading() {
  return (
    <RouteLoadingScreen
      title="Loading admin console"
      message="Syncing tenant portfolio data, managed subscriptions, and operational activity."
    />
  );
}
