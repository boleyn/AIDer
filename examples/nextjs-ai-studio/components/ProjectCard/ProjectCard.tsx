import { useState, useRef } from "react";
import {
  Box,
  Card,
  CardBody,
  Flex,
  Heading,
  Text,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  FormControl,
  FormLabel,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import { PencilIcon, CloseIcon } from "../common/Icon";
import type { ProjectListItem } from "../../types/project";

type ProjectCardProps = {
  project: ProjectListItem;
  formatDate: (dateString: string) => string;
  onOpen: (token: string) => void;
  onRename: (token: string, name: string) => Promise<void>;
  onDelete: (token: string) => Promise<void>;
};

export function ProjectCard({
  project,
  formatDate,
  onOpen,
  onRename,
  onDelete,
}: ProjectCardProps) {
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const [renameValue, setRenameValue] = useState(project.name);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const {
    isOpen: isRenameOpen,
    onOpen: onRenameOpen,
    onClose: onRenameClose,
  } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-card-actions]")) return;
    onOpen(project.token);
  };

  const handleRenameOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameValue(project.name);
    onRenameOpen();
  };

  const handleRenameSubmit = async () => {
    const name = renameValue.trim();
    if (!name || name === project.name) {
      onRenameClose();
      return;
    }
    setRenaming(true);
    try {
      await onRename(project.token, name);
      onRenameClose();
    } finally {
      setRenaming(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await onDelete(project.token);
      onDeleteClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card
        role="group"
        cursor="pointer"
        borderRadius="2xl"
        border="1px solid rgba(255,255,255,0.7)"
        bg="rgba(255,255,255,0.8)"
        backdropFilter="blur(14px)"
        overflow="hidden"
        transition="all 0.2s ease"
        _hover={{
          borderColor: "rgba(255,255,255,0.9)",
          boxShadow: "0 18px 40px -18px rgba(15, 23, 42, 0.35)",
          transform: "translateY(-2px)",
        }}
        onClick={handleCardClick}
      >
        <CardBody p={5}>
          <Flex justify="space-between" align="flex-start" gap={3}>
            <Box flex={1} minW={0}>
              <Heading
                size="sm"
                color="myGray.800"
                noOfLines={2}
                mb={1.5}
                fontWeight="600"
              >
                {project.name}
              </Heading>
              <Flex align="center" gap={1.5} color="myGray.500">
                <Text fontSize="xs">更新于 {formatDate(project.updatedAt)}</Text>
              </Flex>
            </Box>
            <Flex
              data-card-actions
              align="center"
              gap={1}
              opacity={{ base: 1, _groupHover: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <IconButton
                aria-label="修改名字"
                variant="ghost"
                size="sm"
                borderRadius="md"
                color="myGray.500"
                _hover={{ bg: "myGray.100", color: "primary.600" }}
                icon={<Box as={PencilIcon} w={4} h={4} />}
                onClick={handleRenameOpen}
              />
              <IconButton
                aria-label="删除项目"
                variant="ghost"
                size="sm"
                borderRadius="md"
                color="myGray.500"
                _hover={{ bg: "red.50", color: "red.500" }}
                icon={<Box as={CloseIcon} w={4} h={4} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteOpen();
                }}
              />
            </Flex>
          </Flex>
        </CardBody>
      </Card>

      <Modal isOpen={isRenameOpen} onClose={onRenameClose} isCentered size="md">
        <ModalOverlay bg="blackAlpha.400" />
        <ModalContent
          borderRadius="xl"
          border="1px solid rgba(255,255,255,0.65)"
          bg="rgba(255,255,255,0.92)"
          backdropFilter="blur(18px)"
        >
          <ModalHeader color="myGray.800">修改项目名称</ModalHeader>
          <ModalBody>
            <FormControl>
              <FormLabel color="myGray.700">项目名称</FormLabel>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit()}
                placeholder="输入项目名称"
                autoFocus
              />
            </FormControl>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={onRenameClose}>
              取消
            </Button>
            <Button
              variant="whitePrimary"
              onClick={handleRenameSubmit}
              isLoading={renaming}
              isDisabled={!renameValue.trim() || renameValue.trim() === project.name}
            >
              保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        leastDestructiveRef={cancelDeleteRef}
        isCentered
      >
        <AlertDialogOverlay bg="blackAlpha.400">
          <AlertDialogContent
            borderRadius="xl"
            border="1px solid rgba(255,255,255,0.65)"
            bg="rgba(255,255,255,0.95)"
            backdropFilter="blur(18px)"
          >
            <AlertDialogHeader color="myGray.800">删除项目</AlertDialogHeader>
            <AlertDialogBody color="myGray.600">
              确定删除项目「{project.name}」吗？将同时删除该项目的所有对话记录和文件，此操作无法撤销。
            </AlertDialogBody>
            <AlertDialogFooter gap={2}>
              <Button ref={cancelDeleteRef} variant="ghost" onClick={onDeleteClose}>
                取消
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteConfirm}
                isLoading={deleting}
                loadingText="删除中..."
              >
                删除
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
