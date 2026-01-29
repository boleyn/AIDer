import { ThreadPrimitive } from "@assistant-ui/react";

type ChatMessagesSectionProps = {
  components: Parameters<typeof ThreadPrimitive.Messages>[0]["components"];
};

const ChatMessagesSection = ({ components }: ChatMessagesSectionProps) => (
  <ThreadPrimitive.Viewport className="assistant-viewport" autoScroll>
    <ThreadPrimitive.Messages components={components} />
  </ThreadPrimitive.Viewport>
);

export default ChatMessagesSection;
