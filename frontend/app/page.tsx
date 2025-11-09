import Link from "next/link";
import Card from "@/components/ui/Card";

export default function Home() {
  const modules = [
    { href: "/students", title: "Students", desc: "Manage student profiles" },
    { href: "/courses", title: "Courses", desc: "Course catalog and details" },
    { href: "/enrollments", title: "Enrollments", desc: "Enroll/unenroll students" },
    { href: "/grades", title: "Grades", desc: "Assign and view grades" },
    { href: "/reports", title: "Reports", desc: "Generate administrative reports" },
  ];
  return (
    <div>
      <h1 className="mb-2 text-3xl font-semibold">ComputingU 学生管理系统</h1>
      <p className="mb-6 text-sm text-zinc-600">请选择模块开始操作，或使用顶部导航快速进入。</p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <li key={m.href}>
            <Card className="hover:shadow transition-shadow">
              <Link href={m.href} className="font-medium text-blue-700 hover:underline">
                {m.title}
              </Link>
              <p className="mt-1 text-sm text-zinc-600">{m.desc}</p>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
