import { notFound } from "next/navigation";
import { BuilderPage } from "@/components/avatar-builder/BuilderPage";

export default function AvatarBuilderRoute() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <BuilderPage />;
}
