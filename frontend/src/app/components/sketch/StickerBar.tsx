import React from "react";
import { TELECOM_STICKERS, type TelecomSticker } from "../../types/sketch";

interface StickerBarProps {
  onStickerSelect: (sticker: TelecomSticker) => void;
}

export const StickerBar: React.FC<StickerBarProps> = ({ onStickerSelect }) => {
  const categories = [
    { key: "sector" as const, label: "Sectors" },
    { key: "equipment" as const, label: "Equipment" },
    { key: "safety" as const, label: "Safety" },
  ];

  return (
    <div className="bg-gray-800 border-t border-gray-700 px-4 py-3">
      <div className="flex items-center gap-6">
        {categories.map((cat) => {
          const stickers = TELECOM_STICKERS.filter((s) => s.category === cat.key);
          return (
            <div key={cat.key} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-wide mr-1">
                {cat.label}
              </span>
              {stickers.map((sticker) => (
                <button
                  key={sticker.id}
                  onClick={() => onStickerSelect(sticker)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-white text-xs font-bold transition-transform hover:scale-105 active:scale-95"
                  style={{ backgroundColor: sticker.color }}
                  title={sticker.label}
                >
                  <span>{sticker.icon}</span>
                  <span>{sticker.label}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
