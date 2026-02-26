"use client";

import { useState, useEffect } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import CreateSpaceUseCase from "@/components/CreateSpaceUseCase";
import CreateSpaceMapSelection from "@/components/CreateSpaceMapSelection";
import CreateSpaceCustomize from "@/components/CreateSpaceCustomize";
import CreateSpaceName from "@/components/CreateSpaceName";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useSpaces } from "@/contexts/SpacesContext";
import { useRouter } from "next/navigation";

type Step =
  | "loading"
  | "use-case"
  | "map-selection"
  | "customize-map"
  | "name-space";

export default function CreateSpacePage() {
  const { user, loading: authLoading } = useAuth();
  const { createSpace, loading: spacesLoading } = useSpaces();
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [error, setError] = useState<string | null>(null);

  const [creationData, setCreationData] = useState({
    useCase: "remote-office", // Default value
    map: "",
    mapImageUrl: "", 
    theme: "",
    size: 25,
    name: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // Skip use-case step
    const timer = setTimeout(() => {
      setStep("map-selection"); 
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleUseCaseSelect = (selectedUseCase: string) => {
    setCreationData((prev) => ({ ...prev, useCase: selectedUseCase }));
    setStep("map-selection");
  };

  const handleMapSelect = (selectedMap: string, thumbnailUrl?: string) => {
    setCreationData((prev) => ({ 
        ...prev, 
        map: selectedMap,
        mapImageUrl: thumbnailUrl || "" 
    }));
    setStep("customize-map");
  };

  const handleCustomizeConfirm = (customization: {
    size: number;
    theme: string;
  }) => {
    setCreationData((prev) => ({ ...prev, ...customization }));
    setStep("name-space");
  };

  const handleNameConfirm = async (spaceName: string) => {
    setError(null);
    const finalData = { ...creationData, name: spaceName };

    // Map the frontend map selection to actual map IDs
    const getMapId = (frontendMapId: string) => {
      // If it's already a valid mapId (office-01, office-02, custom-xxx), use it directly
      if (frontendMapId.startsWith('office-') || frontendMapId.startsWith('custom-')) {
        return frontendMapId;
      }
      
      // Legacy mapping for old use-case based IDs
      switch (frontendMapId) {
        case "corporate-hq":
          return "office-01";
        case "conference-hall":
          return "office-02";
        default:
          return frontendMapId; // Return as-is for any other IDs
      }
    };

    const selectedMapId = getMapId(finalData.map);

    const requestData = {
      name: finalData.name,
      description: `A space for ${finalData.useCase}`,
      isPublic: true,
      maxUsers: finalData.size,
      mapId: selectedMapId,
      mapImageUrl: finalData.mapImageUrl, // Include mapImageUrl
    };

    console.log("🚀 Creating space with data:", requestData);

    try {
      const result = await createSpace(requestData);

      console.log("📦 Create space result:", result);

      if (result.success) {
        localStorage.setItem("selectedMap", selectedMapId);
        router.push(`/space/${result.space.id}`);
      } else {
        const errorMsg = result.errors ? result.errors.join(", ") : result.message;
        console.error("❌ Backend error:", errorMsg, result);
        setError(errorMsg || "Failed to create space. Please try again.");
        console.error("Error creating space:", result);
      }
    } catch (err: any) {
      console.error("💥 Exception during space creation:", err);
      setError(err.message || "An unexpected error occurred.");
      console.error("Caught error during space creation:", err);
    }
  };

  const handleBack = (currentStep: Step) => {
    if (currentStep === "name-space") {
      setStep("customize-map");
    } else if (currentStep === "customize-map") {
      setStep("map-selection");
    } else if (currentStep === "map-selection") {
      // Go back to dashboard instead of use-case
      router.push("/dashboard");
    }
  };

  if (authLoading || step === "loading" || spacesLoading) {
    return <LoadingScreen />;
  }

  const renderStep = () => {
    switch (step) {
      case "use-case":
        return <CreateSpaceUseCase onSelect={handleUseCaseSelect} />;
      case "map-selection":
        return creationData.useCase ? (
          <CreateSpaceMapSelection
            selectedUseCase={creationData.useCase}
            onSelect={handleMapSelect}
          />
        ) : null;
      case "customize-map":
        return creationData.map ? (
          <CreateSpaceCustomize
            selectedMapId={creationData.map}
            thumbnailUrl={creationData.mapImageUrl}
            onBack={() => handleBack("customize-map")}
            onConfirm={handleCustomizeConfirm}
          />
        ) : null;
      case "name-space":
        return (
          <>
            <CreateSpaceName
              onBack={() => handleBack("name-space")}
              onConfirm={handleNameConfirm}
            />
            {error && (
              <div className="max-w-lg mx-auto mt-4">
                <div className="card p-4 bg-red-50 border-red-200">
                  <p className="text-sm text-red-600 text-center">{error}</p>
                </div>
              </div>
            )}
          </>
        );
      default:
        return <LoadingScreen />;
    }
  };

  return (
    <>
      <DashboardHeader avatarUrl={user?.user_avatar_url} />
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        {renderStep()}
      </div>
    </>
  );
}
