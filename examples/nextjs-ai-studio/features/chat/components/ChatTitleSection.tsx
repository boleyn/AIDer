import ChatHeader from "./ChatHeader";
import type { ConversationSummary } from "../../../types/conversation";

type ChatTitleSectionProps = {
  onReset: () => void;
  onNewConversation?: () => void;
  conversations?: ConversationSummary[];
  activeConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  title?: string;
};

const ChatTitleSection = ({
  onReset,
  onNewConversation,
  conversations,
  activeConversationId,
  onSelectConversation,
  title,
}: ChatTitleSectionProps) => {
  return (
    <ChatHeader
      onReset={onReset}
      onNewConversation={onNewConversation}
      conversations={conversations}
      activeConversationId={activeConversationId}
      onSelectConversation={onSelectConversation}
      title={title}
    />
  );
};

export default ChatTitleSection;
