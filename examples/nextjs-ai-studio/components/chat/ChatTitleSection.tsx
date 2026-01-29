import ChatHeader from "./ChatHeader";

type ChatTitleSectionProps = {
  onReset: () => void;
};

const ChatTitleSection = ({ onReset }: ChatTitleSectionProps) => {
  return <ChatHeader onReset={onReset} />;
};

export default ChatTitleSection;
