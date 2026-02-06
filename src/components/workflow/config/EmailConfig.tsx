import { ExpressionInput } from "./ExpressionInput";
import { ExpressionTextarea } from "./ExpressionInput";

interface EmailConfigProps {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  nodeId: string;
}

export function EmailConfig({ config, onChange, nodeId }: EmailConfigProps) {
  return (
    <div className="space-y-4">
      {/* To */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          To
        </label>
        <ExpressionInput
          value={(config.to as string) || ""}
          onChange={(value) => onChange("to", value)}
          nodeId={nodeId}
          placeholder="recipient@example.com"
        />
        <p className="text-[10px] text-gray-400 mt-1">
          Use {"{{ trigger.email }}"} for dynamic recipients
        </p>
      </div>

      {/* CC (optional) */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          CC <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <ExpressionInput
          value={(config.cc as string) || ""}
          onChange={(value) => onChange("cc", value)}
          nodeId={nodeId}
          placeholder="cc@example.com"
        />
      </div>

      {/* BCC (optional) */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          BCC <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <ExpressionInput
          value={(config.bcc as string) || ""}
          onChange={(value) => onChange("bcc", value)}
          nodeId={nodeId}
          placeholder="bcc@example.com"
        />
      </div>

      {/* Subject */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Subject
        </label>
        <ExpressionInput
          value={(config.subject as string) || ""}
          onChange={(value) => onChange("subject", value)}
          nodeId={nodeId}
          placeholder="Order Confirmation #{{ trigger.orderId }}"
        />
      </div>

      {/* Body */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Body
        </label>
        <ExpressionTextarea
          value={(config.body as string) || ""}
          onChange={(value) => onChange("body", value)}
          nodeId={nodeId}
          placeholder="Hello {{ trigger.name }},

Thank you for your order!

Order Details:
- Order ID: {{ trigger.orderId }}
- Total: ${{ trigger.total }}

Best regards,
The Team"
        />
        <p className="text-[10px] text-gray-400 mt-1">
          Plain text or HTML supported
        </p>
      </div>

      {/* From Name (optional) */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          From Name{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={(config.fromName as string) || ""}
          onChange={(e) => onChange("fromName", e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                     focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent
                     placeholder:text-gray-400"
          placeholder="My Company"
        />
      </div>

      {/* Reply To (optional) */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Reply To <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="email"
          value={(config.replyTo as string) || ""}
          onChange={(e) => onChange("replyTo", e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                     focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent
                     placeholder:text-gray-400"
          placeholder="support@example.com"
        />
      </div>
    </div>
  );
}
