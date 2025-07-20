import React from 'react';

/**
 * A reusable skeleton loader component with a pulsing animation.
 * @param {{className: string}} props - Accepts a className to control width, height, etc.
 */
export default function Skeleton({ className }) {
  return (
    <div className={`bg-gray-200 rounded-md animate-pulse ${className}`}></div>
  );
}