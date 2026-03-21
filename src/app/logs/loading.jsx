import RouteLoadingScreen from '@/components/RouteLoadingScreen';

export default function Loading() {
  return (
    <RouteLoadingScreen
      title="Loading security logs"
      message="Authenticating access and preparing your managed event stream."
    />
  );
}
