"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import SpaceLobby from "@/components/SpaceLobby";

export default function SpacePage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);
    
    if (loading || !user) {
        return <LoadingScreen />;
    }

    return <SpaceLobby />;
}