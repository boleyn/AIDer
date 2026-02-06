import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';

const isIpHostname = (hostname: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname || '');

// 检测是否为移动端 Chrome 浏览器
const isMobileChrome = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  const userAgent = navigator.userAgent || '';
  // 检测 Chrome 且是移动设备（排除桌面端 Chrome）
  return /Chrome/i.test(userAgent) && /Mobile/i.test(userAgent) && !/iPad/i.test(userAgent);
};

const useUnauthorizedRedirect = (
  authStatus: 'pending' | 'authorized' | 'unauthorized'
): boolean => {
  const router = useRouter();
  const redirectingRef = useRef(false);
  const [hasTriggeredRedirect, setHasTriggeredRedirect] = useState(false);

  const normalizedPath = useMemo(() => {
    if (typeof window === 'undefined') {
      return router.asPath || '/';
    }
    const basePath = router.basePath || '';
    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (basePath && currentPath.startsWith(basePath)) {
      const stripped = currentPath.slice(basePath.length) || '/';
      return stripped.startsWith('/') ? stripped : `/${stripped}`;
    }
    return currentPath.startsWith('/') ? currentPath : `/${currentPath}`;
  }, [router.asPath, router.basePath]);

  useEffect(() => {
    // 通过 window 级别的标记（会在导航后重置）避免严格模式、HMR 等导致的二次挂载重复跳转
    const globalKey = '__fastgpt_auth_redirecting';

    // 检查是否已经在登录页面，避免重复跳转
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath.includes('/auth/feishu/login') || currentPath.includes('/login')) {
        return;
      }
    }

    const hasGlobalRedirect =
      typeof window !== 'undefined' ? Boolean((window as any)[globalKey]) : false;
    if (authStatus !== 'unauthorized' || !router.isReady || redirectingRef.current) return;
    if (hasGlobalRedirect) return;

    // 同步设置标记，确保在跳转前标记已生效
    redirectingRef.current = true;
    if (typeof window !== 'undefined') {
      (window as any)[globalKey] = true;
    }
    setHasTriggeredRedirect(true);

    const encodedLastRoute = encodeURIComponent(normalizedPath || '/');
    try {
      if (typeof window !== 'undefined' && normalizedPath) {
        sessionStorage.setItem('fastgpt:lastRoute', normalizedPath);
      }
    } catch {}
    const hostname = typeof window !== 'undefined' ? window.location.hostname || '' : '';
    const isIpAccess = isIpHostname(hostname);
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const basePath = router.basePath || '';

    if (isIpAccess || isLocalhost) {
      const loginPath = basePath ? `${basePath}/login` : '/login';
      window.location.replace(`${loginPath}?lastRoute=${encodedLastRoute}`);
      return;
    }

    const feishuPath = basePath ? `${basePath}/auth/feishu/login` : '/auth/feishu/login';
    const targetUrl = `${feishuPath}?lastRoute=${encodedLastRoute}`;

    // 移动端 Chrome 使用 window.location.replace 确保立即跳转且不会重复触发
    // 其他浏览器保持使用 router.replace（桌面端和 Safari 都正常）
    if (isMobileChrome()) {
      window.location.replace(targetUrl);
    } else {
      router.replace(targetUrl);
    }
  }, [authStatus, router, normalizedPath]);

  return hasTriggeredRedirect;
};

export default useUnauthorizedRedirect;
