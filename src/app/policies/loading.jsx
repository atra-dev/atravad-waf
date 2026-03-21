import RouteLoadingScreen from '@/components/RouteLoadingScreen';

export default function Loading() {
  return (
    <RouteLoadingScreen
      title="Loading security policies"
      message="Pulling active policy sets, version history, and application assignments."
    />
  );
}
