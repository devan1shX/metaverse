"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles, Building } from "lucide-react";

interface CreateSpaceUseCaseProps {
  onSelect: (useCase: string) => void;
}

const useCases = [
  {
    id: "remote-office",
    title: "Remote office",
    description:
      "Create a work space to collaborate and connect with your team.",
    image: "/images/space-1.png",
    icon: Building,
  },
  {
    id: "conference",
    title: "Conference",
    description:
      "Host a large event with talk sessions, poster booths, and more.",
    image: "/images/space-2.png",
    icon: Sparkles,
  },
];

export default function CreateSpaceUseCase({
  onSelect,
}: CreateSpaceUseCaseProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="w-full max-w-3xl"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          What are you looking to do?
        </h1>
        <p className="text-gray-600">
          Choose a template to get started.
        </p>
      </div>

      <div className="space-y-4">
        {useCases.map((useCase, index) => {
          const Icon = useCase.icon;
          return (
            <motion.button
              key={useCase.id}
              onClick={() => onSelect(useCase.id)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="w-full group"
            >
              <div className="card card-hover p-6 flex flex-col md:flex-row items-center gap-6 text-left">
                <div className="w-full md:w-1/3 h-40 rounded-lg overflow-hidden relative flex-shrink-0">
                  <Image
                    src={useCase.image}
                    alt={useCase.title}
                    fill
                    style={{ objectFit: 'cover' }}
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="w-6 h-6 text-indigo-600" />
                    <h2 className="text-xl font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {useCase.title}
                    </h2>
                  </div>
                  <p className="text-gray-600">{useCase.description}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
