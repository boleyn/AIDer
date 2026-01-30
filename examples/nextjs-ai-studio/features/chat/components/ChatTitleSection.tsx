import ChatHeader from "./ChatHeader";
import type { ConversationSummary } from "../../../types/conversation";

type ChatTitleSectionProps = {
  onReset: () => void;
  onNewConversation?: () => void;
  conversations?: ConversationSummary[];
  activeConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  onDeleteAllConversations?: () => void;
  title?: string;
};

const ChatTitleSection = ({
  onReset,
  onNewConversation,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onDeleteAllConversations,
  title,
}: ChatTitleSectionProps) => {
  return (
    <ChatHeader
      onReset={onReset}
      onNewConversation={onNewConversation}
      conversations={conversations}
      activeConversationId={activeConversationId}
      onSelectConversation={onSelectConversation}
      onDeleteConversation={onDeleteConversation}
      onDeleteAllConversations={onDeleteAllConversations}
      title={title}
    />
  );
};

export default ChatTitleSection;
