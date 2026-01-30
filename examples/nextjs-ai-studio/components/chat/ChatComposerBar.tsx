import { ComposerPrimitive, useAssistantApi, useAssistantState } from "@assistant-ui/react";

const ChatComposerBar = () => {
  const api = useAssistantApi();
  const isRunning = useAssistantState(({ thread }) => thread.isRunning);
  const text = useAssistantState(({ composer }) => composer.text);
  const canSend = text.trim().length > 0 && !isRunning;

  return (
    <div className="assistant-footer">
      <ComposerPrimitive.Root className="assistant-composer">
        <ComposerPrimitive.Input
          className="assistant-input"
          placeholder={isRunning ? "正在生成回复..." : "描述你想改的地方，或直接提出需求..."}
          disabled={isRunning}
        />
        <ComposerPrimitive.Send className="assistant-send" disabled={!canSend}>
          发送
        </ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
      <button
        className="assistant-quick-action"
        type="button"
        onClick={() => api.composer().setText("请解释一下刚刚的修改思路，并给出下一步建议。")}
        disabled={isRunning}
      >
        一键追问
      </button>
    </div>
  );
};

export default ChatComposerBar;
