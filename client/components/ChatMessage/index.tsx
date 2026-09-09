import { Message } from "@/hooks/useAI";
import { FaRobot, FaUser } from "react-icons/fa";

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
        }`}
      >
        {isUser ? <FaUser /> : <FaRobot />}
      </div>

      <div
        className={`rounded-lg px-4 py-2 max-w-[75%] whitespace-pre-wrap text-sm ${
          isUser ? "bg-blue-600 text-white" : "bg-white border text-gray-800"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}