import RouteLoadingScreen from '@/components/RouteLoadingScreen';

export default function Loading() {
  return (
    <RouteLoadingScreen
      title="Loading attack analytics"
      message="Compiling attack trends, severity patterns, and high-risk source intelligence."
    />
  );
}
