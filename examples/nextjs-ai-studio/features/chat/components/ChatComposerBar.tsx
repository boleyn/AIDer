import { AttachmentPrimitive, ComposerPrimitive, useAssistantApi, useAssistantState } from "@assistant-ui/react";

const AttachmentItem = () => (
  <AttachmentPrimitive.Root className="assistant-attachment">
    <span className="assistant-attachment-name">
      <AttachmentPrimitive.Name />
    </span>
    <AttachmentPrimitive.Remove className="assistant-attachment-remove" aria-label="删除附件">
      ×
    </AttachmentPrimitive.Remove>
  </AttachmentPrimitive.Root>
);

const ChatComposerBar = () => {
  const api = useAssistantApi();
  const isRunning = useAssistantState(({ thread }) => thread.isRunning);
  const text = useAssistantState(({ composer }) => composer.text);
  const attachmentCount = useAssistantState(({ composer }) => composer.attachments.length);
  const canSend = (text.trim().length > 0 || attachmentCount > 0) && !isRunning;

  return (
    <div className="assistant-footer">
      <ComposerPrimitive.Root className="assistant-composer">
        <div className="assistant-composer-top">
          <ComposerPrimitive.AddAttachment className="assistant-attach">
            上传文件
          </ComposerPrimitive.AddAttachment>
          <div className="assistant-attachments">
            <ComposerPrimitive.Attachments components={{ Attachment: AttachmentItem }} />
          </div>
        </div>
        <div className="assistant-composer-row">
          <ComposerPrimitive.Input
            className="assistant-input"
            placeholder={isRunning ? "正在生成回复..." : "描述你想改的地方，或直接提出需求..."}
            disabled={isRunning}
          />
          <ComposerPrimitive.Send className="assistant-send" disabled={!canSend}>
            发送
          </ComposerPrimitive.Send>
        </div>
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
