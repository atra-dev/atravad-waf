import RouteLoadingScreen from '@/components/RouteLoadingScreen';

export default function Loading() {
  return (
    <RouteLoadingScreen
      title="Loading protected sites"
      message="Syncing your websites, origin configuration, certificates, and policy assignments."
    />
  );
}
