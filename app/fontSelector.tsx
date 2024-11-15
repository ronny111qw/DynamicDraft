import React from 'react';
import { Inter, Roboto, Lora, Montserrat, Playfair_Display } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
const roboto = Roboto({ weight: ['400', '700'], subsets: ['latin'] });
const lora = Lora({ subsets: ['latin'] });
const montserrat = Montserrat({ subsets: ['latin'] });
const playfair = Playfair_Display({ subsets: ['latin'] });

export const fonts = {
  inter,
  roboto,
  lora,
  montserrat,
  playfair
};

interface FontSelectorProps {
  selectedFont: string;
  onFontChange: (font: string) => void;
}

const FontSelector: React.FC<FontSelectorProps> = ({ selectedFont, onFontChange }) => {
  return (
    <div className="mb-4">
      <label htmlFor="font-select" className="block text-sm font-medium text-gray-700 text-white">
        Select Resume Font
      </label>
      <select
        id="font-select"
        value={selectedFont}
        onChange={(e) => onFontChange(e.target.value)}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-[#2a2a2a] text-white"
      >
        <option value="inter">Inter</option>
        <option value="roboto">Roboto</option>
        <option value="lora">Lora</option>
        <option value="montserrat">Montserrat</option>
        <option value="playfair">Playfair Display</option>
      </select>
    </div>
  );
};

export default FontSelector;