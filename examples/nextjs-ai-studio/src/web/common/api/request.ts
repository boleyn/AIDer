import axios, {
  type Method,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosProgressEvent
} from 'axios';
import { clearToken } from '@/web/support/user/auth';
import { TOKEN_ERROR_CODE } from '@/global/common/error/errorCode';
import { TeamErrEnum } from '@/global/common/error/code/team';
import { useSystemStore } from '../system/useSystemStore';
import { getWebReqUrl, subRoute } from '@/web/common/system/utils';
export { getNanoid } from '@/ai/compat/global/common/string/tools';

import { getToken, setToken, isTokenExpiringSoon, isTokenExpired } from '@/web/support/user/token';
import { getTokenLogin } from '@/web/support/user/api';
import dayjs from 'dayjs';
import { safeEncodeURIComponent } from '@/web/common/utils/uri';

interface ConfigType {
  headers?: { [key: string]: string };
  timeout?: number;
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
  cancelToken?: AbortController;
  maxQuantity?: number; // The maximum number of simultaneous requests, usually used to cancel old requests
  withCredentials?: boolean;
  skipTokenCheck?: boolean;
}
interface ResponseDataType {
  code: number;
  message: string;
  data: any;
}

const maxQuantityMap: Record<
  string,
  | undefined
  | {
      id: string;
      sign: AbortController;
    }[]
> = {};

/*
  Every request generates a unique sign
  If the number of requests exceeds maxQuantity, cancel the earliest request and initiate a new request
*/
function checkMaxQuantity({ url, maxQuantity }: { url: string; maxQuantity?: number }) {
  if (!maxQuantity) return {};
  const item = maxQuantityMap[url];
  const id = getNanoid();
  const sign = new AbortController();

  if (item && item.length > 0) {
    if (item.length >= maxQuantity) {
      const firstSign = item.shift();
      firstSign?.sign.abort();
    }
    item.push({ id, sign });
  } else {
    maxQuantityMap[url] = [{ id, sign }];
  }
  return {
    id,
    abortSignal: sign?.signal
  };
}

function requestFinish({ signId, url }: { signId?: string; url: string }) {
  const item = maxQuantityMap[url];
  if (item) {
    if (signId) {
      const index = item.findIndex((item) => item.id === signId);
      if (index !== -1) {
        item.splice(index, 1);
      }
    }
    if (item.length <= 0) {
      delete maxQuantityMap[url];
    }
  }
}

// token 刷新锁，防止并发请求时重复刷新
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

/**
 * 刷新 token
 */
async function refreshTokenIfNeeded(): Promise<void> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const token = getToken();
  if (!token) {
    return;
  }

  // 如果 token 已过期，不能刷新（需要重新登录）
  if (isTokenExpired(token)) {
    return;
  }

  // 如果 token 快过期，尝试刷新
  if (!isTokenExpiringSoon(token)) {
    return;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      // 调用 tokenLogin 接口获取新 token
      const user = await getTokenLogin();
      if (user && (user as any).token) {
        setToken((user as any).token);
      }
    } catch (error) {
      // 刷新失败，清除 token，让用户重新登录
      clearToken();
      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * 请求开始
 */
async function startInterceptors(
  config: InternalAxiosRequestConfig & { skipTokenCheck?: boolean }
): Promise<InternalAxiosRequestConfig> {
  if (config.skipTokenCheck) {
    const token = getToken();
    if (token) {
      if (!config.headers) {
        config.headers = {} as any;
      }
      (config.headers as any)['token'] = token;
    }
    return config;
  }

  const token = getToken();

  // 如果 token 已过期，清除 token 并跳转登录
  if (token && isTokenExpired(token)) {
    clearToken();
    const isOutlinkPage =
      {
        '/chat/share': true,
        '/chat/expired': true,
        '/chat/team': true,
        '/chat/entry': true,
        '/chat/entrySecure': true,
        '/chat/shareSecure': true,
        '/login': true
      }[window.location.pathname] || window.location.pathname.startsWith('/s/');

    if (!isOutlinkPage && window.location.pathname !== '/login') {
      window.location.replace(
        getWebReqUrl(`/login?lastRoute=${encodeURIComponent(location.pathname + location.search)}`)
      );
    }
    // 返回一个会被拒绝的配置，阻止请求继续
    return Promise.reject(new Error('Token expired'));
  }

  // 检查并刷新 token（如果快过期）
  try {
    await refreshTokenIfNeeded();
  } catch {
    // 刷新失败，继续请求，让响应拦截器处理错误
  }

  const currentToken = getToken();
  if (currentToken) {
    // 为用户登录态使用自定义头，避免与 API Key(Authorization: Bearer <apikey>) 冲突
    if (!config.headers) {
      config.headers = {} as any;
    }
    (config.headers as any)['token'] = currentToken;
  }

  return config;
}

/**
 * 请求成功,检查请求头
 */
function responseSuccess(response: AxiosResponse<ResponseDataType>) {
  return response;
}
/**
 * 响应数据检查
 */
function checkRes(data: ResponseDataType) {
  if (data === undefined) {
    console.log('error->', data, 'data is empty');
    return Promise.reject('服务器异常');
  } else if (data.code < 200 || data.code >= 400) {
    return Promise.reject(data);
  }
  return data.data;
}

/**
 * 响应错误
 */
function responseError(err: any) {
  console.log('error->', '请求错误', err);
  const pathname = window.location.pathname;
  const isOutlinkPage = {
    [`${subRoute}/chat/share`]: true,
    [`${subRoute}/price`]: true,
    [`${subRoute}/login`]: true,
    [`${subRoute}/entrySecure`]: true,
    [`${subRoute}/shareSecure`]: true
  }[pathname];

  const data = err?.response?.data || err;
  const httpStatus = err?.response?.status;

  if (!err) {
    return Promise.reject({ message: '未知错误' });
  }
  if (typeof err === 'string') {
    return Promise.reject({ message: err });
  }
  if (typeof data === 'string') {
    return Promise.reject(data);
  }

  // Token error - 支持 shouldClearToken 字段或 TOKEN_ERROR_CODE
  if (data?.shouldClearToken || data?.code in TOKEN_ERROR_CODE) {
    if (!isOutlinkPage && pathname !== `${subRoute}/chat`) {
      clearToken();
      // 避免在已经是登录页面时重复跳转
      if (window.location.pathname !== '/login') {
        window.location.replace(
          getWebReqUrl(
            `/login?lastRoute=${encodeURIComponent(location.pathname + location.search)}`
          )
        );
      }
    }

    return Promise.reject({ message: '登录已过期，请重新登录' });
  }
  // Blance error
  if (
    data?.statusText &&
    [
      TeamErrEnum.aiPointsNotEnough,
      TeamErrEnum.datasetSizeNotEnough,
      TeamErrEnum.datasetAmountNotEnough,
      TeamErrEnum.appAmountNotEnough,
      TeamErrEnum.pluginAmountNotEnough,
      TeamErrEnum.websiteSyncNotEnough,
      TeamErrEnum.reRankNotEnough
    ].includes(data?.statusText) &&
    !isOutlinkPage
  ) {
    useSystemStore.getState().setNotSufficientModalType(data.statusText);
    return Promise.reject(data);
  }
  return Promise.reject(data);
}

/* 创建请求实例 */
const instance = axios.create({
  timeout: 60000 // 超时时间
  // 不设置默认 content-type，让 axios 根据请求数据自动判断
  // FormData 会自动设置为 multipart/form-data
  // 普通对象会自动设置为 application/json
});

/* 请求拦截 */
instance.interceptors.request.use(startInterceptors, (err) => Promise.reject(err));
/* 响应拦截 */
instance.interceptors.response.use(responseSuccess, (err) => Promise.reject(err));

function request(
  url: string,
  data: any,
  { cancelToken, maxQuantity, withCredentials, ...config }: ConfigType,
  method: Method
): any {
  /* 去空 */
  for (const key in data) {
    const val = data[key];
    if (data[key] === undefined) {
      delete data[key];
    } else if (val instanceof Date) {
      data[key] = dayjs(val).format();
    }
  }

  const { id: signId, abortSignal } = checkMaxQuantity({ url, maxQuantity });

  return instance
    .request({
      baseURL: getWebReqUrl('/api'),
      url,
      method,
      data: ['POST', 'PUT', 'DELETE'].includes(method) ? data : undefined,
      params: !['POST', 'PUT', 'DELETE'].includes(method) ? data : undefined,
      signal: cancelToken?.signal ?? abortSignal,
      withCredentials,
      ...config // 用户自定义配置，可以覆盖前面的配置
    })
    .then((res) => checkRes(res.data))
    .catch((err) => responseError(err))
    .finally(() => requestFinish({ signId, url }));
}

/**
 * api请求方式
 * @param {String} url
 * @param {Any} params
 * @param {Object} config
 * @returns
 */
export function GET<T = undefined>(url: string, params = {}, config: ConfigType = {}): Promise<T> {
  return request(url, params, config, 'GET');
}

export function POST<T = undefined>(url: string, data = {}, config: ConfigType = {}): Promise<T> {
  return request(url, data, config, 'POST');
}

export function PUT<T = undefined>(url: string, data = {}, config: ConfigType = {}): Promise<T> {
  return request(url, data, config, 'PUT');
}

export function DELETE<T = undefined>(url: string, data = {}, config: ConfigType = {}): Promise<T> {
  return request(url, data, config, 'DELETE');
}

export {
  maxQuantityMap,
  checkMaxQuantity,
  requestFinish,
  startInterceptors,
  responseSuccess,
  checkRes,
  responseError,
  instance,
  request
};
