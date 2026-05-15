"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// This route no longer exists — matches are shown on the event detail page
export default function QuestionsRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/events/${params?.id}`);
  }, [params?.id, router]);

  return null;
}
