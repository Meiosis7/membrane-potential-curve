import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "膜电位动态实验台",
  description: "可操作的膜电位曲线、离子通道与离子流实时模拟。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
