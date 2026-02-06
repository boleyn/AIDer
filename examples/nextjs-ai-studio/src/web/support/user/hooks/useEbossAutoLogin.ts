import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { ebossLogin } from '../api';
import { setToken, getToken, removeToken, isTokenExpired } from '../token';
import type { LoginSuccessResponse } from '@/global/support/api/userRes.d';

/**
 * 自定义 Hook：处理 eboss 自动登录
 *
 * 使用方式：
 * ```tsx
 * useEbossAutoLogin();
 * ```
 *
 * 功能：
 * - 检测 URL 中的 blade-auth 和 authorization 参数
 * - 如果用户已登录（有有效 token），跳过处理
 * - 如果未登录且有 eboss 参数，执行自动登录
 * - 登录成功后只保存 token 到 localStorage，不保存 userInfo（避免超出配额）
 * - 目标页面会通过 Layout/auth.tsx 自动调用 initUserInfo() 获取用户信息
 */
type UseEbossAutoLoginOptions = {
  onSuccess?: (data: LoginSuccessResponse | null) => void;
  onError?: (error: unknown) => void;
};

export const useEbossAutoLogin = (options?: UseEbossAutoLoginOptions) => {
  const router = useRouter();
  const processingRef = useRef(false);
  const onSuccess = options?.onSuccess;
  const onError = options?.onError;

  useEffect(() => {
    // 等待路由准备就绪
    if (!router.isReady) return;

    // 允许使用 token query 作为 blade-auth/authorization 的兜底（兼容只传 token 的场景）
    const tokenParam = router.query['token'];
    const normalizedToken = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
    const bladeAuthQuery = router.query['blade-auth'];
    const authorizationQuery = router.query.authorization;
    const bladeAuth =
      (Array.isArray(bladeAuthQuery) ? bladeAuthQuery[0] : bladeAuthQuery) || normalizedToken;
    const authorization =
      (Array.isArray(authorizationQuery) ? authorizationQuery[0] : authorizationQuery) ||
      normalizedToken;

    const token = getToken();
    const hasValidToken = !!token && !isTokenExpired(token);

    // 如果已有有效 token，跳过处理
    if (hasValidToken) {
      return;
    }

    // 如果 token 已过期，清除
    if (token && !hasValidToken) {
      removeToken();
    }

    // 如果没有 eboss 参数，跳过
    if (!bladeAuth || !authorization) return;

    if (processingRef.current) return;

    // 标记为已处理，防止重复执行
    processingRef.current = true;

    // 执行登录
    const handleLogin = async () => {
      try {
        const loginData = await ebossLogin({
          'blade-auth': typeof bladeAuth === 'string' ? bladeAuth : bladeAuth[0],
          authorization: typeof authorization === 'string' ? authorization : authorization[0]
        });

        // 只保存 JWT token 到本地，后续请求通过自定义头 token 携带
        // 不保存 userInfo（避免超出配额），目标页面会通过 initUserInfo() 自动获取
        if (loginData?.token) {
          setToken(loginData.token, { ignoreLogoutBlock: true });
        }

        onSuccess?.(loginData ?? null);
      } catch (e) {
        console.error('[EbossAutoLogin] 自动登录失败:', e);
        onError?.(e);
      } finally {
        processingRef.current = false;
      }
    };

    handleLogin();
  }, [router.isReady, router.query, onSuccess, onError]);
};
