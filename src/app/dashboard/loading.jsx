import RouteLoadingScreen from '@/components/RouteLoadingScreen';

export default function Loading() {
  return (
    <RouteLoadingScreen
      title="Loading security dashboard"
      message="Preparing your tenant overview, protected sites, and active policy posture."
    />
  );
}
