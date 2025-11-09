export default function EnrollmentsPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Enrollments</h1>
      <p className="text-sm text-zinc-600">Manage student-course enrollments.</p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded border p-4">
          <h2 className="mb-2 font-medium">Enroll / Unenroll</h2>
          <p className="text-sm text-zinc-600">Form skeleton to enroll a student to a course.</p>
        </div>
        <div className="rounded border p-4">
          <h2 className="mb-2 font-medium">Search</h2>
          <p className="text-sm text-zinc-600">Search enrollments by Student ID or Course Code.</p>
        </div>
      </div>
      <div className="mt-6 rounded border p-4">
        <h2 className="mb-2 font-medium">List</h2>
        <p className="text-sm text-zinc-600">Table skeleton for listing enrollments.</p>
      </div>
    </div>
  );
}