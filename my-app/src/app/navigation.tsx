'use client';

import dynamic from 'next/dynamic';

// Dynamically import the Navigation component with ssr disabled
// This ensures it only renders on the client side
const Navigation = dynamic(() => import('../components/Navigation'), {
  ssr: false,
});

export default function NavigationWrapper() {
  return <Navigation />;
}
