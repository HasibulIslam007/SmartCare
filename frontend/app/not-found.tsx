import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>Page not found</h1>
      <p>Let’s get you back to your care.</p>
      <Link href="/" className="text-link">
        Go to overview
      </Link>
    </div>
  );
}
