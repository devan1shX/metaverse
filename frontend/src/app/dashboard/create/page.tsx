"use client";

import { useState, useEffect } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import CreateSpaceUseCase from "@/components/CreateSpaceUseCase";
import CreateSpaceMapSelection from "@/components/CreateSpaceMapSelection";
import CreateSpaceCustomize from "@/components/CreateSpaceCustomize";
import CreateSpaceName from "@/components/CreateSpaceName";
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
    useCase: "",
    map: "",
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
    const timer = setTimeout(() => {
      setStep("use-case");
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleUseCaseSelect = (selectedUseCase: string) => {
    setCreationData((prev) => ({ ...prev, useCase: selectedUseCase }));
    setStep("map-selection");
  };

  const handleMapSelect = (selectedMap: string) => {
    setCreationData((prev) => ({ ...prev, map: selectedMap }));
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

    // FIX: Helper function to map frontend map IDs to backend-compatible types
    const getBackendMapType = (frontendMapId: string) => {
      switch (frontendMapId) {
        case "corporate-hq":
          return "office";
        case "conference-hall":
          return "meeting";
        default:
          return "custom"; // Fallback value
      }
    };

    try {
      const result = await createSpace({
        name: finalData.name,
        description: `A space for ${finalData.useCase}`,
        isPublic: true,
        maxUsers: finalData.size,
        mapType: getBackendMapType(finalData.map), // Use the mapped value
      });

      if (result.success) {
        const mapKey =
          finalData.map === "corporate-hq" ? "office-01" : "office-02";
        localStorage.setItem("selectedMap", mapKey);
        router.push(`/space/${result.space.id}`);
      } else {
        // Use the actual error from the backend if available
        const errorMsg = result.errors ? result.errors.join(", ") : result.message;
        setError(errorMsg || "Failed to create space. Please try again.");
        console.error("Error creating space:", result);
      }
    } catch (err: any) {
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
      setStep("use-case");
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
              <p className="mt-4 text-center text-red-400 max-w-md">{error}</p>
            )}
          </>
        );
      default:
        return <LoadingScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-[#2a2a3e] text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      {renderStep()}
    </div>
  );
}
