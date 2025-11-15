export default function DisciplinaryPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Disciplinary Records</h1>
      <p className="text-sm text-zinc-600">Manage disciplinary records.</p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded border p-4">
          <h2 className="mb-2 font-medium">Create / Edit</h2>
          <p className="text-sm text-zinc-600">Form skeleton for student, date, staff, description.</p>
        </div>
        <div className="rounded border p-4">
          <h2 className="mb-2 font-medium">Search</h2>
          <p className="text-sm text-zinc-600">Search by student or date.</p>
        </div>
      </div>
      <div className="mt-6 rounded border p-4">
        <h2 className="mb-2 font-medium">Records</h2>
        <p className="text-sm text-zinc-600">Table skeleton for listing records.</p>
      </div>
    </div>
  );
}