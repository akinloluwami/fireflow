import { useState, useRef, useEffect } from "react";
import { Database } from "lucide-react";
import { VariablePicker } from "./VariablePicker";
import { hasVariables } from "@/lib/workflow/variable-resolver";

interface ExpressionInputProps {
  value: string;
  onChange: (value: string) => void;
  nodeId: string;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}

export function ExpressionInput({
  value,
  onChange,
  nodeId,
  placeholder,
  multiline = false,
  className = "",
}: ExpressionInputProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleVariableSelect = (variablePath: string) => {
    if (inputRef.current) {
      const start = cursorPosition ?? value.length;
      const newValue =
        value.slice(0, start) + variablePath + value.slice(start);
      onChange(newValue);

      // Move cursor after inserted variable
      setTimeout(() => {
        if (inputRef.current) {
          const newPosition = start + variablePath.length;
          inputRef.current.setSelectionRange(newPosition, newPosition);
          inputRef.current.focus();
        }
      }, 0);
    } else {
      onChange(value + variablePath);
    }
    setShowPicker(false);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    onChange(e.target.value);
  };

  const handleFocus = () => {
    if (inputRef.current) {
      setCursorPosition(inputRef.current.selectionStart);
    }
  };

  const handleClick = () => {
    if (inputRef.current) {
      setCursorPosition(inputRef.current.selectionStart);
    }
  };

  const handleKeyUp = () => {
    if (inputRef.current) {
      setCursorPosition(inputRef.current.selectionStart);
    }
  };

  // Check if value contains variables for styling
  const containsVariables = hasVariables(value);

  const inputClassName = `
    w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
    focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent
    placeholder:text-gray-400 pr-8
    ${containsVariables ? "text-accent font-medium" : ""}
    ${className}
  `;

  return (
    <div className="relative">
      {/* Input field */}
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onClick={handleClick}
          onKeyUp={handleKeyUp}
          placeholder={placeholder}
          rows={4}
          className={`${inputClassName} resize-none`}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onClick={handleClick}
          onKeyUp={handleKeyUp}
          placeholder={placeholder}
          className={inputClassName}
        />
      )}

      {/* Variable picker toggle button */}
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className={`
          absolute right-1.5 top-1.5 p-1 rounded transition-colors
          ${showPicker ? "bg-accent text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}
        `}
        title="Insert variable"
      >
        <Database size={12} />
      </button>

      {/* Variable picker dropdown */}
      {showPicker && (
        <div ref={pickerRef} className="absolute right-0 top-full mt-1 z-50">
          <VariablePicker
            nodeId={nodeId}
            onSelect={handleVariableSelect}
            onClose={() => setShowPicker(false)}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Simple wrapper for textarea with expression support
 */
export function ExpressionTextarea(props: ExpressionInputProps) {
  return <ExpressionInput {...props} multiline />;
}
