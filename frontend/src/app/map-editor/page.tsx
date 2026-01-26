"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
// import { DashboardHeader } from "@/components/DashboardHeader";
import MapEditor from "@/components/MapEditor/MapEditor";

export default function MapEditorPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <LoadingScreen />;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header removed for full-screen editor experience */}
      <div className="flex-1 overflow-hidden">
        <MapEditor />
      </div>
    </div>
  );
}
