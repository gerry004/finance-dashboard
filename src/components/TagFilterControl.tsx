"use client";

import { useState } from "react";
import { TagOption } from "@/utils/notionHelpers";

interface TagFilterControlProps {
  availableTags: TagOption[];
  excludedTags: Set<string>;
  onExcludedTagsChange: (excludedTags: Set<string>) => void;
}

const colorMap: Record<string, string> = {
  red: "bg-red-100 text-red-800 border-red-300",
  blue: "bg-blue-100 text-blue-800 border-blue-300",
  green: "bg-green-100 text-green-800 border-green-300",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
  purple: "bg-purple-100 text-purple-800 border-purple-300",
  pink: "bg-pink-100 text-pink-800 border-pink-300",
  orange: "bg-orange-100 text-orange-800 border-orange-300",
  gray: "bg-gray-100 text-gray-800 border-gray-300",
  brown: "bg-zinc-100 text-zinc-800 border-zinc-300",
  lime: "bg-lime-100 text-lime-800 border-lime-300",
  emerald: "bg-emerald-100 text-emerald-800 border-emerald-300",
  cyan: "bg-cyan-100 text-cyan-800 border-cyan-300",
  violet: "bg-violet-100 text-violet-800 border-violet-300",
  fuchsia: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300",
  rose: "bg-rose-100 text-rose-800 border-rose-300",
  default: "bg-gray-100 text-gray-800 border-gray-300",
};

export function TagFilterControl({
  availableTags,
  excludedTags,
  onExcludedTagsChange,
}: TagFilterControlProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleTag = (tagName: string) => {
    const newExcluded = new Set(excludedTags);
    if (newExcluded.has(tagName)) {
      newExcluded.delete(tagName);
    } else {
      newExcluded.add(tagName);
    }
    onExcludedTagsChange(newExcluded);
  };

  const selectAll = () => {
    onExcludedTagsChange(new Set());
  };

  const deselectAll = () => {
    onExcludedTagsChange(new Set(availableTags.map((tag) => tag.name)));
  };

  const includedTags = availableTags.filter((tag) => !excludedTags.has(tag.name));
  const excludedTagsList = availableTags.filter((tag) => excludedTags.has(tag.name));

  if (availableTags.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-yellow-800">
          ⚠️ No tags found in the database schema. Tag filtering is unavailable.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-6 shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🏷️</span>
          <h3 className="text-lg font-semibold">Tag Filters</h3>
          <span className="text-sm text-gray-500">
            ({excludedTags.size} excluded, {includedTags.length} included)
          </span>
        </div>
        <span className="text-gray-500">{isExpanded ? "▲" : "▼"}</span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200">
          {/* Action Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={selectAll}
              className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
            >
              Include All
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
            >
              Exclude All
            </button>
          </div>

          {/* Included Tags */}
          {includedTags.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Included Tags ({includedTags.length}):
              </h4>
              <div className="flex flex-wrap gap-2">
                {includedTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.name)}
                    className={`px-3 py-1 rounded-md text-sm font-medium border-2 transition-all hover:opacity-80 ${
                      colorMap[tag.color as keyof typeof colorMap] || colorMap.default
                    }`}
                  >
                    {tag.name} ✓
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Excluded Tags */}
          {excludedTagsList.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Excluded Tags ({excludedTagsList.length}):
              </h4>
              <div className="flex flex-wrap gap-2">
                {excludedTagsList.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.name)}
                    className={`px-3 py-1 rounded-md text-sm font-medium border-2 opacity-50 line-through transition-all hover:opacity-70 ${
                      colorMap[tag.color as keyof typeof colorMap] || colorMap.default
                    }`}
                  >
                    {tag.name} ✗
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-2 rounded">
            💡 Click on any tag to toggle between included and excluded. Excluded tags won't be
            counted in income/expenditure calculations.
          </div>
        </div>
      )}
    </div>
  );
}

