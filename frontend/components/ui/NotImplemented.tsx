"use client";
import Link from "next/link";

type Props = {
  title?: string;
  message?: string;
  endpoint?: string; // 相对路径提示，避免暴露完整目录
};

export default function NotImplemented({
  title = "功能未实现",
  message = "该功能的后端接口尚未实现，当前显示占位内容。",
  endpoint,
}: Props) {
  return (
    <div className="rounded border border-amber-200 bg-amber-50 p-4">
      <h2 className="text-lg font-medium text-amber-800">{title}</h2>
      <p className="mt-1 text-sm text-amber-800">{message}</p>
      {endpoint && (
        <p className="mt-1 text-xs text-amber-700">接口：{endpoint}</p>
      )}
      <div className="mt-3">
        <Link href="/" className="text-sm text-blue-700 hover:underline">
          返回首页
        </Link>
      </div>
    </div>
  );
}