import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Text,
  Card,
  CardBody,
  Spinner,
  useToast,
} from "@chakra-ui/react";
import { withAuthHeaders } from "../utils/auth/client";

type ProjectListItem = {
  token: string;
  name: string;
  updatedAt: string;
};

const ProjectList = () => {
  const router = useRouter();
  const toast = useToast();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/projects", {
        headers: withAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("获取项目列表失败");
      }
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      toast({
        title: "加载失败",
        description: error instanceof Error ? error.message : "未知错误",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreateProject = async () => {
    try {
      setCreating(true);
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...withAuthHeaders(),
        },
      });

      if (!response.ok) {
        throw new Error("创建项目失败");
      }

      const project = await response.json();
      router.push(`/run/${project.token}`);
    } catch (error) {
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "未知错误",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setCreating(false);
    }
  };

  const handleProjectClick = (token: string) => {
    router.push(`/run/${token}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return "今天";
    } else if (days === 1) {
      return "昨天";
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" minH="400px">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <Box p={8} maxW="1200px" mx="auto" w="100%">
      <Flex justify="space-between" align="center" mb={8}>
        <Heading size="lg">我的项目</Heading>
        <Button
          colorScheme="blue"
          onClick={handleCreateProject}
          isLoading={creating}
          loadingText="创建中..."
        >
          创建新项目
        </Button>
      </Flex>

      {projects.length === 0 ? (
        <Card>
          <CardBody textAlign="center" py={12}>
            <Text fontSize="lg" color="gray.500" mb={4}>
              还没有项目
            </Text>
            <Button colorScheme="blue" onClick={handleCreateProject} isLoading={creating}>
              创建第一个项目
            </Button>
          </CardBody>
        </Card>
      ) : (
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={4}>
          {projects.map((project) => (
            <Card
              key={project.token}
              cursor="pointer"
              _hover={{
                boxShadow: "md",
                transform: "translateY(-2px)",
                transition: "all 0.2s",
              }}
              onClick={() => handleProjectClick(project.token)}
            >
              <CardBody>
                <Heading size="md" mb={2}>
                  {project.name}
                </Heading>
                <Text fontSize="sm" color="gray.500">
                  更新于 {formatDate(project.updatedAt)}
                </Text>
              </CardBody>
            </Card>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default ProjectList;
