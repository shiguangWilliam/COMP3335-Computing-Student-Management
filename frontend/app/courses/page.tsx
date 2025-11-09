export default function CoursesPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Courses</h1>
      <p className="text-sm text-zinc-600">Manage course catalog: create, edit, delete.</p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded border p-4">
          <h2 className="mb-2 font-medium">Create / Edit</h2>
          <p className="text-sm text-zinc-600">Form skeleton for course info (code, name, credits).</p>
        </div>
        <div className="rounded border p-4">
          <h2 className="mb-2 font-medium">Search</h2>
          <p className="text-sm text-zinc-600">Search by code or keywords.</p>
        </div>
      </div>
      <div className="mt-6 rounded border p-4">
        <h2 className="mb-2 font-medium">Catalog</h2>
        <p className="text-sm text-zinc-600">Table skeleton for listing courses.</p>
      </div>
    </div>
  );
}