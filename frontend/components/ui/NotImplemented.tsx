"use client";
import Link from "next/link";

type Props = {
  title?: string;
  message?: string;
  endpoint?: string;
};

export default function NotImplemented({
  title = "No implementation yet",
  message = "This feature's backend API is not yet implemented. Currently displaying placeholder content.",
  endpoint,
}: Props) {
  return (
    <div className="rounded border border-amber-200 bg-amber-50 p-4">
      <h2 className="text-lg font-medium text-amber-800">{title}</h2>
      <p className="mt-1 text-sm text-amber-800">{message}</p>
      {endpoint && (
        <p className="mt-1 text-xs text-amber-700">API Endpoint: {endpoint}</p>
      )}
      <div className="mt-3">
        <Link href="/" className="text-sm text-blue-700 hover:underline">
          Return to Home
        </Link>
      </div>
    </div>
  );
}