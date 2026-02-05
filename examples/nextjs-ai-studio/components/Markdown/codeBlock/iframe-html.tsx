import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  Box,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalHeader,
  useDisclosure,
  ModalCloseButton
} from '@chakra-ui/react';
import Icon from '@/components/common/MyIcon';
import { useCopyData } from '@/hooks/useCopyData';
import { useTranslation } from 'next-i18next';
import { useMarkdownWidth } from '../hooks';
import type { IconNameType } from '@/components/common/MyIcon';
import { codeLight } from './CodeLight';
import MyTooltip from '@/components/common/MyTooltip';

const StyledButton = ({
  label,
  iconName,
  onClick,
  isActive,
  viewMode,
  isMobile
}: {
  label: string;
  iconName: IconNameType;
  onClick: () => void;
  isActive?: boolean;
  viewMode: 'source' | 'iframe';
  isMobile?: boolean;
}) => {
  const isPreview = viewMode === 'iframe';

  const textColor = isPreview
    ? isActive
      ? 'myGray.900'
      : 'myGray.500'
    : isActive
      ? '#FFF'
      : 'rgba(255, 255, 255, 0.8)';
  const bg = isPreview ? (isActive ? 'myGray.150' : '') : isActive ? '#333A47' : '';
  const hoverBg = isPreview ? 'myGray.150' : '#333A47';

  return (
    <Flex
      bg={bg}
      color={textColor}
      borderRadius="5px"
      boxShadow="none"
      fontWeight={isActive ? 500 : 400}
      _hover={{
        bg: hoverBg
      }}
      alignItems="center"
      justifyContent="center"
      onClick={onClick}
      cursor="pointer"
      px={isMobile ? '6px' : '8px'}
      h={isMobile ? '24px' : '28px'}
    >
      {isMobile ? (
        <MyTooltip label={label} placement="bottom" hasArrow>
          <Flex alignItems="center" justifyContent="center">
            <Icon name={iconName} width="14px" height="14px" />
          </Flex>
        </MyTooltip>
      ) : (
        <Flex alignItems="center" justifyContent="flex-start">
          <Icon name={iconName} width="14px" height="14px" />
          <Box ml={2} fontSize="sm">
            {label}
          </Box>
        </Flex>
      )}
    </Flex>
  );
};

const IframeHtmlCodeBlock = ({
  children,
  className,
  codeBlock,
  match,
  showAnimation,
  dataId
}: {
  children: React.ReactNode & React.ReactNode[];
  className?: string;
  codeBlock?: boolean;
  match: RegExpExecArray | null;
  showAnimation?: boolean;
  dataId?: string;
}) => {
  const { t } = useTranslation();
  const { copyData } = useCopyData();
  const [viewMode, setViewMode] = useState<'source' | 'iframe'>('source');
  const isPreview = viewMode === 'iframe';
  const hasAutoSwitchedRef = useRef(false); // 标记是否已经自动切换过
  const timeoutRef = useRef<NodeJS.Timeout | null>(null); // 延迟切换的定时器
  const viewModeRef = useRef(viewMode); // 使用 ref 存储 viewMode 的当前值
  const stableContentRef = useRef<string>(''); // 保存稳定的内容，避免流式输出时的抖动

  const { isOpen, onOpen, onClose } = useDisclosure();

  // 使用动态宽度计算，设置代码块的最小宽度
  const { width, Ref } = useMarkdownWidth({
    minWidth: { base: 320, md: 500 }
  });
  const isMobile = width <= 420;

  const childrenStr = String(children);

  // 同步 viewMode 到 ref
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  // 当流式输出完成时，更新稳定内容引用
  useEffect(() => {
    // 如果流式输出已完成，更新稳定内容
    if (showAnimation === false) {
      stableContentRef.current = childrenStr;
    }
    // 如果正在流式输出且稳定内容为空，初始化稳定内容（避免首次渲染时为空）
    else if (showAnimation === true && !stableContentRef.current && childrenStr) {
      stableContentRef.current = childrenStr;
    }
    // 如果正在流式输出，保持稳定内容不变（避免抖动）
  }, [showAnimation, childrenStr]);

  // 监听流式输出完成，自动切换到预览模式
  useEffect(() => {
    // 如果已经自动切换过，不再重复切换
    if (hasAutoSwitchedRef.current) {
      return;
    }

    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // 当流式输出完成（showAnimation 变为 false）且当前是源码模式时，延迟切换
    // 使用 ref 来读取 viewMode，避免将其加入依赖数组
    if (showAnimation === false && viewModeRef.current === 'source') {
      // 延迟 500ms 后切换，确保内容已经稳定
      timeoutRef.current = setTimeout(() => {
        setViewMode('iframe');
        hasAutoSwitchedRef.current = true;
      }, 500);
    }

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [showAnimation]); // 只依赖 showAnimation，避免无限循环

  const codeBoxName = useMemo(() => {
    const input = match?.['input'] || '';
    if (!input) return match?.[1]?.toUpperCase();

    const splitInput = input.split('#');
    return splitInput[1] || match?.[1]?.toUpperCase();
  }, [match]);

  // 使用稳定的内容来渲染 iframe，避免流式输出时的抖动
  // 如果流式输出已完成，使用最新内容；如果正在流式输出，使用稳定内容
  const iframeContent = useMemo(() => {
    // 如果流式输出已完成，使用最新内容
    if (showAnimation === false) {
      return childrenStr;
    }
    // 如果正在流式输出，使用稳定内容（避免频繁更新导致抖动）
    return stableContentRef.current || childrenStr;
  }, [showAnimation, childrenStr]);

  const Iframe = useMemo(
    () => (
      <iframe
        srcDoc={iframeContent}
        sandbox="allow-scripts allow-forms allow-popups allow-downloads allow-presentation allow-storage-access-by-user-activation"
        referrerPolicy="no-referrer"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          background: 'white'
        }}
      />
    ),
    [iframeContent]
  );

  if (codeBlock) {
    return (
      <Box
        ref={Ref}
        my={3}
        borderRadius={'md'}
        overflow={'hidden'}
        boxShadow={
          '0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)'
        }
        maxW={'100%'}
        w={width}
      >
        <Flex
          py={2}
          px={4}
          color={'white'}
          userSelect={'none'}
          alignItems="center"
          fontSize={'sm'}
          gap={1.5}
          {...(isPreview
            ? {
                borderBottom: '1px solid',
                borderColor: 'gray.150',
                bg: 'myGray.25'
              }
            : {
                bg: 'myGray.800'
              })}
        >
          <Box
            flex={1}
            display="flex"
            alignItems="center"
            color={isPreview ? 'myGray.800' : 'rgba(255, 255, 255, 0.9)'}
          >
            {codeBoxName}
            <Flex
              cursor="pointer"
              onClick={() => copyData(String(children))}
              alignItems="center"
              ml={2}
            >
              <Icon name="copy" width="14px" />
            </Flex>
          </Box>
          <StyledButton
            label={t('common:Code')}
            iconName="code"
            onClick={() => setViewMode('source')}
            isActive={viewMode === 'source'}
            viewMode={viewMode}
            isMobile={isMobile}
          />
          <StyledButton
            label={t('common:Preview')}
            iconName="preview"
            onClick={() => setViewMode('iframe')}
            isActive={viewMode === 'iframe'}
            viewMode={viewMode}
            isMobile={isMobile}
          />
          <StyledButton
            label={t('common:FullScreen')}
            iconName="fullScreen"
            onClick={onOpen}
            viewMode={viewMode}
            isMobile={isMobile}
          />
        </Flex>
        {isPreview ? (
          <Box w={width} maxW={'100%'} h="60vh">
            {Iframe}
          </Box>
        ) : (
          <Box overflow={'auto'} maxW={'100%'}>
            <SyntaxHighlighter
              style={codeLight as any}
              language={match?.[1]}
              PreTag="pre"
              customStyle={{
                margin: 0,
                padding: '1rem',
                background: 'transparent',
                maxWidth: '100%',
                overflow: 'auto'
              }}
              codeTagProps={{
                style: {
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }
              }}
            >
              {String(children).replace(/&nbsp;/g, ' ')}
            </SyntaxHighlighter>
          </Box>
        )}

        {isOpen && (
          <Modal onClose={onClose} isOpen size={'full'}>
            <ModalOverlay />
            <ModalContent h={'100vh'} display={'flex'} flexDirection={'column'}>
              <ModalHeader
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                p={4}
                bg="white"
                borderBottom="1px solid"
                borderColor="gray.300"
                height="60px"
              >
                <Box fontSize="lg" color="myGray.900">
                  {t('common:FullScreenLight')}
                </Box>
                <ModalCloseButton zIndex={1} position={'relative'} top={0} right={0} />
              </ModalHeader>

              <ModalBody p={0} flex="1">
                {Iframe}
              </ModalBody>
            </ModalContent>
          </Modal>
        )}
      </Box>
    );
  }

  return <code className={className}>{children}</code>;
};

// 使用自定义比较函数，参考 PlantUML 的处理方式，避免流式输出时的抖动
export default React.memo(IframeHtmlCodeBlock, (prevProps, nextProps) => {
  // 如果 dataId 不同，必须重新渲染（不同的代码块）
  if ((prevProps as any).dataId !== (nextProps as any).dataId) {
    return false;
  }

  // 如果 showAnimation 状态不同，需要重新渲染（流式输出完成时）
  if (prevProps.showAnimation !== nextProps.showAnimation) {
    return false;
  }

  // 如果流式输出已完成（showAnimation 为 false），比较 children 内容
  // 只有内容真正变化时才重新渲染
  if (prevProps.showAnimation === false && nextProps.showAnimation === false) {
    const prevChildrenStr = String(prevProps.children);
    const nextChildrenStr = String(nextProps.children);
    if (prevChildrenStr !== nextChildrenStr) {
      return false; // 内容变化，需要重新渲染
    }
  }

  // 如果正在流式输出（showAnimation 为 true），不重新渲染（避免抖动）
  // 这样可以保持稳定的显示，直到流式输出完成
  if (prevProps.showAnimation === true || nextProps.showAnimation === true) {
    // 流式输出过程中，仅在 showAnimation 状态变化时渲染
    // 这里已经在上面的条件中处理了
    return true; // 流式输出过程中，内容变化不触发重新渲染
  }

  // 其他 props 的浅比较
  return (
    prevProps.className === nextProps.className &&
    prevProps.codeBlock === nextProps.codeBlock &&
    prevProps.match === nextProps.match
  );
});
