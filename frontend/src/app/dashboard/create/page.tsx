"use client";

import { useState, useEffect } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import CreateSpaceUseCase from "@/components/CreateSpaceUseCase";
import CreateSpaceMapSelection from "@/components/CreateSpaceMapSelection";
import CreateSpaceCustomize from "@/components/CreateSpaceCustomize";
import CreateSpaceName from "@/components/CreateSpaceName";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

type Step = "loading" | "use-case" | "map-selection" | "customize-map" | "name-space";

export default function CreateSpacePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");

  // State to hold all the data collected during creation
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
    setStep("customize-map"); // Proceed to the new customize step
  };
  
  const handleCustomizeConfirm = (customization: { size: number; theme: string }) => {
    setCreationData(prev => ({ ...prev, ...customization }));
    setStep("name-space"); // Proceed to naming step after customization
  }

  const handleNameConfirm = (spaceName: string) => {
    const finalData = { ...creationData, name: spaceName };
    setCreationData(finalData);

    console.log("Creating space with following data:", finalData);
    router.push(`/space/${spaceName}`);
  };

  const handleBack = (currentStep: Step) => {
    if (currentStep === 'name-space') {
      setStep('customize-map');
    } else if (currentStep === 'customize-map') {
      setStep('map-selection');
    } else if (currentStep === 'map-selection') {
      setStep('use-case');
    }
  }

  if (authLoading || step === "loading") {
    return <LoadingScreen />;
  }

  // Helper function to render the current step's component
  const renderStep = () => {
    switch(step) {
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
                onBack={() => handleBack('customize-map')}
                onConfirm={handleCustomizeConfirm}
            />
        ) : null;
      case "name-space":
        return (
            <CreateSpaceName
                onBack={() => handleBack('name-space')}
                onConfirm={handleNameConfirm}
            />
        );
      default:
        return <LoadingScreen />;
    }
  }

  return (
    <div className="min-h-screen bg-[#2a2a3e] text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      {renderStep()}
    </div>
  );
}