import { redirect } from "next/navigation";
// eslint-disable-next-line import/no-unresolved
import { auth } from "@/app/auth";

export default async function LandingPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/chat");
  } else {
    redirect("/login");
  }

  // This part will not be reached due to the redirects,
  // but returning null or an empty fragment is good practice for async components.
  return null;
}
