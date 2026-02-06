import React, { useCallback } from 'react';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import type { AIChatItemValueItemType } from '@/global/core/chat/type';
import MyIcon from '@/components/common/MyIcon';
import MyTag from '@/components/common/MyTag';
import { useTranslation } from 'next-i18next';
import { getParagraphDocument } from '@/web/core/chat/api';
import { useContextSelector } from 'use-context-selector';
import { ChatBoxContext } from '../../ChatContainer/ChatBox/Provider';
import { WorkflowRuntimeContext } from '../../ChatContainer/context/workflowRuntimeContext';
import { downloadDocumentAsDocx, getParagraphStatusConfig } from '@/utils/paragraphEditor';
import type { ParagraphStatus } from '@/utils/paragraphEditor';

interface ParagraphCardProps {
  chatItemDataId: string;
  paragraph: NonNullable<AIChatItemValueItemType['paragraph']>;
  isLastResponseValue: boolean;
  isChatting: boolean;
  onOpenEditor: (dataId: string) => void;
}

const ParagraphCard = React.memo(function ParagraphCard({
  chatItemDataId,
  paragraph,
  isLastResponseValue,
  isChatting,
  onOpenEditor
}: ParagraphCardProps) {
  const { t } = useTranslation();
  const appId = useContextSelector(WorkflowRuntimeContext, (v) => v.appId);
  const chatId = useContextSelector(WorkflowRuntimeContext, (v) => v.chatId);
  const outLinkAuthData = useContextSelector(WorkflowRuntimeContext, (v) => v.outLinkAuthData);

  // 标题：来自段落的 outlineItem.title，兜底
  const title = paragraph?.outlineItem?.title || t('app:core.app.Document');
  const status = (paragraph?.status as ParagraphStatus) || 'completed';
  const statusConfig = getParagraphStatusConfig(status);

  // 进度信息
  const progress = paragraph?.progress;
  const currentTitle = paragraph?.currentTitle;

  const handleOpenEditor = useCallback(() => {
    // 段落文档的 chatItemDataId 存在于 paragraph.outlineItem.id
    const docChatItemDataId = paragraph?.outlineItem?.id || chatItemDataId;
    onOpenEditor(docChatItemDataId);
  }, [chatItemDataId, onOpenEditor, paragraph?.outlineItem?.id]);

  // 下载：从后端拉取 markdown 并转换为docx保存
  const handleDownload = useCallback(async () => {
    const docChatItemDataId = paragraph?.outlineItem?.id || chatItemDataId;
    try {
      const res: any = await getParagraphDocument({
        dataId: docChatItemDataId,
        appId,
        chatId,
        ...(outLinkAuthData || {})
      });
      const markdown = res?.markdown || '';

      // 使用工具函数下载文档
      await downloadDocumentAsDocx({
        markdown,
        title: title || 'document'
      });
    } catch (e) {
      console.error('Download paragraph failed', e);
    }
  }, [appId, chatId, outLinkAuthData, chatItemDataId, paragraph?.outlineItem?.id, title]);

  return (
    <Box
      border={'base'}
      borderRadius={'md'}
      bg={'white'}
      overflow={'hidden'}
      minW={'520px'}
      w={'100%'}
    >
      {/* 头部：icon + 标题 + 操作按钮（下载/编辑） */}
      <Flex
        align={'center'}
        justify={'space-between'}
        px={4}
        py={3}
        bg={'myGray.50'}
        cursor={'pointer'}
        onClick={handleOpenEditor}
        _hover={{ bg: 'myGray.100' }}
        transition={'all 0.2s'}
      >
        <Flex align={'center'} gap={3} color={'myGray.700'}>
          <MyIcon name={'core/workflow/template/longTextParagraph'} w={'16px'} />
          <Box fontWeight={'700'} fontSize={'md'}>
            {title}
          </Box>
          <MyTag
            colorSchema={
              statusConfig.color === 'blue'
                ? 'blue'
                : statusConfig.color === 'green'
                  ? 'green'
                  : statusConfig.color === 'red'
                    ? 'red'
                    : statusConfig.color === 'yellow'
                      ? 'yellow'
                      : 'gray'
            }
            type={'fill'}
          >
            {t(`app:${statusConfig.text}` as any)}
          </MyTag>
        </Flex>
        <Flex align={'center'} gap={2}>
          <Button
            size={'xs'}
            variant={'ghost'}
            borderRadius={'sm'}
            h={'28px'}
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            isDisabled={status === 'generating'}
          >
            <MyIcon name={'save'} w={'12px'} />
            <Box ml={1}>{t('app:core.app.Download')}</Box>
          </Button>
          <Button
            size={'xs'}
            colorScheme={'blue'}
            variant={'solid'}
            borderRadius={'sm'}
            h={'28px'}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEditor();
            }}
            isDisabled={status === 'generating'}
          >
            <MyIcon name={'edit'} w={'12px'} />
            <Box ml={1}>{t('app:core.app.Edit')}</Box>
          </Button>
        </Flex>
      </Flex>

      {/* 进度显示区域 */}
      {status === 'generating' && progress && (
        <Box px={4} py={3} bg={'myGray.25'} borderTop={'1px solid'} borderColor={'myGray.100'}>
          <Flex align={'center'} gap={3} mb={2}>
            <MyIcon name={'common/loading'} w={'14px'} color={'blue.500'} />
            <Text fontSize={'sm'} color={'myGray.600'}>
              {t('app:core.app.Generating')} ({progress.current}/{progress.total})
            </Text>
          </Flex>

          <Box w={'100%'} h={'6px'} bg={'myGray.100'} borderRadius={'sm'} overflow={'hidden'}>
            <Box
              w={`${(progress.current / progress.total) * 100}%`}
              h={'100%'}
              bg={'primary.500'}
              borderRadius={'sm'}
              transition={'width 0.3s ease'}
            />
          </Box>

          {currentTitle && (
            <Text fontSize={'xs'} color={'myGray.500'} mt={2} noOfLines={1}>
              {t('app:core.app.Current')}: {currentTitle}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
});

export default ParagraphCard;
