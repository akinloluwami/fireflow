import { useState, useRef, useEffect } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };

  const avatarUrl =
    user.image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "User")}&background=random`;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center focus:outline-none"
      >
        <img
          src={avatarUrl}
          alt={user.name || "User"}
          className="w-8 h-8 rounded-full ring-2 ring-white hover:ring-gray-200 transition-all cursor-pointer"
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <img
                src={avatarUrl}
                alt={user.name || "User"}
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user.name || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="py-1">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <LogOut className="w-4 h-4 text-gray-400" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
