import RouteLoadingScreen from '@/components/RouteLoadingScreen';

export default function Loading() {
  return (
    <RouteLoadingScreen
      title="Loading tenant users"
      message="Preparing managed access, user roles, and organization members."
    />
  );
}
