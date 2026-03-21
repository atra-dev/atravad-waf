'use client';

import AppLoadingState from '@/components/AppLoadingState';
import Layout from '@/components/Layout';

export default function RouteLoadingScreen(props) {
  return (
    <Layout>
      <AppLoadingState {...props} />
    </Layout>
  );
}
