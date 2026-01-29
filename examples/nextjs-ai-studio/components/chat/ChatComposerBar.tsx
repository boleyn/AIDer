import { ComposerPrimitive } from "@assistant-ui/react";

const ChatComposerBar = () => (
  <div className="assistant-footer">
    <ComposerPrimitive.Root className="assistant-composer">
      <ComposerPrimitive.Input
        className="assistant-input"
        placeholder="描述你想改的地方，或直接提出需求..."
      />
      <ComposerPrimitive.Send className="assistant-send">发送</ComposerPrimitive.Send>
    </ComposerPrimitive.Root>
  </div>
);

export default ChatComposerBar;
