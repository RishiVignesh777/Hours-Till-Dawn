import React from 'react';
import { motion } from 'motion/react';
import { NoteDoc } from '../types';
import { BookOpen, X } from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';

interface NoteModalProps {
  note: NoteDoc | null;
  onClose: () => void;
}

export const NoteModal: React.FC<NoteModalProps> = ({ note, onClose }) => {
  if (!note) return null;

  return (
    <div className="absolute inset-0 bg-[#050505]/90 backdrop-blur-xl flex items-center justify-center p-4 z-50 select-none font-serif text-[#E0E0E0]">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/15 p-6 sm:p-8 shadow-2xl flex flex-col gap-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#8B0000]" />
            <h3 className="text-base sm:text-lg font-normal uppercase tracking-wider text-[#C0C0C0] m-0">
              {note.title}
            </h3>
          </div>
          <button
            onClick={() => {
              soundEngine.playFlashlightClick();
              onClose();
            }}
            className="p-1 text-[#666] hover:text-[#E0E0E0] border border-transparent hover:border-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Date & Author */}
        <div className="flex items-center justify-between text-xs font-mono text-[#777]">
          <span>RECORD DATE: {note.date}</span>
          <span>AUTHOR: {note.author}</span>
        </div>

        {/* Note Body */}
        <div className="text-base sm:text-lg leading-relaxed text-[#B0B0B0] py-3 border-y border-white/[0.07] my-1 italic font-serif">
          "{note.content}"
        </div>

        {/* Footer Close Prompt */}
        <div className="flex justify-end pt-2">
          <button
            onClick={() => {
              soundEngine.playFlashlightClick();
              onClose();
            }}
            className="px-5 py-2 bg-white/[0.03] hover:bg-white/[0.08] text-[#C0C0C0] font-mono text-xs uppercase tracking-[0.15em] border border-white/10 transition cursor-pointer"
          >
            Put Down Record [ESC / E]
          </button>
        </div>
      </motion.div>
    </div>
  );
};
