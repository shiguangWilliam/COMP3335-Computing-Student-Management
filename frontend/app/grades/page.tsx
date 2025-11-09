export default function GradesPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Grades</h1>
      <p className="text-sm text-zinc-600">Assign and view grades for enrollments.</p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded border p-4">
          <h2 className="mb-2 font-medium">Assign Grade</h2>
          <p className="text-sm text-zinc-600">Form skeleton to assign grade to student-course.</p>
        </div>
        <div className="rounded border p-4">
          <h2 className="mb-2 font-medium">Search</h2>
          <p className="text-sm text-zinc-600">Search grades by Student ID or Course Code.</p>
        </div>
      </div>
      <div className="mt-6 rounded border p-4">
        <h2 className="mb-2 font-medium">Results</h2>
        <p className="text-sm text-zinc-600">Table skeleton for grade records.</p>
      </div>
    </div>
  );
}