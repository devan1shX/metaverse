"use client";

import Image from "next/image";
import { motion } from "framer-motion";

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
  },
  {
    id: "conference",
    title: "Conference",
    description:
      "Host a large event with talk sessions, poster booths, and more.",
    image: "/images/space-2.png",
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
      className="w-full max-w-2xl"
    >
      <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2">
        What are you looking to do?
      </h1>
      <p className="text-center text-gray-400 mb-12">
        Choose a template to get started.
      </p>

      <div className="space-y-6">
        {useCases.map((useCase, index) => (
          <motion.button
            key={useCase.id}
            onClick={() => onSelect(useCase.id)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="w-full flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-[#35354e] border border-gray-700/50 hover:border-green-400 hover:bg-[#3f3f5a] transition-all duration-300 text-left"
          >
            <div className="w-full md:w-1/3 h-40 rounded-lg overflow-hidden relative">
              <Image
                src={useCase.image}
                alt={useCase.title}
                fill
                style={{ objectFit: 'cover' }}
                className="opacity-80"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{useCase.title}</h2>
              <p className="text-gray-400">{useCase.description}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
