import { useState, useRef, useEffect } from "react";
import { Database } from "lucide-react";
import { VariablePicker } from "./VariablePicker";
import { useWorkflowStore } from "@/lib/workflow/store";
import type { CredentialType } from "@/lib/credentials/types";

interface ExpressionInputProps {
  value: string;
  onChange: (value: string) => void;
  nodeId: string;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  /** Optional: filter credentials in picker to specific types */
  credentialTypes?: CredentialType[];
  /** Optional: show/hide credentials in picker (default: true) */
  showCredentials?: boolean;
}

/**
 * Convert a variable path with node UUID to a friendly display name
 * e.g., "{{ nodes.abc-123.output.status }}" -> "{{ HTTP Request.status }}"
 * e.g., "{{ credentials.abc-123.url }}" -> "{{ API Token.url }}"
 */
function getFriendlyVariablePath(
  path: string,
  nodeMap: Map<string, string>,
  credentialMap: Map<string, string>,
): string {
  // Match nodes.UUID.output.xxx pattern
  const nodeMatch = path.match(/nodes\.([a-f0-9-]+)\.output\.(.+)/);
  if (nodeMatch) {
    const [, nodeId, restPath] = nodeMatch;
    const nodeName = nodeMap.get(nodeId) || "Unknown Node";
    return `${nodeName}.${restPath}`;
  }

  // Match credentials.UUID.field pattern
  const credMatch = path.match(/credentials\.([a-f0-9-]+)\.(.+)/);
  if (credMatch) {
    const [, credId, field] = credMatch;
    const credName = credentialMap.get(credId) || "Credential";
    return `${credName}.${field}`;
  }

  // For trigger, loop, etc., just show as-is but cleaner
  return path;
}

function HighlightedText({
  text,
  nodeMap,
  credentialMap,
}: {
  text: string;
  nodeMap: Map<string, string>;
  credentialMap: Map<string, string>;
}) {
  const VARIABLE_REGEX = /(\{\{[^}]+\}\})/g;
  const parts = text.split(VARIABLE_REGEX);

  return (
    <>
      {parts.map((part, i) => {
        if (part.match(VARIABLE_REGEX)) {
          // Extract the inner path (without {{ }})
          const innerPath = part.replace(/\{\{\s*|\s*\}\}/g, "");
          const friendlyPath = getFriendlyVariablePath(
            innerPath,
            nodeMap,
            credentialMap,
          );

          return (
            <span
              key={i}
              className="bg-accent/15 text-accent font-medium px-0.5 rounded"
              title={part} // Show original path on hover
            >
              {"{{ "}
              {friendlyPath}
              {" }}"}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function ExpressionInput({
  value,
  onChange,
  nodeId,
  placeholder,
  multiline = false,
  className = "",
  credentialTypes,
  showCredentials = true,
}: ExpressionInputProps) {
  const { workflow } = useWorkflowStore();
  const [showPicker, setShowPicker] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [credentialMap, setCredentialMap] = useState<Map<string, string>>(
    new Map(),
  );
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Build a map of node IDs to their labels for friendly display
  const nodeMap = new Map<string, string>();
  for (const node of workflow.nodes) {
    nodeMap.set(node.id, node.data.label || node.subType);
  }

  // Fetch credentials to build name map for display
  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        const res = await fetch("/api/credentials");
        if (res.ok) {
          const data = await res.json();
          const map = new Map<string, string>();
          for (const cred of data) {
            map.set(cred.id, cred.name);
          }
          setCredentialMap(map);
        }
      } catch (error) {
        console.error("Failed to fetch credentials:", error);
      }
    };
    fetchCredentials();
  }, []);

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
    setIsFocused(true);
    if (inputRef.current) {
      setCursorPosition(inputRef.current.selectionStart);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
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

  const baseClassName = `
    w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md
    focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent
    placeholder:text-gray-400 pr-8
    ${className}
  `;

  return (
    <div className="relative">
      {/* Highlighted overlay (only when not focused) */}
      {!isFocused && value && (
        <div
          onClick={() => inputRef.current?.focus()}
          className={`
            absolute inset-0 px-2.5 py-1.5 text-xs cursor-text
            bg-white border border-gray-200 rounded-md overflow-hidden
            ${multiline ? "whitespace-pre-wrap" : "whitespace-nowrap truncate"}
            pr-8
          `}
          style={{ lineHeight: multiline ? "1.5" : "1.5rem" }}
        >
          <HighlightedText
            text={value}
            nodeMap={nodeMap}
            credentialMap={credentialMap}
          />
        </div>
      )}

      {/* Input field - visible when focused or empty */}
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onClick={handleClick}
          onKeyUp={handleKeyUp}
          placeholder={placeholder}
          rows={4}
          className={`${baseClassName} resize-none bg-white ${!isFocused && value ? "opacity-0" : "opacity-100"}`}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onClick={handleClick}
          onKeyUp={handleKeyUp}
          placeholder={placeholder}
          className={`${baseClassName} bg-white ${!isFocused && value ? "opacity-0" : "opacity-100"}`}
        />
      )}

      {/* Variable picker toggle button */}
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className={`
          absolute right-1.5 top-1.5 p-1 rounded transition-colors z-10
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
            credentialTypes={credentialTypes}
            showCredentials={showCredentials}
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
