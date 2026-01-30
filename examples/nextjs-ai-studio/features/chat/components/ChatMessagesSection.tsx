import { ThreadPrimitive } from "@assistant-ui/react";

type ChatMessagesSectionProps = {
  components: Parameters<typeof ThreadPrimitive.Messages>[0]["components"];
};

const ChatMessagesSection = ({ components }: ChatMessagesSectionProps) => (
  <ThreadPrimitive.Viewport className="assistant-viewport" autoScroll>
    <ThreadPrimitive.Empty>
      <div className="assistant-empty">
        <h3>从一个清晰需求开始</h3>
        <p>描述想要的功能、范围和约束，我会给出可执行的修改方案。</p>
        <div className="assistant-suggestions">
          <ThreadPrimitive.Suggestion prompt="帮我梳理当前项目的主要模块与依赖" send>
            梳理项目结构
          </ThreadPrimitive.Suggestion>
          <ThreadPrimitive.Suggestion prompt="请优化当前聊天 UI 的交互体验" send>
            优化聊天体验
          </ThreadPrimitive.Suggestion>
        </div>
      </div>
    </ThreadPrimitive.Empty>
    <ThreadPrimitive.Messages components={components} />
  </ThreadPrimitive.Viewport>
);

export default ChatMessagesSection;
