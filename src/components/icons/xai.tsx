import type { SVGProps } from "react";

interface XAIIconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function XAIIcon({ size = 24, ...props }: XAIIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect
        width="1024"
        height="1024"
        rx="256"
        fill="currentColor"
        className="text-white"
      />
      <path
        d="M237.871 402.614L513.317 804.571H635.752L360.274 402.614H237.871ZM360.18 625.863L237.714 804.571H360.243L421.429 715.233L360.18 625.863ZM663.757 182.857L452.069 491.76L513.317 581.162L786.286 182.857H663.757ZM685.93 373.999V804.571H786.286V227.558L685.93 373.999Z"
        fill="currentColor"
        className="text-black"
      />
    </svg>
  );
}
