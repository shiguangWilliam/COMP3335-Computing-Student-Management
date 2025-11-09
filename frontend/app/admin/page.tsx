import Link from "next/link";

export default function AdminHome() {
  const items = [
    { href: "/students", title: "Students" },
    { href: "/courses", title: "Courses" },
    { href: "/enrollments", title: "Enrollments" },
    { href: "/grades", title: "Grades" },
    { href: "/reports", title: "Reports" },
  ];
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Admin</h1>
      <p className="mb-6 text-sm text-zinc-600">Choose a ComputingU SMS module.</p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((it) => (
          <li key={it.href} className="rounded border p-4">
            <Link href={it.href} className="font-medium hover:underline">
              {it.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}