import React, { useMemo } from 'react';
import { Box, Link } from '@chakra-ui/react';
import ReactMarkdown from 'react-markdown';
import RemarkGfm from 'remark-gfm';
import RemarkMath from 'remark-math';
import RehypeKatex from 'rehype-katex';
import RemarkBreaks from 'remark-breaks';
import { EventNameEnum, eventBus } from '@/web/common/utils/eventbus';
import { useContextSelector } from 'use-context-selector';
import { ChatRecordContext } from '@/web/core/chat/context/chatRecordContext';
import { ChatBoxContext } from '@/components/core/chat/ChatContainer/ChatBox/Provider';
import { checkIsInteractiveByHistories } from '@/components/core/chat/ChatContainer/ChatBox/utils';
import { VariableInputEnum } from '@/global/core/workflow/constants';

import 'katex/dist/katex.min.css';
import styles from '../index.module.scss';
import Image from '../img/Image';

// function MyLink(e: any) {
//   const href = e.href;
//   const text = String(e.children);

//   return !!href ? (
//     <Link href={href} target={'_blank'}>
//       {text}
//     </Link>
//   ) : (
//     <Box as={'li'} mb={1}>
//       <Box
//         as={'span'}
//         color={'primary.700'}
//         textDecoration={'underline'}
//         cursor={'pointer'}
//         onClick={() => {
//           eventBus.emit(EventNameEnum.sendQuestion, { text });
//         }}
//       >
//         {text}
//       </Box>
//     </Box>
//   );
// }

function MyLink(e: any) {
  const href = e.href;
  const text = String(e.children);

  // 根据最近一条 AI 消息是否进入交互态，近似判断 ChatInput 是否显示（显示则可点击）
  const chatRecords = useContextSelector(ChatRecordContext, (v) => v.chatRecords);
  const isInteractive = useMemo(
    () => checkIsInteractiveByHistories(chatRecords as any),
    [chatRecords]
  );

  // 计算与 ChatInput 相同的 chatStarted 逻辑
  const variableList = useContextSelector(ChatBoxContext, (v) => v.variableList);
  const allVariableList = useContextSelector(ChatBoxContext, (v) => v.allVariableList);
  const chatType = useContextSelector(ChatBoxContext, (v) => v.chatType);
  const chatStartedWatch = useContextSelector(ChatBoxContext, (v) => v.chatStartedWatch);
  const hideVariableInput = useContextSelector(ChatBoxContext, (v) => v.hideVariableInput);
  const externalVariableList = useMemo(() => {
    if (chatType === 'chat') {
      return allVariableList.filter((item) => item.type === VariableInputEnum.custom);
    }
    return [] as typeof allVariableList;
  }, [allVariableList, chatType]);

  // 与 ChatBox 保持完全一致的 chatStarted 计算逻辑
  const chatStarted = useMemo(() => {
    return (
      chatStartedWatch ||
      chatRecords.length > 0 ||
      hideVariableInput ||
      [...(variableList || []), ...externalVariableList].length === 0
    );
  }, [chatStartedWatch, chatRecords.length, hideVariableInput, variableList, externalVariableList]);

  const canClick = chatStarted && !isInteractive;

  return !!href ? (
    <Link href={href} target={'_blank'}>
      {text}
    </Link>
  ) : (
    <Box as={'li'} mb={1}>
      <Box
        as={'span'}
        color={canClick ? 'primary.700' : 'gray.400'}
        textDecoration={canClick ? 'underline' : 'none'}
        cursor={canClick ? 'pointer' : 'default'}
        onClick={
          canClick
            ? () => {
                eventBus.emit(EventNameEnum.sendQuestion, { text });
              }
            : undefined
        }
      >
        {text}
      </Box>
    </Box>
  );
}

const Guide = ({ text }: { text: string }) => {
  // 拆分为：开头普通文字 + 后续可点击项（以 [xxx] 形式）
  const { headerText, listText } = useMemo(() => {
    const lines = text.split('\n');
    const firstListIdx = lines.findIndex((l) => /\[[^\]]+\]/.test(l));
    if (firstListIdx === -1) {
      return { headerText: text, listText: '' };
    }
    return {
      headerText: lines.slice(0, firstListIdx).join('\n'),
      listText: lines.slice(firstListIdx).join('\n')
    };
  }, [text]);

  const formattedList = useMemo(
    () => listText.replace(/\[(.*?)\]($|\n)/g, '[$1]()').replace(/\\n/g, '\n&nbsp;'),
    [listText]
  );

  const formattedHeader = useMemo(() => headerText.replace(/\\n/g, '\n\n'), [headerText]);

  return (
    <>
      {formattedHeader && (
        <ReactMarkdown
          className={`markdown ${styles.markdown}`}
          remarkPlugins={[RemarkGfm, RemarkMath, RemarkBreaks]}
          rehypePlugins={[RehypeKatex]}
          components={{ p: 'div', img: Image }}
        >
          {formattedHeader}
        </ReactMarkdown>
      )}

      {formattedList && (
        <Box as={'ul'} pl={6} style={{ listStyleType: 'disc', listStylePosition: 'outside' }}>
          <ReactMarkdown
            className={`markdown ${styles.markdown}`}
            remarkPlugins={[RemarkGfm, RemarkMath, RemarkBreaks]}
            rehypePlugins={[RehypeKatex]}
            components={{ a: MyLink, p: 'div', img: Image }}
          >
            {formattedList}
          </ReactMarkdown>
        </Box>
      )}
    </>
  );
};

export default React.memo(Guide);
