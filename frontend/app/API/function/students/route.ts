import { NextRequest, NextResponse } from "next/server";

function notImplemented(path: string) {
  return NextResponse.json(
    {
      code: "NOT_IMPLEMENTED",
      message: "该接口尚未在开发环境中实现。",
      endpoint: path, // 相对路径，避免暴露完整目录
    },
    { status: 501 }
  );
}

export async function GET(_req: NextRequest) {
  return notImplemented("/API/function/students");
}

export async function POST(_req: NextRequest) {
  return notImplemented("/API/function/students");
}

export async function PUT(_req: NextRequest) {
  return notImplemented("/API/function/students");
}

export async function DELETE(_req: NextRequest) {
  return notImplemented("/API/function/students");
}